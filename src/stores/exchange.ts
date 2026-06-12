import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { ExchangeId, ExchangeInfo, SymbolInfo, ConnectionStatus } from '@/types/exchange'
import { getExchangeIds, getExchangeInfoCached, getLinearSymbols } from '@/utils/ccxt'

export const useExchangeStore = defineStore('exchange', () => {
  const exchanges = ref<ExchangeInfo[]>([])
  const symbols = ref<Map<ExchangeId, SymbolInfo[]>>(new Map())
  const connectionStatus = ref<Map<ExchangeId, ConnectionStatus>>(new Map())
  const loading = ref(false)

  /** 所有可用交易所 ID */
  const allExchangeIds = ref<ExchangeId[]>([])

  /** 获取的交易所列表（仅含 ccxt 支持的） */
  const availableExchanges = computed(() => exchanges.value)

  /** 初始化交易所列表 */
  function initExchanges() {
    loading.value = true
    try {
      allExchangeIds.value = getExchangeIds()
    } catch {
      allExchangeIds.value = ['okx', 'binance', 'bybit', 'bitget', 'gate', 'kucoin']
    } finally {
      loading.value = false
    }
  }

  /** 加载指定交易所信息 */
  function loadExchangeInfo(exchangeId: ExchangeId) {
    try {
      connectionStatus.value.set(exchangeId, 'connecting')
      const info = getExchangeInfoCached(exchangeId)
      const existing = exchanges.value.findIndex((e) => e.id === exchangeId)
      if (existing >= 0) {
        exchanges.value[existing] = info
      } else {
        exchanges.value.push(info)
      }
      connectionStatus.value.set(exchangeId, 'connected')
    } catch {
      connectionStatus.value.set(exchangeId, 'error')
    }
  }

  /** 加载交易所交易对 */
  async function loadSymbols(exchangeId: ExchangeId): Promise<SymbolInfo[]> {
    try {
      const syms = await getLinearSymbols(exchangeId)
      symbols.value.set(exchangeId, syms)
      return syms
    } catch {
      return []
    }
  }

  /** 获取已缓存的交易对 */
  function getSymbols(exchangeId: ExchangeId): SymbolInfo[] {
    return symbols.value.get(exchangeId) || []
  }

  /** 搜索交易对 */
  function searchSymbols(exchangeId: ExchangeId, query: string): SymbolInfo[] {
    const all = getSymbols(exchangeId)
    if (!query) return all
    const q = query.toUpperCase()
    return all.filter((s) => s.symbol.toUpperCase().includes(q))
  }

  return {
    exchanges,
    symbols,
    connectionStatus,
    loading,
    allExchangeIds,
    availableExchanges,
    initExchanges,
    loadExchangeInfo,
    loadSymbols,
    getSymbols,
    searchSymbols,
  }
})
