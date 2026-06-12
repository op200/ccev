<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type Time,
  ColorType,
  CrosshairMode,
  LineStyle,
} from 'lightweight-charts'
import { toChartData } from '@/utils/format'
import type { KlineData } from '@/types/kline'

// ══════════════════════════════════════════════════
// Props / Emits
// ══════════════════════════════════════════════════

const props = defineProps<{
  data: KlineData[]
  loading?: boolean
}>()

const emit = defineEmits<{
  (e: 'loadMore'): void
}>()

// ══════════════════════════════════════════════════
// 响应式状态

// ══════════════════════════════════════════════════
// 响应式状态
// ══════════════════════════════════════════════════

const containerRef = ref<HTMLDivElement>()
const showSpinner = ref(false)

let chart: IChartApi | null = null
let candleSeries: ISeriesApi<'Candlestick'> | null = null
let volumeSeries: ISeriesApi<'Histogram'> | null = null
let spinnerTimer: ReturnType<typeof setTimeout> | null = null
/** 防止 setData 触发的可见范围变化回调中再次触发 loadMore */
let _updatingData = false
let _updatingDataResetTimer: ReturnType<typeof setTimeout> | null = null

function isDarkTheme(): boolean {
  return document.documentElement.getAttribute('data-theme') === 'dark'
}

// ══════════════════════════════════════════════════
// 图表初始化
// ══════════════════════════════════════════════════

function initChart() {
  if (!containerRef.value || chart) return

  const container = containerRef.value
  const isDark = isDarkTheme()

  chart = createChart(container, {
    layout: {
      background: { type: ColorType.Solid, color: isDark ? '#1a1a2e' : '#ffffff' },
      textColor: isDark ? '#d1d4dc' : '#191919',
    },
    grid: {
      vertLines: { color: isDark ? '#2a2a3e' : '#f0f0f0' },
      horzLines: { color: isDark ? '#2a2a3e' : '#f0f0f0' },
    },
    crosshair: {
      mode: CrosshairMode.Normal,
      vertLine: {
        color: isDark ? '#758696' : '#9B7DFF',
        style: LineStyle.Dashed,
        labelBackgroundColor: isDark ? '#758696' : '#9B7DFF',
      },
      horzLine: {
        color: isDark ? '#758696' : '#9B7DFF',
        style: LineStyle.Dashed,
        labelBackgroundColor: isDark ? '#758696' : '#9B7DFF',
      },
    },
    rightPriceScale: {
      borderColor: isDark ? '#2a2a3e' : '#d1d4dc',
    },
    timeScale: {
      borderColor: isDark ? '#2a2a3e' : '#d1d4dc',
      timeVisible: true,
      secondsVisible: false,
    },
    handleScroll: {
      vertTouchDrag: false,
      horzTouchDrag: true,
      mouseWheel: true,
    },
    handleScale: {
      mouseWheel: true,
    },
  })

  // K线序列 —— 启用库内置价格线（最新价水平虚线 + 价格标签）
  candleSeries = chart.addSeries(CandlestickSeries, {
    upColor: '#26a69a',
    downColor: '#ef5350',
    borderDownColor: '#ef5350',
    borderUpColor: '#26a69a',
    wickDownColor: '#ef5350',
    wickUpColor: '#26a69a',
    lastValueVisible: true,
    priceLineVisible: true,
    priceLineSource: 0,
    priceLineWidth: 1,
    priceLineStyle: LineStyle.Dashed,
  })

  // 成交量序列
  volumeSeries = chart.addSeries(HistogramSeries, {
    color: '#26a69a',
    priceFormat: {
      type: 'volume',
    },
    priceScaleId: 'volume',
    priceLineVisible: false,
    lastValueVisible: false,
  })

  chart.priceScale('volume').applyOptions({
    scaleMargins: {
      top: 0.8,
      bottom: 0,
    },
  })

  // 监听滚动加载更多（到达数据左边界时触发，冷却由 store 保证）
  chart.timeScale().subscribeVisibleTimeRangeChange((range) => {
    if (!range || props.data.length === 0) return
    if (_updatingData) {
      console.log('[Chart] visibleRangeChange 跳过 (_updatingData)')
      return
    }
    const thresholdIdx = Math.min(5, props.data.length - 1)
    const thresholdTime = (props.data[thresholdIdx]!.timestamp / 1000) as Time
    if (Number(range.from) <= Number(thresholdTime)) {
      console.log(
        `[Chart] 触发 loadMore range.from=${range.from} threshold=${thresholdTime} dataLen=${props.data.length}`,
      )
      emit('loadMore')
    }
  })

  // 设置数据
  if (props.data.length > 0) {
    setChartData()
  }

  // 响应窗口大小变化
  const resizeObserver = new ResizeObserver(() => {
    if (chart && containerRef.value) {
      chart.applyOptions({
        width: containerRef.value.clientWidth,
        height: containerRef.value.clientHeight,
      })
    }
  })
  resizeObserver.observe(container)
}

// ══════════════════════════════════════════════════
// 数据设置
// ══════════════════════════════════════════════════

/** 上一次数据首条时间戳，用于判断是否为 loadMore 左端插入 */
let _prevFirstTs: number | null = null
/** 上一次数据长度，用于判断轮询刷新（右端末尾变化） */
let _prevDataLen = 0

function _checkLoadMoreAfterUpdate() {
  if (_updatingDataResetTimer) return
  _updatingDataResetTimer = setTimeout(() => {
    _updatingData = false
    _updatingDataResetTimer = null
    if (!chart || props.data.length === 0) return
    const range = chart.timeScale().getVisibleRange()
    if (!range) return
    const thresholdIdx = Math.min(5, props.data.length - 1)
    const thresholdTime = (props.data[thresholdIdx]!.timestamp / 1000) as Time
    if (Number(range.from) <= Number(thresholdTime)) {
      console.log(`[Chart] 延迟触发 loadMore range.from=${range.from} threshold=${thresholdTime}`)
      emit('loadMore')
    }
  }, 50)
}

function setChartData() {
  if (!candleSeries || !volumeSeries || !chart) return
  const chartData = toChartData(props.data)
  const newLen = chartData.length

  // ── 判断更新类型 ──
  // 左端前插（loadMore）：首条时间变了，末尾时间不变
  const newLastTs = (chartData[chartData.length - 1]?.time as number) ?? null
  const isLoadMoreInsert =
    _prevFirstTs !== null && newLen > _prevDataLen && _prevFirstTs !== newLastTs

  // 右端增量（轮询刷新）：长度相同或 +1，末尾变了但左侧结构不变
  const isPollingUpdate =
    !isLoadMoreInsert &&
    _prevDataLen > 0 &&
    (newLen === _prevDataLen || newLen === _prevDataLen + 1)

  // ── 轮询增量：仅 update 末尾 candle，不 reset 系列不移动视口 ──
  if (isPollingUpdate) {
    const last = chartData[chartData.length - 1]!
    candleSeries.update(last)
    volumeSeries.update({
      time: last.time,
      value: last.volume,
      color: last.close >= last.open ? 'rgba(0, 150, 136, 0.5)' : 'rgba(239, 83, 80, 0.5)',
    })
    _prevDataLen = newLen
    _prevFirstTs = newLastTs
    return
  }

  // ── loadMore 前插 / 初始加载：全量 setData + 视口恢复 ──
  let visibleFrom: Time | null = null
  let visibleTo: Time | null = null
  if (chart && _prevFirstTs !== null) {
    const vr = chart.timeScale().getVisibleRange()
    if (vr) {
      visibleFrom = vr.from
      visibleTo = vr.to
    }
  }

  _prevFirstTs = newLastTs
  _prevDataLen = newLen

  _updatingData = true
  candleSeries.setData(chartData as CandlestickData[])

  volumeSeries.setData(
    chartData.map((d) => ({
      time: d.time,
      value: d.volume,
      color: d.close >= d.open ? 'rgba(0, 150, 136, 0.5)' : 'rgba(239, 83, 80, 0.5)',
    })),
  )

  if (visibleFrom !== null && visibleTo !== null && chart) {
    chart.timeScale().setVisibleRange({ from: visibleFrom, to: visibleTo })
    _checkLoadMoreAfterUpdate()
  } else {
    chart.timeScale().fitContent()
    _updatingData = false
    _checkLoadMoreAfterUpdate()
  }
}

// ══════════════════════════════════════════════════
// 生命周期
// ══════════════════════════════════════════════════

function destroyChart() {
  if (_updatingDataResetTimer) {
    clearTimeout(_updatingDataResetTimer)
    _updatingDataResetTimer = null
  }
  if (chart) {
    chart.remove()
    chart = null
    candleSeries = null
    volumeSeries = null
  }
}

watch(
  () => props.data,
  () => {
    if (chart && props.data.length > 0) {
      setChartData()
    }
  },
  { deep: true },
)

// loading 时延迟显示旋转控件，避免闪烁
watch(
  () => props.loading,
  (val) => {
    if (spinnerTimer) clearTimeout(spinnerTimer)
    if (val) {
      spinnerTimer = setTimeout(() => {
        showSpinner.value = true
      }, 300)
    } else {
      showSpinner.value = false
    }
  },
)

onMounted(() => {
  initChart()
})

onBeforeUnmount(() => {
  if (spinnerTimer) clearTimeout(spinnerTimer)
  destroyChart()
})
</script>

<template>
  <div ref="containerRef" class="kline-chart-container">
    <div v-if="showSpinner" class="chart-spinner">
      <div class="spinner-ring" />
    </div>
  </div>
</template>

<style scoped>
.kline-chart-container {
  width: 100%;
  height: 100%;
  min-height: 60vh;
  position: relative;
}

.chart-spinner {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 10;
  pointer-events: none;
}

.spinner-ring {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(91, 143, 249, 0.2);
  border-top-color: #5b8ff9;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
