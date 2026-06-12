/** K线时间周期 */
export type KlineTimeframe = '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d' | '1w' | '1M'

/** OHLCV K线数据（含时间戳，内存/API 使用） */
export interface KlineData {
  timestamp: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

/** OHLCV 数据（不含时间戳，作为嵌套字典的 value） */
export interface KlineOHLCV {
  open: number
  high: number
  low: number
  close: number
  volume: number
}

/** 月分桶 Key：YYYY-MM */
export type MonthKey = string

/** K线数据桶（按月分桶的嵌套字典，v3 数据库结构） */
export interface KlineBucket {
  exchangeId: string
  symbol: string
  timeframe: KlineTimeframe
  /** 月分桶 key，如 "2026-06" */
  monthKey: MonthKey
  /** 时间戳(ms) → OHLCV 字典，直接覆盖写入，不比较新旧 */
  candles: Record<number, KlineOHLCV>
  /** 桶最后更新时间（毫秒），用于 TTL 过期清理 */
  updatedAt: number
}

/** K线数据缓存条目（v1/v2 旧格式，保留兼容，已废弃） */
export interface KlineCacheEntry {
  exchangeId: string
  symbol: string
  timeframe: KlineTimeframe
  timestamp: number
  open: number
  high: number
  low: number
  close: number
  volume: number
  updatedAt: number
}

/** 分页查询参数 */
export interface KlineFetchParams {
  exchangeId: string
  symbol: string
  timeframe: KlineTimeframe
  /** 起始时间戳（获取此时间之后的数据） */
  since?: number
  /** 结束时间戳（获取此时间之前的数据，用于惰性加载历史） */
  endTime?: number
  limit?: number
}

/** WebSocket K线更新 */
export interface KlineUpdate {
  exchangeId: string
  symbol: string
  timeframe: KlineTimeframe
  kline: KlineData
}
