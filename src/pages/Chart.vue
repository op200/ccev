<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import { NSelect, NSpace, NSpin, NCard, NEmpty } from 'naive-ui'
import { useSettingsStore } from '@/stores/settings'
import { useExchangeStore } from '@/stores/exchange'
import { useKlineStore } from '@/stores/kline'
import { TIMEFRAME_LABELS } from '@/utils/format'
import type { KlineTimeframe } from '@/types/kline'
import KlineChartComponent from '@/components/chart/KlineChart.vue'

defineOptions({ name: 'ChartPage' })

const { t } = useI18n()
const settingsStore = useSettingsStore()
const exchangeStore = useExchangeStore()
const klineStore = useKlineStore()

const selectedExchange = ref(settingsStore.settings.defaultExchange)
const selectedSymbol = ref(settingsStore.settings.defaultSymbol)
const selectedTimeframe = ref<KlineTimeframe>(
  (settingsStore.settings.defaultTimeframe as KlineTimeframe) || '1h',
)

const exchangeOptions = computed(() =>
  settingsStore.enabledExchanges.map((id) => ({
    label: id.toUpperCase(),
    value: id,
  })),
)

const symbolOptions = computed(() => {
  const syms = exchangeStore.getSymbols(selectedExchange.value)
  return syms.map((s) => ({
    label: s.symbol,
    value: s.symbol,
  }))
})

const timeframeOptions = computed(() =>
  (Object.keys(TIMEFRAME_LABELS) as KlineTimeframe[]).map((tf) => ({
    label: TIMEFRAME_LABELS[tf],
    value: tf,
  })),
)

const hasSymbols = computed(() => exchangeStore.getSymbols(selectedExchange.value).length > 0)

const pollingTimer = ref<ReturnType<typeof setInterval> | null>(null)

function startPolling() {
  stopPolling()
  pollingTimer.value = setInterval(() => {
    klineStore.refreshLatest()
  }, 5000)
}

function stopPolling() {
  if (pollingTimer.value) {
    clearInterval(pollingTimer.value)
    pollingTimer.value = null
  }
}

async function loadChart() {
  if (!selectedExchange.value || !selectedSymbol.value) return

  // 确保交易所信息已加载
  await exchangeStore.loadExchangeInfo(selectedExchange.value)

  // 加载交易对
  if (!hasSymbols.value) {
    await exchangeStore.loadSymbols(selectedExchange.value)
  }

  // 获取K线数据
  await klineStore.fetchKlines({
    exchangeId: selectedExchange.value,
    symbol: selectedSymbol.value,
    timeframe: selectedTimeframe.value,
    limit: 200,
  })
}

function handleExchangeChange() {
  selectedSymbol.value = ''
  exchangeStore.loadSymbols(selectedExchange.value)
}

function handleSymbolChange() {
  if (selectedSymbol.value) {
    loadChart()
  }
}

function handleTimeframeChange() {
  if (selectedSymbol.value) {
    loadChart()
  }
}

onMounted(async () => {
  // 如果内存中已有匹配的 K 线数据则跳过加载（配合 keep-alive 或 Store 短路）
  if (
    klineStore.klines.length > 0 &&
    klineStore.currentParams?.exchangeId === selectedExchange.value &&
    klineStore.currentParams?.symbol === selectedSymbol.value &&
    klineStore.currentParams?.timeframe === selectedTimeframe.value
  ) {
    return
  }

  await exchangeStore.loadExchangeInfo(selectedExchange.value)
  await exchangeStore.loadSymbols(selectedExchange.value)
  if (selectedSymbol.value) {
    await loadChart()
  }
  startPolling()
})

onBeforeUnmount(() => {
  stopPolling()
})
</script>

<template>
  <div class="chart-page">
    <NSpace vertical size="large">
      <div class="page-header">
        <h1>{{ t('chart.title') }}</h1>
        <NSpace>
          <NSelect
            v-model:value="selectedExchange"
            :options="exchangeOptions"
            :placeholder="t('chart.selectExchange')"
            style="width: 11rem"
            @update:value="handleExchangeChange"
          />
          <NSelect
            v-model:value="selectedSymbol"
            :options="symbolOptions"
            :placeholder="t('chart.selectSymbol')"
            style="width: 14rem"
            filterable
            @update:value="handleSymbolChange"
          />
          <NSelect
            v-model:value="selectedTimeframe"
            :options="timeframeOptions"
            :placeholder="t('chart.selectTimeframe')"
            style="width: 7rem"
            @update:value="handleTimeframeChange"
          />
        </NSpace>
      </div>

      <NSpin :show="klineStore.loading">
        <NCard v-if="selectedSymbol" content-style="padding: 0">
          <div style="height: 70vh">
            <KlineChartComponent
              :data="klineStore.klines"
              :loading="klineStore.loading"
              @load-more="klineStore.loadMore"
            />
          </div>
        </NCard>
        <NEmpty v-else :description="t('chart.noExchange')" />
      </NSpin>
    </NSpace>
  </div>
</template>

<style scoped>
.chart-page {
  width: 100%;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.page-header h1 {
  margin: 0;
  font-size: 24px;
}
</style>
