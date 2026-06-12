import type { ExchangeId } from './exchange'
import type { ChannelConfig } from './channel'

/** 应用设置 */
export interface AppSettings {
  version: number
  /** 用户选择的交易所列表 */
  enabledExchanges: ExchangeId[]
  /** 默认交易所 */
  defaultExchange: ExchangeId
  /** 默认交易对 */
  defaultSymbol: string
  /** 默认K线周期 */
  defaultTimeframe: string
  /** 语言 */
  locale: string
  /** 主题 */
  theme: 'auto' | 'light' | 'dark'
  /** 通知渠道 */
  channels: ChannelConfig[]
  /** 缓存设置 */
  cache: CacheSettings
  /** 数据获取设置 */
  fetcher: FetcherSettings
}

/** 缓存设置 */
export interface CacheSettings {
  /** K线数据最大缓存条数（每个交易对/周期） */
  maxKlineCount: number
  /** 数据自动过期时间（毫秒） */
  ttl: number
  /** 数据库最大体积（字节），超过则自动清理 */
  maxDbSize: number
}

/** 数据获取设置 */
export interface FetcherSettings {
  /** 每页获取条数 */
  pageSize: number
  /** 自动分页间隔（毫秒） */
  autoPageInterval: number
  /** 是否启用 WebSocket */
  enableWs: boolean
  /** 请求超时（毫秒） */
  timeout: number
}

/** 默认设置 */
export const DEFAULT_SETTINGS: AppSettings = {
  version: 1,
  enabledExchanges: ['okx'],
  defaultExchange: 'okx',
  defaultSymbol: 'BTC/USDT:USDT',
  defaultTimeframe: '1h',
  locale: '',
  theme: 'auto',
  channels: [],
  cache: {
    maxKlineCount: 1000,
    ttl: 7 * 24 * 60 * 60 * 1000, // 7 天
    maxDbSize: 500 * 1024 * 1024, // 500MB
  },
  fetcher: {
    pageSize: 200,
    autoPageInterval: 2000,
    enableWs: true,
    timeout: 10000,
  },
}

/** 当前设置版本，用于迁移 */
export const SETTINGS_VERSION = 1
