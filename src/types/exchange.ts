/** ccxt 交易所 ID */
export type ExchangeId = string

/** 交易所信息 */
export interface ExchangeInfo {
  id: ExchangeId
  name: string
  /** 是否支持 WebSocket */
  ws: boolean
  /** 是否支持获取 USDT 本位合约 */
  linear: boolean
}

/** 交易对信息 */
export interface SymbolInfo {
  symbol: string
  base: string
  quote: string
  type: 'swap' | 'future' | 'spot'
  linear: boolean
  /** 是否为 USDT 本位合约 */
  usdtMargined: boolean
}

/** 交易所连接状态 */
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'
