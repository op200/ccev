import { ref } from 'vue'
import { defineStore } from 'pinia'
import { db } from '@/db'
import type { KlineData, KlineTimeframe, KlineFetchParams, KlineOHLCV } from '@/types/kline'
import { TIMEFRAME_MS, getNowMs } from '@/utils/format'
import { fetchCcxtOHLCV } from '@/utils/ccxt'
import { getKlineWsManager, supportsKlineWs } from '@/utils/ws'

// ═══════════════════════════════════════════════════════════════
// DB 操作（嵌套字典按月分桶）
// ═══════════════════════════════════════════════════════════════

/** 查询 DB 中指定时间范围内的 K 线，结果按时间戳升序 */
async function readKlinesFromDb(
  exchangeId: string,
  symbol: string,
  timeframe: KlineTimeframe,
  fromTs?: number,
  toTs?: number,
  limit?: number,
): Promise<KlineData[]> {
  try {
    const raw = await db.getKlineCandles(exchangeId, symbol, timeframe, fromTs, toTs, limit)
    // 二次过滤：清除异常时间戳（非毫秒级正数全部丢弃）
    const result = raw.filter((k) => Number.isFinite(k.timestamp) && k.timestamp > 1e12)
    if (result.length < raw.length) {
      console.warn(
        '[Kline] readKlinesFromDb 二次过滤丢弃',
        raw.length - result.length,
        '条异常数据（共',
        raw.length,
        '条）',
      )
    }
    console.log(
      '[Kline] readKlinesFromDb from=',
      fromTs,
      'to=',
      toTs,
      'limit=',
      limit,
      '→',
      result.length,
      '条',
      '首=',
      result[0]?.timestamp,
      '尾=',
      result[result.length - 1]?.timestamp,
    )
    return result
  } catch (err) {
    console.error('[Kline] readKlinesFromDb 失败', err)
    return []
  }
}

/** 写入 DB（嵌套字典，直接覆盖旧数据） */
async function writeKlinesToDb(
  exchangeId: string,
  symbol: string,
  timeframe: KlineTimeframe,
  data: KlineData[],
): Promise<void> {
  if (data.length === 0) return
  try {
    const candles: Record<number, KlineOHLCV> = {}
    for (const d of data) {
      candles[d.timestamp] = {
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
        volume: d.volume,
      }
    }
    await db.putKlineCandles(exchangeId, symbol, timeframe, candles)
  } catch (err) {
    console.error('[Kline] writeKlinesToDb 失败', err)
  }
}

// ═══════════════════════════════════════════════════════════════
// API 请求（通过 ccxt，符号使用 ccxt 格式如 BTC/USDT:USDT）
// ═══════════════════════════════════════════════════════════════

/**
 * 通过 ccxt 获取 K线。
 * - 普通加载：since 为起始时间，limit 控制条数
 * - loadMore：指定 endTime（最旧时间戳），内部推算 since 并过滤 endTime 之前的蜡烛
 */
async function fetchKlinesFromApi(params: KlineFetchParams): Promise<KlineData[]> {
  const { exchangeId, symbol, timeframe, since, endTime, limit = 200 } = params

  if (endTime !== undefined && since === undefined) {
    const tfMs = TIMEFRAME_MS[timeframe] || 3600000
    const calculatedSince = endTime - limit * tfMs
    const raw = await fetchCcxtOHLCV(exchangeId, symbol, timeframe, calculatedSince, limit)
    return raw.filter((k) => k.timestamp < endTime)
  }

  return fetchCcxtOHLCV(exchangeId, symbol, timeframe, since, limit)
}

// ═══════════════════════════════════════════════════════════════
// Store
// ═══════════════════════════════════════════════════════════════

export const useKlineStore = defineStore('kline', () => {
  const klines = ref<KlineData[]>([])
  const loading = ref(false)
  const currentParams = ref<KlineFetchParams | null>(null)
  const wsConnected = ref(false)
  const hasMore = ref(true)

  let _lastLoadTime = 0
  let _wsSymbol = ''
  let _wsTimeframe: KlineTimeframe = '1h'
  let _pollingTimer: ReturnType<typeof setInterval> | null = null
  /** 同步标志：防止 loadMore 并发调用（比 loading.value 更可靠） */
  let _loadingMore = false

  const _wsManager = getKlineWsManager(
    (kline) => {
      handleWsUpdate(kline)
    },
    (connected) => {
      wsConnected.value = connected
      if (!connected && currentParams.value) startHttpPolling()
    },
  )

  // ── WS / 轮询 ──

  function subscribeWs(exchangeId: string, symbol: string, timeframe: KlineTimeframe) {
    if (!supportsKlineWs(exchangeId)) {
      wsConnected.value = false
      startHttpPolling()
      return
    }
    if (_wsSymbol === symbol && _wsTimeframe === timeframe && wsConnected.value) return
    if (_wsSymbol) _wsManager.unsubscribe(exchangeId, [_wsSymbol])
    _wsSymbol = symbol
    _wsTimeframe = timeframe
    _wsManager.subscribe(exchangeId, [symbol], timeframe)
  }

  function startHttpPolling() {
    stopHttpPolling()
    if (!currentParams.value) return
    _pollingTimer = setInterval(() => {
      if (wsConnected.value) {
        stopHttpPolling()
        return
      }
      const p = currentParams.value
      if (!p) return
      fetchKlinesFromApi(p)
        .then((d) => {
          if (d.length === 0) return
          // 写 DB
          writeKlinesToDb(p.exchangeId, p.symbol, p.timeframe, d).catch(() => {})
          // 合并最新数据到 klines.value（更新已有 candle 或追加新 candle）
          mergeLatest(d)
        })
        .catch(() => {})
    }, 10000)
  }

  /** 将 API 返回的最新数据合并到 klines.value：更新同时间戳 candle，或追加更新的 */
  function mergeLatest(fetched: KlineData[]) {
    if (fetched.length === 0) return
    const existing = klines.value
    if (existing.length === 0) {
      klines.value = fetched
      return
    }
    // 构建副本 + 映射表，确保 Vue 响应式触发
    const map = new Map<number, KlineData>(existing.map((e) => [e.timestamp, { ...e }]))
    for (const f of fetched) {
      map.set(f.timestamp, f)
    }
    const merged = Array.from(map.values()).sort((a, b) => a.timestamp - b.timestamp)
    klines.value = merged
  }

  function stopHttpPolling() {
    if (_pollingTimer) {
      clearInterval(_pollingTimer)
      _pollingTimer = null
    }
  }

  // ── WS 更新处理器 ──

  async function handleWsUpdate(kline: KlineData) {
    if (!currentParams.value) return
    const p = currentParams.value
    await writeKlinesToDb(p.exchangeId, p.symbol, p.timeframe, [kline])

    const arr = [...klines.value]
    const last = arr[arr.length - 1]
    if (last && last.timestamp === kline.timestamp) {
      arr[arr.length - 1] = kline
    } else if (!last || kline.timestamp > last.timestamp) {
      arr.push(kline)
    }
    klines.value = arr
  }

  // ══════════════════════════════════════════════════════════
  // 公开方法
  // ══════════════════════════════════════════════════════════

  /**
   * 初始加载最新 K 线。
   * DB 缓存 → 不足则 API → 写 DB → klines.value
   */
  async function fetchKlines(params: KlineFetchParams) {
    if (
      currentParams.value &&
      currentParams.value.exchangeId === params.exchangeId &&
      currentParams.value.symbol === params.symbol &&
      currentParams.value.timeframe === params.timeframe &&
      klines.value.length > 0
    )
      return

    console.log(
      '[Kline] fetchKlines 开始 %s %s %s',
      params.exchangeId,
      params.symbol,
      params.timeframe,
    )
    loading.value = true
    currentParams.value = params
    const limit = params.limit || 200

    try {
      let data = await readKlinesFromDb(
        params.exchangeId,
        params.symbol,
        params.timeframe,
        params.since,
        params.endTime,
        limit,
      )
      console.log('[Kline] DB 缓存:', data.length, '条')

      if (data.length < limit) {
        const apiData = await fetchKlinesFromApi(params)
        console.log('[Kline] API:', apiData.length, '条 (limit=', limit, ')')
        if (apiData.length > 0) {
          await writeKlinesToDb(params.exchangeId, params.symbol, params.timeframe, apiData)
          data = await readKlinesFromDb(
            params.exchangeId,
            params.symbol,
            params.timeframe,
            params.since,
            params.endTime,
            limit,
          )
        }
        hasMore.value = apiData.length >= limit
      } else {
        hasMore.value = await db.hasKlineBefore(
          params.exchangeId,
          params.symbol,
          params.timeframe,
          data[0]!.timestamp,
        )
      }

      klines.value = data
      console.log('[Kline] fetchKlines 完成:', klines.value.length, '条 hasMore=', hasMore.value)

      subscribeWs(params.exchangeId, params.symbol, params.timeframe)
    } catch (err) {
      console.error('[Kline] fetchKlines 异常', err)
    } finally {
      loading.value = false
    }
  }

  /**
   * 加载更早历史数据。
   * 直接调 API（endTime=最旧时间戳）→ 去重 → 写 DB → 前插 klines.value
   */
  async function loadMore() {
    if (_loadingMore) return
    if (getNowMs() - _lastLoadTime < 2000) return
    if (!currentParams.value || !hasMore.value) return

    _loadingMore = true
    const params = currentParams.value
    const oldest = klines.value[0]
    if (!oldest) {
      _loadingMore = false
      return
    }

    loading.value = true
    _lastLoadTime = getNowMs()
    const limit = params.limit || 200

    const existingTss = new Set(klines.value.map((k) => k.timestamp))
    const oldestTs = oldest.timestamp

    console.log('[Kline] loadMore oldestTs=', oldestTs, 'existingCount=', existingTss.size)

    try {
      const apiData = await fetchKlinesFromApi({
        ...params,
        since: undefined,
        endTime: oldestTs,
        limit,
      })

      console.log('[Kline] loadMore API:', apiData.length, '条')

      const newData = apiData.filter((k) => !existingTss.has(k.timestamp))
      console.log('[Kline] loadMore 去重后:', newData.length, '条')

      if (newData.length > 0) {
        newData.sort((a, b) => a.timestamp - b.timestamp)

        writeKlinesToDb(params.exchangeId, params.symbol, params.timeframe, newData).catch(() => {})

        klines.value = [...newData, ...klines.value]

        const first = newData[0]!.timestamp
        const last = newData[newData.length - 1]!.timestamp
        const gap = oldestTs - last
        console.log(
          '[Kline] loadMore 完成: +',
          newData.length,
          '条 [',
          first,
          '..',
          last,
          '] gap=',
          gap,
          'ms total=',
          klines.value.length,
        )
      }

      hasMore.value = apiData.length >= limit
    } catch (err) {
      console.error('[Kline] loadMore 异常', err)
    } finally {
      loading.value = false
      _loadingMore = false
    }
  }

  /** 清空状态 */
  function clear() {
    stopHttpPolling()
    if (_wsSymbol && currentParams.value) {
      _wsManager.unsubscribe(currentParams.value.exchangeId, [_wsSymbol])
      _wsSymbol = ''
    }
    klines.value = []
    currentParams.value = null
    hasMore.value = true
    wsConnected.value = false
  }

  /**
   * 刷新最新 K线数据（轮询用，与 WS 并行）。
   * 从 ccxt 获取最新蜡烛 → 合并到 klines.value → 写 DB
   */
  async function refreshLatest() {
    const p = currentParams.value
    if (!p) return
    try {
      const d = await fetchKlinesFromApi({ ...p, since: undefined, endTime: undefined })
      if (d.length === 0) return
      writeKlinesToDb(p.exchangeId, p.symbol, p.timeframe, d).catch(() => {})
      mergeLatest(d)
    } catch {
      /* 轮询静默失败 */
    }
  }

  return {
    klines,
    loading,
    currentParams,
    wsConnected,
    hasMore,
    fetchKlines,
    loadMore,
    refreshLatest,
    handleWsUpdate,
    clear,
  }
})
