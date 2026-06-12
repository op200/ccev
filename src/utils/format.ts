import type { KlineData, KlineTimeframe, MonthKey } from '@/types/kline'

/**
 * K线数据格式化工具
 */

/** 时间周期对应的毫秒数 */
export const TIMEFRAME_MS: Record<KlineTimeframe, number> = {
  '1m': 60 * 1000,
  '5m': 5 * 60 * 1000,
  '15m': 15 * 60 * 1000,
  '30m': 30 * 60 * 1000,
  '1h': 60 * 60 * 1000,
  '4h': 4 * 60 * 60 * 1000,
  '1d': 24 * 60 * 60 * 1000,
  '1w': 7 * 24 * 60 * 60 * 1000,
  '1M': 30 * 24 * 60 * 60 * 1000,
}

/** 时间周期显示标签 */
export const TIMEFRAME_LABELS: Record<KlineTimeframe, string> = {
  '1m': '1m',
  '5m': '5m',
  '15m': '15m',
  '30m': '30m',
  '1h': '1H',
  '4h': '4H',
  '1d': '1D',
  '1w': '1W',
  '1M': '1M',
}

/** 将时间戳归一化到毫秒（部分交易所返回秒级时间戳） */
export function normalizeTimestamp(ts: number): number {
  return ts < 1e12 ? ts * 1000 : ts
}

/**
 * 获取当前毫秒时间戳。
 * 优先使用 performance API，Date.now() 作为兜底。
 */
export function getNowMs(): number {
  if (typeof performance !== 'undefined' && performance.timeOrigin > 1e12) {
    const perfNow = Math.round(performance.timeOrigin + performance.now())
    if (perfNow > 1e12) return perfNow
  }
  const dateNow = Date.now()
  if (dateNow > 1e12) return dateNow
  console.error('[format] 无法获取正确时间戳')
  return 1
}

/** 闰年判断 */
function isLeapYear(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0
}

/** 某年天数 */
function daysInYear(y: number): number {
  return isLeapYear(y) ? 366 : 365
}

/** 将毫秒时间戳转换为月分桶 Key（YYYY-MM），纯整数运算，不依赖 Date */
export function toMonthKey(ts: number): MonthKey {
  if (!Number.isFinite(ts) || ts <= 0) return '1970-01'

  const days = Math.floor(ts / 86400000)
  let year = 1970

  // 快速估算：每年约 365.2425 天
  year += Math.floor(days / 365.2425)

  // 计算到估算年份 1月1日 的天数
  let daysToYearStart = 0
  for (let y = 1970; y < year; y++) {
    daysToYearStart += daysInYear(y)
  }

  // 向前/向后微调到正确年份
  while (daysToYearStart > days) {
    year--
    daysToYearStart -= daysInYear(year)
  }
  while (daysToYearStart + daysInYear(year) <= days) {
    daysToYearStart += daysInYear(year)
    year++
  }

  // 计算月份
  const dayOfYear = days - daysToYearStart
  const monthDays = isLeapYear(year)
    ? [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    : [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

  let month = 0
  let acc = 0
  for (let m = 0; m < 12; m++) {
    const md = monthDays[m]!
    if (acc + md > dayOfYear) {
      month = m
      break
    }
    acc += md
  }

  return `${year}-${String(month + 1).padStart(2, '0')}`
}

/** 格式化价格 */
export function formatPrice(price: number, decimals?: number): string {
  if (decimals === undefined) {
    if (price >= 1000) return price.toFixed(2)
    if (price >= 1) return price.toFixed(4)
    if (price >= 0.01) return price.toFixed(6)
    return price.toFixed(8)
  }
  return price.toFixed(decimals)
}

/** 格式化成交量 */
export function formatVolume(volume: number): string {
  if (volume >= 1e9) return `${(volume / 1e9).toFixed(2)}B`
  if (volume >= 1e6) return `${(volume / 1e6).toFixed(2)}M`
  if (volume >= 1e3) return `${(volume / 1e3).toFixed(2)}K`
  return volume.toFixed(2)
}

/** 格式化百分比 */
export function formatPercent(percent: number): string {
  const sign = percent >= 0 ? '+' : ''
  return `${sign}${percent.toFixed(2)}%`
}

/** 格式化时间戳 */
export function formatTimestamp(ts: number): string {
  const date = new Date(ts)
  return date.toLocaleString()
}

/** 转换为 lightweight-charts 的 OHLC 格式 */
export function toChartData(klines: KlineData[]) {
  return klines.map((k) => ({
    time: (k.timestamp / 1000) as import('lightweight-charts').UTCTimestamp,
    open: k.open,
    high: k.high,
    low: k.low,
    close: k.close,
    volume: k.volume,
  }))
}

/** 格式化文件大小 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}
