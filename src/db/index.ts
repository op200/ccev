import Dexie, { type Table } from 'dexie'
import type { AppSettings } from '@/types/settings'
import type {
  KlineCacheEntry,
  KlineBucket,
  KlineOHLCV,
  KlineTimeframe,
  MonthKey,
} from '@/types/kline'
import type { Integrator } from '@/types/integrator'
import type { ChannelConfig } from '@/types/channel'
import { SETTINGS_VERSION, DEFAULT_SETTINGS } from '@/types/settings'
import { toMonthKey } from '@/utils/format'

/** CCEV 数据库 */
class CCEVDatabase extends Dexie {
  /** 设置表（仅一条记录） */
  settings!: Table<AppSettings, number>
  /** K线缓存表（v1 批量存储，已废弃） */
  klineCache!: Table<KlineCacheEntry, string>
  /** K线数据表（v2 已废弃，v3 保留声明避免 UpgradeError） */
  klineData!: Table<KlineCacheEntry, [string, string, string, number]>
  /** K线数据桶表（v3，嵌套字典按月分桶） */
  klineBuckets!: Table<KlineBucket, [string, string, string, MonthKey]>
  /** 整合器表 */
  integrators!: Table<Integrator, string>
  /** 渠道配置表 */
  channels!: Table<ChannelConfig, string>

  constructor() {
    super('CCEVDatabase')

    this.version(1).stores({
      settings: 'id',
      klineCache: '[exchangeId+symbol+timeframe]',
      integrators: 'id',
      channels: 'id',
    })

    this.version(2).stores({
      settings: 'id',
      klineCache: '[exchangeId+symbol+timeframe]',
      klineData: '[exchangeId+symbol+timeframe+timestamp]',
      integrators: 'id',
      channels: 'id',
    })

    // v3: 新增 klineBuckets 表，嵌套字典按月分桶（旧表由 stores null 自动删除）
    this.version(3).stores({
      settings: 'id',
      klineCache: null,
      klineData: null,
      klineBuckets: '[exchangeId+symbol+timeframe+monthKey]',
      integrators: 'id',
      channels: 'id',
    })

    // v4→v5: 清空所有 K线表后重建，清除开发阶段可能存在的脏数据
    this.version(4).stores({
      settings: 'id',
      klineCache: null,
      klineData: null,
      klineBuckets: null,
      integrators: 'id',
      channels: 'id',
    })
    this.version(5).stores({
      settings: 'id',
      klineBuckets: '[exchangeId+symbol+timeframe+monthKey]',
      integrators: 'id',
      channels: 'id',
    })

    // v6: 再次清空 klineBuckets 确保干净状态
    this.version(6).stores({
      settings: 'id',
      klineBuckets: null,
      integrators: 'id',
      channels: 'id',
    })
    this.version(7).stores({
      settings: 'id',
      klineBuckets: '[exchangeId+symbol+timeframe+monthKey]',
      integrators: 'id',
      channels: 'id',
    })
  }

  /** 初始化设置（如果不存在则使用默认值） */
  async initSettings(): Promise<AppSettings> {
    const existing = await this.settings.get(1)
    if (!existing) {
      await this.settings.put(
        { ...DEFAULT_SETTINGS, version: SETTINGS_VERSION } as AppSettings & { id: number },
        1,
      )
      return DEFAULT_SETTINGS
    }
    // 版本迁移
    if (existing.version < SETTINGS_VERSION) {
      const migrated = this.migrateSettings(existing)
      await this.settings.put(migrated as AppSettings & { id: number }, 1)
      return migrated
    }
    return existing
  }

  /** 设置迁移 */
  private migrateSettings(old: AppSettings): AppSettings {
    // 基于版本号逐步迁移，保留兼容部分，丢弃不兼容部分
    let settings = { ...old }

    if (old.version < 1) {
      // v1 初始版本: 确保新字段存在
      settings = {
        ...DEFAULT_SETTINGS,
        ...settings,
        version: SETTINGS_VERSION,
        channels: settings.channels || [],
      }
    }

    // 后续版本迁移在此添加...

    return { ...settings, version: SETTINGS_VERSION }
  }

  /** 获取数据库存储占用信息 */
  async getStorageUsage(): Promise<{ used: number; quota: number }> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate()
      return {
        used: estimate.usage || 0,
        quota: estimate.quota || 0,
      }
    }
    return { used: 0, quota: 0 }
  }

  /** 清理过期的 K线桶（按桶的 updatedAt 过滤，整桶删除） */
  async cleanExpiredKlineCache(ttl: number): Promise<number> {
    const now = Date.now()
    const expired = await this.klineBuckets
      .filter((bucket) => now - bucket.updatedAt > ttl)
      .toArray()
    if (expired.length > 0) {
      await this.klineBuckets.bulkDelete(
        expired.map((b) => [b.exchangeId, b.symbol, b.timeframe, b.monthKey]),
      )
    }
    return expired.length
  }

  /** 清空所有 K线数据 */
  async clearKlineData(): Promise<void> {
    await this.klineBuckets.clear()
  }

  // ═══════════════════════════════════════════════════════════
  // K线桶操作（嵌套字典读写）
  // ═══════════════════════════════════════════════════════════

  /**
   * 写入 K线蜡烛数据到桶（直接覆盖，不比较新旧）。
   * 按时间戳自动分到对应月桶，使用事务保证原子性。
   */
  async putKlineCandles(
    exchangeId: string,
    symbol: string,
    timeframe: KlineTimeframe,
    candles: Record<number, KlineOHLCV>,
  ): Promise<void> {
    const timestamps = Object.keys(candles).map(Number)
    if (timestamps.length === 0) return
    const now = Date.now()

    // 按 monthKey 分组
    const groups = new Map<MonthKey, Record<number, KlineOHLCV>>()
    for (const ts of timestamps) {
      const mk = toMonthKey(ts)
      if (!groups.has(mk)) groups.set(mk, {})
      groups.get(mk)![ts] = candles[ts]!
    }

    await this.transaction('rw', this.klineBuckets, async () => {
      for (const [monthKey, group] of groups) {
        const existing = await this.klineBuckets.get({ exchangeId, symbol, timeframe, monthKey })
        if (existing) {
          // 直接覆盖：新数据覆盖旧数据
          Object.assign(existing.candles, group)
          existing.updatedAt = now
          await this.klineBuckets.put(existing)
        } else {
          await this.klineBuckets.put({
            exchangeId,
            symbol,
            timeframe,
            monthKey,
            candles: group,
            updatedAt: now,
          })
        }
      }
    })
  }

  /**
   * 读取 K线蜡烛数据。
   * 查询指定时间范围内的蜡烛，按时间戳升序返回 KlineData[]。
   */
  async getKlineCandles(
    exchangeId: string,
    symbol: string,
    timeframe: KlineTimeframe,
    fromTs?: number,
    toTs?: number,
    limit?: number,
  ): Promise<
    { timestamp: number; open: number; high: number; low: number; close: number; volume: number }[]
  > {
    const from = fromTs ?? 0
    const to = toTs ?? Number.MAX_SAFE_INTEGER

    // 确定涉及的月桶范围，toMonthKey 对超大值已做安全保护返回 '9999-12'
    const fromMonth = toMonthKey(from)
    const toMonth = toMonthKey(to)

    // 查询所有相关月桶
    const buckets = await this.klineBuckets
      .where('[exchangeId+symbol+timeframe+monthKey]')
      .between(
        [exchangeId, symbol, timeframe, fromMonth],
        [exchangeId, symbol, timeframe, toMonth],
        true,
        true,
      )
      .toArray()

    console.log(
      '[DB] getKlineCandles',
      exchangeId,
      '/',
      symbol,
      '/',
      timeframe,
      'monthRange=[',
      fromMonth,
      '..',
      toMonth,
      '] 命中',
      buckets.length,
      '桶',
    )

    // 从各桶中提取指定时间范围的蜡烛，过滤明显异常的时间戳
    let filteredCount = 0
    const result: {
      timestamp: number
      open: number
      high: number
      low: number
      close: number
      volume: number
    }[] = []
    for (const bucket of buckets) {
      for (const [tsStr, candle] of Object.entries(bucket.candles)) {
        const ts = Number(tsStr)
        // 跳过异常时间戳：非有限数、非正数、秒级脏数据（>0 且 <1e12 视为非毫秒）
        if (!Number.isFinite(ts) || ts <= 0 || (ts > 0 && ts < 1e12)) {
          filteredCount++
          continue
        }
        if (ts >= from && ts < to) {
          result.push({ timestamp: ts, ...candle })
        }
      }
    }

    if (filteredCount > 0) {
      console.log('[DB] getKlineCandles 过滤掉', filteredCount, '条异常时间戳')
    }

    // 按时间戳升序
    result.sort((a, b) => a.timestamp - b.timestamp)

    // 取最近 N 条
    if (limit && limit > 0 && result.length > limit) {
      return result.slice(-limit)
    }
    return result
  }

  /**
   * 检查指定月桶中是否存在比某时间戳更早的数据（用于判断 hasMore）
   */
  async hasKlineBefore(
    exchangeId: string,
    symbol: string,
    timeframe: KlineTimeframe,
    beforeTs: number,
  ): Promise<boolean> {
    const monthKey = toMonthKey(beforeTs)
    const bucket = await this.klineBuckets.get({ exchangeId, symbol, timeframe, monthKey })
    if (!bucket) {
      // 该月桶不存在，检查是否有更早的月桶
      const earlierBuckets = await this.klineBuckets
        .where('[exchangeId+symbol+timeframe+monthKey]')
        .below([exchangeId, symbol, timeframe, monthKey])
        .count()
      return earlierBuckets > 0
    }
    // 检查桶中是否有比 beforeTs 更早的时间戳
    for (const tsStr of Object.keys(bucket.candles)) {
      if (Number(tsStr) < beforeTs) return true
    }
    return false
  }

  /** 导出设置和整合器数据（不含K线缓存） */
  async exportData(): Promise<string> {
    const settings = await this.settings.get(1)
    const integrators = await this.integrators.toArray()
    const channels = await this.channels.toArray()
    const data = {
      version: SETTINGS_VERSION,
      exportedAt: Date.now(),
      settings,
      integrators,
      channels,
    }
    return JSON.stringify(data, null, 2)
  }

  /** 导入设置和整合器数据 */
  async importData(json: string): Promise<void> {
    const data = JSON.parse(json)
    if (data.settings) {
      await this.settings.put(
        { ...data.settings, version: SETTINGS_VERSION } as AppSettings & { id: number },
        1,
      )
    }
    if (data.integrators) {
      await this.integrators.clear()
      await this.integrators.bulkPut(data.integrators)
    }
    if (data.channels) {
      await this.channels.clear()
      await this.channels.bulkPut(data.channels)
    }
  }
}

/** 全局数据库实例 */
export const db = new CCEVDatabase()
