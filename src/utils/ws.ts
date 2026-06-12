import type { KlineData, KlineTimeframe } from '@/types/kline'
import type { ExchangeId } from '@/types/exchange'

/** WebSocket K线更新回调 */
export type KlineWsCallback = (kline: KlineData, symbol: string) => void
export type WsStatusCallback = (connected: boolean) => void

/** 交易所 WS 配置 */
interface WsConfig {
  url: string
  /** ccxt symbol → exchange symbol */
  toExchangeSymbol: (s: string) => string
  /** KlineTimeframe → exchange interval */
  toExchangeInterval: (tf: KlineTimeframe) => string
  /** 构建订阅消息 */
  buildSubscribe: (symbol: string, interval: string) => unknown
  /** 构建取消订阅消息 */
  buildUnsubscribe: (symbol: string, interval: string) => unknown
  /** 解析消息 */
  parseMessage: (msg: unknown) => KlineData | null
  /** 是否需要 ping */
  pingInterval?: number
  buildPing?: () => unknown
}

/** 各交易所 WS 配置 */
const WS_CONFIGS: Partial<Record<ExchangeId, WsConfig>> = {
  okx: {
    url: 'wss://ws.okx.com:8443/ws/v5/public',
    toExchangeSymbol: (s) => s.replace('/', '-').replace(':USDT', '-SWAP'),
    toExchangeInterval: (tf) => {
      const m: Record<string, string> = {
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
      return m[tf] || '1H'
    },
    buildSubscribe: (symbol, interval) => ({
      op: 'subscribe',
      args: [{ channel: `candle${interval}`, instId: symbol }],
    }),
    buildUnsubscribe: (symbol, interval) => ({
      op: 'unsubscribe',
      args: [{ channel: `candle${interval}`, instId: symbol }],
    }),
    parseMessage: (msg: unknown) => {
      const data = msg as Record<string, unknown> | undefined
      if (!data?.data || !Array.isArray(data.data)) return null
      const c = data.data[0]
      if (!Array.isArray(c) || c.length < 6) return null
      return {
        timestamp: parseInt(c[0] as string),
        open: parseFloat(c[1] as string),
        high: parseFloat(c[2] as string),
        low: parseFloat(c[3] as string),
        close: parseFloat(c[4] as string),
        volume: parseFloat(c[5] as string),
      }
    },
    pingInterval: 20000,
    buildPing: () => 'ping',
  },
  binance: {
    url: 'wss://fstream.binance.com/ws',
    toExchangeSymbol: (s) => s.replace('/', '').replace(':USDT', '').toLowerCase(),
    toExchangeInterval: (tf) => tf,
    buildSubscribe: (symbol, interval) => ({
      method: 'SUBSCRIBE',
      params: [`${symbol}@kline_${interval}`],
      id: Date.now(),
    }),
    buildUnsubscribe: (symbol, interval) => ({
      method: 'UNSUBSCRIBE',
      params: [`${symbol}@kline_${interval}`],
      id: Date.now(),
    }),
    parseMessage: (msg: unknown) => {
      const data = msg as Record<string, unknown> | undefined
      if (data?.e !== 'kline' || !data?.k) return null
      const k = data!.k as Record<string, unknown>
      return {
        timestamp: k.t as number,
        open: parseFloat(String(k.o)),
        high: parseFloat(String(k.h)),
        low: parseFloat(String(k.l)),
        close: parseFloat(String(k.c)),
        volume: parseFloat(String(k.v)),
      }
    },
    pingInterval: 180000,
    buildPing: () => ({ method: 'PING', id: Date.now() }),
  },
  bybit: {
    url: 'wss://stream.bybit.com/v5/public/linear',
    toExchangeSymbol: (s) => s.replace('/', '').replace(':USDT', ''),
    toExchangeInterval: (tf) => {
      const m: Record<string, string> = {
        '1m': '1',
        '5m': '5',
        '15m': '15',
        '30m': '30',
        '1h': '60',
        '4h': '240',
        '1d': 'D',
        '1w': 'W',
        '1M': 'M',
      }
      return m[tf] || '60'
    },
    buildSubscribe: (symbol, interval) => ({
      op: 'subscribe',
      args: [`kline.${interval}.${symbol}`],
    }),
    buildUnsubscribe: (symbol, interval) => ({
      op: 'unsubscribe',
      args: [`kline.${interval}.${symbol}`],
    }),
    parseMessage: (msg: unknown) => {
      const data = msg as Record<string, unknown> | undefined
      if (
        data?.topic &&
        typeof data.topic === 'string' &&
        data.topic.startsWith('kline.') &&
        Array.isArray(data.data)
      ) {
        const c = data.data[0] as Record<string, unknown> | undefined
        if (!c) return null
        return {
          timestamp: parseInt(String(c.start || c.t)),
          open: parseFloat(String(c.open || c.o)),
          high: parseFloat(String(c.high || c.h)),
          low: parseFloat(String(c.low || c.l)),
          close: parseFloat(String(c.close || c.c)),
          volume: parseFloat(String(c.volume || c.v)),
        }
      }
      return null
    },
    pingInterval: 20000,
    buildPing: () => ({ op: 'ping' }),
  },
}

/** 判断交易所是否支持 WS */
export function supportsKlineWs(exchangeId: ExchangeId): boolean {
  return exchangeId in WS_CONFIGS
}

/** 单交易所 WebSocket K线连接管理器 */
export class KlineWebSocket {
  private ws: WebSocket | null = null
  private config: WsConfig
  private exchangeId: ExchangeId
  private symbols = new Set<string>()
  private timeframe: KlineTimeframe = '1h'
  private onKline: KlineWsCallback
  private onStatus: WsStatusCallback
  private pingTimer: ReturnType<typeof setInterval> | null = null
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private reconnectDelay = 1000
  private destroyed = false

  constructor(exchangeId: ExchangeId, onKline: KlineWsCallback, onStatus: WsStatusCallback) {
    const cfg = WS_CONFIGS[exchangeId]
    if (!cfg) throw new Error(`WebSocket not supported for ${exchangeId}`)
    this.config = cfg
    this.exchangeId = exchangeId
    this.onKline = onKline
    this.onStatus = onStatus
  }

  /** 订阅交易对 */
  subscribe(symbols: string[], timeframe: KlineTimeframe) {
    this.timeframe = timeframe
    for (const s of symbols) this.symbols.add(s)
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.sendSubscriptions()
    } else {
      this.connect()
    }
  }

  /** 取消订阅 */
  unsubscribe(symbols: string[]) {
    for (const s of symbols) this.symbols.delete(s)
    if (this.ws?.readyState === WebSocket.OPEN) {
      const interval = this.config.toExchangeInterval(this.timeframe)
      for (const s of symbols) {
        const exSymbol = this.config.toExchangeSymbol(s)
        const msg = this.config.buildUnsubscribe(exSymbol, interval)
        try {
          this.ws.send(JSON.stringify(msg))
        } catch {
          /* ignore */
        }
      }
    }
    if (this.symbols.size === 0) this.disconnect()
  }

  /** 断开并清理 */
  disconnect() {
    this.destroyed = true
    this.cleanup()
  }

  private connect() {
    if (this.destroyed) return
    this.cleanup()

    console.log(`[WS] 连接 ${this.exchangeId} ...`)
    try {
      this.ws = new WebSocket(this.config.url)
    } catch {
      console.warn(`[WS] ${this.exchangeId} WebSocket 构造失败，回退 HTTP`)
      this.onStatus(false)
      return
    }

    this.ws.onopen = () => {
      console.log(`[WS] ${this.exchangeId} 已连接`)
      this.reconnectDelay = 1000
      this.onStatus(true)
      this.sendSubscriptions()
      this.startPing()
    }

    this.ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data)
        // 处理 ping/pong
        if (msg === 'pong' || msg?.op === 'pong' || msg?.result === 'pong') return
        const kline = this.config.parseMessage(msg)
        if (kline) {
          this.onKline(kline, '') // symbol from context
        }
      } catch {
        /* ignore parse errors */
      }
    }

    this.ws.onclose = () => {
      console.log(`[WS] ${this.exchangeId} 断开`)
      this.onStatus(false)
      this.stopPing()
      if (!this.destroyed) this.scheduleReconnect()
    }

    this.ws.onerror = () => {
      console.warn(`[WS] ${this.exchangeId} 错误`)
      this.ws?.close()
    }
  }

  private sendSubscriptions() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return
    const interval = this.config.toExchangeInterval(this.timeframe)
    for (const s of this.symbols) {
      const exSymbol = this.config.toExchangeSymbol(s)
      const msg = this.config.buildSubscribe(exSymbol, interval)
      this.ws.send(JSON.stringify(msg))
      console.log(`[WS] 订阅 ${this.exchangeId} ${s} (${exSymbol}) ${this.timeframe}`)
    }
  }

  private startPing() {
    this.stopPing()
    if (this.config.pingInterval && this.config.buildPing) {
      this.pingTimer = setInterval(() => {
        if (this.ws?.readyState === WebSocket.OPEN && this.config.buildPing) {
          this.ws.send(JSON.stringify(this.config.buildPing()))
        }
      }, this.config.pingInterval)
    }
  }

  private stopPing() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer)
      this.pingTimer = null
    }
  }

  private scheduleReconnect() {
    this.reconnectTimer = setTimeout(() => {
      this.connect()
    }, this.reconnectDelay)
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000)
  }

  private cleanup() {
    this.stopPing()
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    if (this.ws) {
      this.ws.onopen = null
      this.ws.onmessage = null
      this.ws.onclose = null
      this.ws.onerror = null
      this.ws.close()
      this.ws = null
    }
  }
}

/** 全局 WS 管理器（多交易所） */
class KlineWsManager {
  private connections = new Map<ExchangeId, KlineWebSocket>()
  private onKline: KlineWsCallback
  private onStatus: WsStatusCallback

  constructor(onKline: KlineWsCallback, onStatus: WsStatusCallback) {
    this.onKline = onKline
    this.onStatus = onStatus
  }

  /** 订阅指定交易所的 K 线 */
  subscribe(exchangeId: ExchangeId, symbols: string[], timeframe: KlineTimeframe) {
    if (!supportsKlineWs(exchangeId)) {
      console.log(`[WS] ${exchangeId} 不支持 WS，回退 HTTP`)
      this.onStatus(false)
      return
    }

    let conn = this.connections.get(exchangeId)
    if (!conn) {
      conn = new KlineWebSocket(exchangeId, this.onKline, (connected) => {
        if (!connected) this.onStatus(false)
      })
      this.connections.set(exchangeId, conn)
    }
    conn.subscribe(symbols, timeframe)
  }

  /** 取消订阅 */
  unsubscribe(exchangeId: ExchangeId, symbols: string[]) {
    this.connections.get(exchangeId)?.unsubscribe(symbols)
  }

  /** 断开所有连接 */
  disconnectAll() {
    for (const conn of this.connections.values()) conn.disconnect()
    this.connections.clear()
  }
}

/** 单例 */
let _manager: KlineWsManager | null = null

export function getKlineWsManager(
  onKline: KlineWsCallback,
  onStatus: WsStatusCallback,
): KlineWsManager {
  if (!_manager) {
    _manager = new KlineWsManager(onKline, onStatus)
  }
  return _manager
}

export function destroyKlineWsManager() {
  _manager?.disconnectAll()
  _manager = null
}
