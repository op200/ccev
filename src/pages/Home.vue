<script setup lang="tsx">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  NDataTable,
  NSelect,
  NSpace,
  NTag,
  NSpin,
  NCard,
  NEmpty,
} from 'naive-ui'
import type { DataTableColumns } from 'naive-ui'
import { useSettingsStore } from '@/stores/settings'
import { useExchangeStore } from '@/stores/exchange'
import { formatPrice, formatVolume, formatPercent } from '@/utils/format'
import { fetchTickers } from '@/utils/ccxt'

defineOptions({ name: 'HomePage' })

interface TickerRow {
  exchange: string
  symbol: string
  price: number
  change: number
  volume: number
  high: number
  low: number
}

const { t } = useI18n()
const settingsStore = useSettingsStore()
const exchangeStore = useExchangeStore()

const selectedExchange = ref(settingsStore.settings.defaultExchange)
const selectedSymbol = ref<string | null>(null)
const tickers = ref<TickerRow[]>([])
const initialLoading = ref(true)
const refreshing = ref(false)
const pollingTimer = ref<ReturnType<typeof setInterval> | null>(null)

/** 表格可用高度：100vh - 顶部导航(~64px) - 页面padding(48px) - 标题行(~80px) - card padding(48px) */
const tableMaxHeight = computed(() => window.innerHeight - 240)

const exchangeOptions = computed(() =>
  settingsStore.enabledExchanges.map((id) => ({
    label: id.toUpperCase(),
    value: id,
  })),
)

const filteredTickers = computed(() => {
  if (!selectedSymbol.value) return tickers.value
  const q = selectedSymbol.value.toUpperCase()
  return tickers.value.filter((t) => t.symbol.toUpperCase().includes(q))
})

const symbolOptions = computed(() => {
  const seen = new Set<string>()
  return tickers.value
    .filter((t) => {
      if (seen.has(t.symbol)) return false
      seen.add(t.symbol)
      return true
    })
    .map((t) => ({
      label: t.symbol,
      value: t.symbol,
    }))
})

const columns: DataTableColumns<TickerRow> = [
  { title: t('home.exchange'), key: 'exchange', width: '12%', sorter: true },
  { title: t('home.symbol'), key: 'symbol', width: '14%', sorter: true },
  {
    title: t('home.price'),
    key: 'price',
    width: '12%',
    sorter: (a, b) => a.price - b.price,
    render: (row) => formatPrice(row.price),
  },
  {
    title: t('home.change24h'),
    key: 'change',
    width: '12%',
    sorter: (a, b) => a.change - b.change,
    render: (row) => {
      return <NTag type={row.change >= 0 ? 'success' : 'error'}>{formatPercent(row.change)}</NTag>
    },
  },
  {
    title: t('home.volume24h'),
    key: 'volume',
    width: '14%',
    sorter: (a, b) => a.volume - b.volume,
    render: (row) => formatVolume(row.volume),
  },
  {
    title: t('home.high24h'),
    key: 'high',
    width: '12%',
    sorter: (a, b) => a.high - b.high,
    render: (row) => formatPrice(row.high),
  },
  {
    title: t('home.low24h'),
    key: 'low',
    width: '12%',
    sorter: (a, b) => a.low - b.low,
    render: (row) => formatPrice(row.low),
  },
]

async function loadTickers() {
  // 首次加载显示大转圈，后续静默刷新仅显示小型指示器
  if (initialLoading.value) {
    // nothing extra
  } else {
    refreshing.value = true
  }
  try {
    const data = await fetchTickers(selectedExchange.value)
    const exchangeLabel = selectedExchange.value.toUpperCase()
    tickers.value = data.map((item) => ({
      exchange: exchangeLabel,
      symbol: item.symbol,
      price: item.last,
      change: item.change24h,
      volume: item.volume24h,
      high: item.high24h,
      low: item.low24h,
    }))
  } catch (e) {
    console.error('Failed to load tickers:', e)
  } finally {
    initialLoading.value = false
    refreshing.value = false
  }
}

/** 启动轮询：每 5 秒刷新 Ticker */
function startPolling() {
  stopPolling()
  pollingTimer.value = setInterval(() => {
    loadTickers()
  }, 5000)
}

function stopPolling() {
  if (pollingTimer.value) {
    clearInterval(pollingTimer.value)
    pollingTimer.value = null
  }
}

function handleExchangeChange(val: string) {
  selectedExchange.value = val
  selectedSymbol.value = null
  loadTickers()
  startPolling()
}

onMounted(() => {
  exchangeStore.loadExchangeInfo(selectedExchange.value)
  loadTickers()
  startPolling()
})

onBeforeUnmount(() => {
  stopPolling()
})
</script>

<template>
  <div class="home-page">
    <div class="page-header">
      <NSpace align="center">
        <h1>{{ t('home.title') }}</h1>
        <div v-if="refreshing" class="refresh-dot" title="刷新中..." />
      </NSpace>
      <NSpace>
        <NSelect
          v-model:value="selectedExchange"
          :options="exchangeOptions"
          :placeholder="t('home.exchange')"
          style="width: 11rem"
          @update:value="handleExchangeChange"
        />
        <NSelect
          v-model:value="selectedSymbol"
          :options="symbolOptions"
          :placeholder="t('home.symbol')"
          style="width: 14rem"
          filterable
          clearable
        />
      </NSpace>
    </div>

    <NSpin v-if="initialLoading" stroke="#5B8FF9" :stroke-width="12" />
    <NCard
      v-else
      content-style="padding: 8px; flex: 1; display: flex; flex-direction: column; min-height: 0"
    >
      <NDataTable
        v-if="filteredTickers.length > 0"
        :columns="columns"
        :data="filteredTickers"
        :bordered="false"
        :single-line="false"
        size="small"
        :max-height="tableMaxHeight"
        virtual-scroll
      />
      <NEmpty v-else :description="t('home.noData')" />
    </NCard>
  </div>
</template>

<style scoped>
.home-page {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.page-header h1 {
  margin: 0;
  font-size: 24px;
}

.refresh-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #5b8ff9;
  opacity: 0.6;
  animation: refresh-pulse 1.2s ease-in-out infinite;
}

@keyframes refresh-pulse {
  0%,
  100% {
    opacity: 0.3;
    transform: scale(0.8);
  }
  50% {
    opacity: 1;
    transform: scale(1.3);
  }
}
</style>
