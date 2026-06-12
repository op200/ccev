import type { ExchangeId, ExchangeInfo, SymbolInfo } from '@/types/exchange'
import type { KlineData, KlineTimeframe } from '@/types/kline'
import { normalizeTimestamp } from '@/utils/format'
import ccxt, { type Exchange, type Market, type Ticker } from 'ccxt'

/** 请求超时（毫秒） */
const FETCH_TIMEOUT = 8000

/** ccxt Exchange 实例缓存（按交易所 ID 复用） */
const _exchangeCache = new Map<ExchangeId, Exchange>()

function getExchange(exchangeId: ExchangeId): Exchange {
  if (_exchangeCache.has(exchangeId)) return _exchangeCache.get(exchangeId)!
  const Ctor = (ccxt as Record<string, unknown>)[exchangeId] as
    | (new (opts?: Record<string, unknown>) => Exchange)
    | undefined
  if (typeof Ctor !== 'function') {
    throw new Error(`ccxt 不支持交易所: ${exchangeId}`)
  }
  const ex = new Ctor({
    enableRateLimit: true,
    timeout: FETCH_TIMEOUT,
    // 强制使用 USDT 永续合约市场
    options: {
      defaultType: 'swap',
    },
  })
  _exchangeCache.set(exchangeId, ex)
  return ex
}

/**
 * 交易所工具 —— 通过 ccxt 获取所有交易所数据
 * 所有符号使用 ccxt 格式（如 BTC/USDT:USDT），ccxt 内部处理交易所差异
 */

/** 支持的交易所列表（ccxt 全部交易所 ID 子集，仅含支持 USDT 本位合约的主要交易所） */
const SUPPORTED_EXCHANGE_IDS: ExchangeId[] = [
  'okx',
  'binance',
  'bybit',
  'bitget',
  'gate',
  'kucoin',
  'mexc',
  'bingx',
  'bitmart',
  'htx',
  'coinbase',
  'kraken',
  'deribit',
]

/** 交易所元数据 */
const EXCHANGE_META: Record<string, { name: string; ws: boolean; linear: boolean }> = {
  okx: { name: 'OKX', ws: true, linear: true },
  binance: { name: 'Binance', ws: true, linear: true },
  bybit: { name: 'Bybit', ws: true, linear: true },
  bitget: { name: 'Bitget', ws: true, linear: true },
  gate: { name: 'Gate.io', ws: true, linear: true },
  kucoin: { name: 'KuCoin', ws: true, linear: true },
  mexc: { name: 'MEXC', ws: true, linear: true },
  bingx: { name: 'BingX', ws: true, linear: true },
  bitmart: { name: 'BitMart', ws: true, linear: true },
  htx: { name: 'HTX', ws: true, linear: true },
  coinbase: { name: 'Coinbase', ws: false, linear: false },
  kraken: { name: 'Kraken', ws: false, linear: false },
  deribit: { name: 'Deribit', ws: true, linear: true },
}

/** 获取所有支持的交易所 ID */
export function getExchangeIds(): ExchangeId[] {
  return SUPPORTED_EXCHANGE_IDS
}

/** 获取交易所信息（同步，基于静态数据） */
export function getExchangeInfo(exchangeId: ExchangeId): ExchangeInfo {
  const meta = EXCHANGE_META[exchangeId]
  if (!meta) {
    throw new Error(`Exchange ${exchangeId} not supported`)
  }
  return {
    id: exchangeId,
    name: meta.name,
    ws: meta.ws,
    linear: meta.linear,
  }
}

/** 缓存交易所信息 */
const exchangeInfoCache = new Map<ExchangeId, ExchangeInfo>()

export function getExchangeInfoCached(exchangeId: ExchangeId): ExchangeInfo {
  if (exchangeInfoCache.has(exchangeId)) {
    return exchangeInfoCache.get(exchangeId)!
  }
  const info = getExchangeInfo(exchangeId)
  exchangeInfoCache.set(exchangeId, info)
  return info
}

/** 获取 USDT 本位合约交易对 */
export async function getLinearSymbols(exchangeId: ExchangeId): Promise<SymbolInfo[]> {
  return fetchCcxtSymbols(exchangeId)
}

/** 默认常见交易对（回退方案） */
function getDefaultLinearSymbols(_exchangeId: ExchangeId): SymbolInfo[] {
  const commonPairs = [
    'BTC/USDT:USDT',
    'ETH/USDT:USDT',
    'SOL/USDT:USDT',
    'XRP/USDT:USDT',
    'DOGE/USDT:USDT',
    'BNB/USDT:USDT',
    'ADA/USDT:USDT',
    'AVAX/USDT:USDT',
    'DOT/USDT:USDT',
    'LINK/USDT:USDT',
    'MATIC/USDT:USDT',
    'UNI/USDT:USDT',
    'ATOM/USDT:USDT',
    'FIL/USDT:USDT',
    'APT/USDT:USDT',
    'ARB/USDT:USDT',
    'OP/USDT:USDT',
    'SUI/USDT:USDT',
    'LTC/USDT:USDT',
    'ETC/USDT:USDT',
    'NEAR/USDT:USDT',
    'TIA/USDT:USDT',
    'SEI/USDT:USDT',
    'WIF/USDT:USDT',
    'PEPE/USDT:USDT',
  ]
  return commonPairs.map((sym) => ({
    symbol: sym,
    base: sym.split('/')[0] || '',
    quote: 'USDT',
    type: 'swap' as const,
    linear: true,
    usdtMargined: true,
  }))
}

/** Ticker 数据 */
export interface TickerData {
  symbol: string
  last: number
  change24h: number
  volume24h: number
  high24h: number
  low24h: number
}

/** 获取 Ticker 数据（通过 ccxt） */
export async function fetchTickers(exchangeId: ExchangeId): Promise<TickerData[]> {
  return fetchCcxtTickers(exchangeId)
}

/** 检查交易所是否支持 WebSocket */
export function exchangeSupportsWs(exchangeId: ExchangeId): boolean {
  return EXCHANGE_META[exchangeId]?.ws ?? false
}

// ═══════════════════════════════════════════════════════════════
// ccxt 数据获取（OHLCV K线 / 交易对 / Ticker）
// ═══════════════════════════════════════════════════════════════

/**
 * 使用 ccxt 获取 OHLCV K线
 * @param exchangeId - ccxt 交易所 ID（如 'okx'）
 * @param symbol - ccxt 格式交易对（如 'BTC/USDT:USDT'）
 * @param timeframe - K线周期
 * @param since - 起始时间戳（毫秒），undefined 表示最新
 * @param limit - 返回条数上限
 */
export async function fetchCcxtOHLCV(
  exchangeId: ExchangeId,
  symbol: string,
  timeframe: KlineTimeframe,
  since?: number,
  limit = 200,
): Promise<KlineData[]> {
  try {
    const ex = getExchange(exchangeId)
    const raw = await ex.fetchOHLCV(symbol, timeframe, since, limit)
    if (!raw || raw.length === 0) {
      console.error('[ccxt] fetchOHLCV 空:', exchangeId, symbol, timeframe)
      return []
    }
    return raw.map((c) => ({
      timestamp: normalizeTimestamp(c[0]!),
      open: c[1]!,
      high: c[2]!,
      low: c[3]!,
      close: c[4]!,
      volume: c[5]!,
    }))
  } catch (err) {
    console.error('[ccxt] fetchOHLCV 异常:', exchangeId, symbol, timeframe, err)
    return []
  }
}

/**
 * 使用 ccxt 获取 USDT 永续合约交易对
 */
export async function fetchCcxtSymbols(exchangeId: ExchangeId): Promise<SymbolInfo[]> {
  try {
    const ex = getExchange(exchangeId)
    await ex.loadMarkets()
    const markets = ex.markets as Record<string, Market>
    const result: SymbolInfo[] = []
    for (const [sym, m] of Object.entries(markets)) {
      if (!m) continue
      if (m.swap && m.settle === 'USDT' && m.linear) {
        result.push({
          symbol: sym,
          base: m.base || '',
          quote: m.quote || 'USDT',
          type: 'swap',
          linear: true,
          usdtMargined: true,
        })
      }
    }
    return result
  } catch (err) {
    console.error('[ccxt] fetchSymbols 异常:', exchangeId, err)
    return getDefaultLinearSymbols(exchangeId)
  }
}

/** Ticker 数据 */
export interface TickerData {
  symbol: string
  last: number
  change24h: number
  volume24h: number
  high24h: number
  low24h: number
}

/**
 * 使用 ccxt 获取行情 Ticker（全部 USDT 永续合约交易对）
 * 先 loadMarkets 获取全量交易对列表，再分批 fetchTickers 获取行情
 */
export async function fetchCcxtTickers(exchangeId: ExchangeId): Promise<TickerData[]> {
  try {
    const ex = getExchange(exchangeId)

    // 确保 markets 已加载
    if (!ex.markets || Object.keys(ex.markets).length === 0) {
      await ex.loadMarkets()
    }

    const markets = ex.markets as Record<string, Market>
    // 筛选 USDT 永续合约交易对
    const swapSymbols = Object.keys(markets).filter(
      (sym) => markets[sym]!.swap && markets[sym]!.settle === 'USDT' && markets[sym]!.linear,
    )
    console.log(`[ccxt] fetchTickers: ${exchangeId} USDT swap 交易对 ${swapSymbols.length} 个`)

    if (swapSymbols.length === 0) return []

    // 部分交易所一次 fetchTickers 返回所有行情，部分需分批
    // 先尝试一次性获取
    const allTickers = (await ex.fetchTickers(swapSymbols)) as Record<string, Ticker>

    const result: TickerData[] = []
    for (const sym of swapSymbols) {
      const t = allTickers[sym]
      if (!t || t.last === undefined) continue
      const change = t.percentage ?? (t.open ? ((t.last! - t.open) / t.open) * 100 : 0)
      result.push({
        symbol: sym,
        last: t.last!,
        change24h: change,
        volume24h: t.baseVolume || t.quoteVolume || 0,
        high24h: t.high || 0,
        low24h: t.low || 0,
      })
    }
    console.log(`[ccxt] fetchTickers 完成: ${result.length} 条`)
    return result
  } catch (err) {
    console.error('[ccxt] fetchTickers 异常:', exchangeId, err)
    return []
  }
}
