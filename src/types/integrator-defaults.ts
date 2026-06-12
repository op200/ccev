/**
 * 默认数据整合器定义
 *
 * 当用户首次使用整合器功能（数据库中无整合器记录）时自动创建这些默认整合器，
 * 作为用户编写自定义策略的参考模板。
 */

/** 创建整合器所需的输入参数（不含自动生成字段） */
export interface DefaultIntegratorInput {
  name: string
  description: string
  code: string
  language: 'javascript' | 'typescript'
  channelIds: string[]
  /** 默认启用状态，种子到 DB 时使用 */
  enabled: boolean
}

/** 默认整合器列表 */
export const DEFAULT_INTEGRATORS: DefaultIntegratorInput[] = [
  // ============================================================
  // 1. 价格突破策略
  // ============================================================
  {
    name: '价格突破策略',
    description: '监测K线收盘价突破前一根K线最高/最低价时推送提醒，适用于趋势跟踪',
    language: 'javascript',
    channelIds: [],
    enabled: true,
    code: `// 价格突破策略
// 当收盘价突破前一根K线的最高价（向上突破）或最低价（向下突破）时触发通知
const { klines, symbol, timeframe } = context

if (klines.length < 2) {
  api.log('K线数据不足，需要至少2根')
  return
}

const last = klines[klines.length - 1]
const prev = klines[klines.length - 2]

const highBreak = last.close > prev.high
const lowBreak = last.close < prev.low

if (highBreak) {
  const pct = (((last.close - prev.high) / prev.high) * 100).toFixed(2)
  api.sendToAllChannels(
    '📈 价格向上突破',
    [
      \`交易对: \${symbol}\`,
      \`周期: \${timeframe}\`,
      \`当前价: \${last.close}\`,
      \`突破高点: \${prev.high}\`,
      \`突破幅度: \${pct}%\`,
      \`时间: \${new Date(last.timestamp).toLocaleString()}\`,
    ].join('\\n'),
  )
}

if (lowBreak) {
  const pct = (((prev.low - last.close) / prev.low) * 100).toFixed(2)
  api.sendToAllChannels(
    '📉 价格向下突破',
    [
      \`交易对: \${symbol}\`,
      \`周期: \${timeframe}\`,
      \`当前价: \${last.close}\`,
      \`跌破低点: \${prev.low}\`,
      \`跌破幅度: \${pct}%\`,
      \`时间: \${new Date(last.timestamp).toLocaleString()}\`,
    ].join('\\n'),
  )
}
`,
  },

  // ============================================================
  // 2. 成交量异动提醒
  // ============================================================
  {
    name: '成交量异动提醒',
    description: '当前K线成交量超过近N根均量的指定倍数时推送提醒，用于发现主力资金异动',
    language: 'javascript',
    channelIds: [],
    enabled: true,
    code: `// 成交量异动提醒
// 当成交量超过近20根K线均量的指定倍数时触发
const { klines, symbol, timeframe } = context

// 可配置参数
const LOOKBACK = 20 // 回看周期
const VOLUME_SPIKE_RATIO = 2.5 // 放量倍数阈值

if (klines.length < LOOKBACK + 1) {
  api.log(\`K线数据不足，需要至少\${LOOKBACK + 1}根\`)
  return
}

const last = klines[klines.length - 1]
const prevKlines = klines.slice(-LOOKBACK - 1, -1)

// 计算均量
const avgVolume =
  prevKlines.reduce((sum, k) => sum + k.volume, 0) / prevKlines.length

if (avgVolume === 0) return

const ratio = last.volume / avgVolume

if (ratio >= VOLUME_SPIKE_RATIO) {
  const isBullish = last.close > last.open
  const direction = isBullish ? '🟢 放量上涨' : '🔴 放量下跌'

  api.sendToAllChannels(
    \`\${direction} - 成交量异动\`,
    [
      \`交易对: \${symbol}\`,
      \`周期: \${timeframe}\`,
      \`当前量: \${last.volume.toFixed(2)}\`,
      \`均量(\${LOOKBACK}): \${avgVolume.toFixed(2)}\`,
      \`放量倍数: \${ratio.toFixed(2)}x\`,
      \`当前价: \${last.close}\`,
      \`涨跌: \${isBullish ? '+' : ''}\${((last.close - last.open) / last.open * 100).toFixed(2)}%\`,
      \`时间: \${new Date(last.timestamp).toLocaleString()}\`,
    ].join('\\n'),
  )
}
`,
  },

  // ============================================================
  // 3. RSI 超买超卖
  // ============================================================
  {
    name: 'RSI 超买超卖',
    description: '计算14周期RSI指标，进入超买(>70)或超卖(<30)区域时推送提醒',
    language: 'javascript',
    channelIds: [],
    enabled: true,
    code: `// RSI 超买超卖提醒
// 计算 RSI(14) 指标，超买 > 70 或超卖 < 30 时触发通知
const { klines, symbol, timeframe } = context

const RSI_PERIOD = 14
const OVERBOUGHT = 70
const OVERSOLD = 30

if (klines.length < RSI_PERIOD + 1) {
  api.log(\`K线数据不足，需要至少\${RSI_PERIOD + 1}根\`)
  return
}

// 计算 RSI
function calcRSI(data, period) {
  const changes = []
  for (let i = 1; i < data.length; i++) {
    changes.push(data[i].close - data[i - 1].close)
  }

  let avgGain = 0
  let avgLoss = 0
  for (let i = 0; i < period; i++) {
    if (changes[i] > 0) avgGain += changes[i]
    else avgLoss += Math.abs(changes[i])
  }
  avgGain /= period
  avgLoss /= period

  const rsiValues = []
  for (let i = period; i < changes.length; i++) {
    const gain = changes[i] > 0 ? changes[i] : 0
    const loss = changes[i] < 0 ? Math.abs(changes[i]) : 0
    avgGain = (avgGain * (period - 1) + gain) / period
    avgLoss = (avgLoss * (period - 1) + loss) / period
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss
    rsiValues.push(100 - 100 / (1 + rs))
  }

  return rsiValues
}

const rsiValues = calcRSI(klines, RSI_PERIOD)
const currentRSI = rsiValues[rsiValues.length - 1]
const prevRSI = rsiValues[rsiValues.length - 2]

const last = klines[klines.length - 1]
const rsiFixed = currentRSI.toFixed(1)

if (prevRSI < OVERBOUGHT && currentRSI >= OVERBOUGHT) {
  api.sendToAllChannels(
    '🔴 RSI 超买警告',
    [
      \`交易对: \${symbol}\`,
      \`周期: \${timeframe}\`,
      \`RSI(14): \${rsiFixed}\`,
      \`当前价: \${last.close}\`,
      \`建议: 注意回调风险，考虑减仓或设置止盈\`,
      \`时间: \${new Date(last.timestamp).toLocaleString()}\`,
    ].join('\\n'),
  )
}

if (prevRSI > OVERSOLD && currentRSI <= OVERSOLD) {
  api.sendToAllChannels(
    '🟢 RSI 超卖机会',
    [
      \`交易对: \${symbol}\`,
      \`周期: \${timeframe}\`,
      \`RSI(14): \${rsiFixed}\`,
      \`当前价: \${last.close}\`,
      \`建议: 关注反弹机会，可考虑分批建仓\`,
      \`时间: \${new Date(last.timestamp).toLocaleString()}\`,
    ].join('\\n'),
  )
}
`,
  },

  // ============================================================
  // 4. 均线金叉死叉
  // ============================================================
  {
    name: '均线金叉死叉',
    description: '监测短期均线(MA7)与长期均线(MA25)的交叉信号，金叉死叉时推送提醒',
    language: 'javascript',
    channelIds: [],
    enabled: true,
    code: `// 均线金叉死叉策略
// MA7 上穿 MA25 为金叉（看涨），MA7 下穿 MA25 为死叉（看跌）
const { klines, symbol, timeframe } = context

const SHORT_MA = 7
const LONG_MA = 25

if (klines.length < LONG_MA + 1) {
  api.log(\`K线数据不足，需要至少\${LONG_MA + 1}根\`)
  return
}

// 计算移动平均
function calcMA(data, period) {
  const result = []
  for (let i = period - 1; i < data.length; i++) {
    let sum = 0
    for (let j = i - period + 1; j <= i; j++) {
      sum += data[j].close
    }
    result.push(sum / period)
  }
  return result
}

const closePrices = klines
const shortMA = calcMA(closePrices, SHORT_MA)
const longMA = calcMA(closePrices, LONG_MA)

// 对齐数组（shortMA 和 longMA 的起始索引不同）
const offset = LONG_MA - SHORT_MA
const alignedShort = shortMA.slice(offset)

const currShort = alignedShort[alignedShort.length - 1]
const prevShort = alignedShort[alignedShort.length - 2]
const currLong = longMA[longMA.length - 1]
const prevLong = longMA[longMA.length - 2]

const last = klines[klines.length - 1]

// 金叉：短期上穿长期
if (prevShort <= prevLong && currShort > currLong) {
  api.sendToAllChannels(
    '🌟 均线金叉信号',
    [
      \`交易对: \${symbol}\`,
      \`周期: \${timeframe}\`,
      \`MA\${SHORT_MA}: \${currShort.toFixed(4)}\`,
      \`MA\${LONG_MA}: \${currLong.toFixed(4)}\`,
      \`当前价: \${last.close}\`,
      \`信号: 短期均线上穿长期均线，看涨趋势启动\`,
      \`时间: \${new Date(last.timestamp).toLocaleString()}\`,
    ].join('\\n'),
  )
}

// 死叉：短期下穿长期
if (prevShort >= prevLong && currShort < currLong) {
  api.sendToAllChannels(
    '💀 均线死叉信号',
    [
      \`交易对: \${symbol}\`,
      \`周期: \${timeframe}\`,
      \`MA\${SHORT_MA}: \${currShort.toFixed(4)}\`,
      \`MA\${LONG_MA}: \${currLong.toFixed(4)}\`,
      \`当前价: \${last.close}\`,
      \`信号: 短期均线下穿长期均线，看跌趋势启动\`,
      \`时间: \${new Date(last.timestamp).toLocaleString()}\`,
    ].join('\\n'),
  )
}
`,
  },

  // ============================================================
  // 5. 涨跌幅告警
  // ============================================================
  {
    name: '涨跌幅告警',
    description: '监测指定时间窗口内的价格涨跌幅，超过阈值时推送提醒，适用于极端行情预警',
    language: 'javascript',
    channelIds: [],
    enabled: true,
    code: `// 涨跌幅告警
// 监测最近N根K线的累计涨跌幅，超过阈值时触发通知
const { klines, symbol, timeframe } = context

// 可配置参数
const LOOKBACK = 6 // 回看K线数量
const ALERT_THRESHOLD = 5 // 涨跌幅阈值（%）

if (klines.length < LOOKBACK + 1) {
  api.log(\`K线数据不足，需要至少\${LOOKBACK + 1}根\`)
  return
}

const last = klines[klines.length - 1]
const start = klines[klines.length - 1 - LOOKBACK]

const changePct = ((last.close - start.close) / start.close) * 100

if (Math.abs(changePct) >= ALERT_THRESHOLD) {
  const direction = changePct > 0 ? '📈 快速上涨' : '📉 快速下跌'
  const absChange = Math.abs(last.close - start.close)

  api.sendToAllChannels(
    \`\${direction} 警告\`,
    [
      \`交易对: \${symbol}\`,
      \`周期: \${timeframe}\`,
      \`监测窗口: 近\${LOOKBACK}根K线\`,
      \`起始价: \${start.close}\`,
      \`当前价: \${last.close}\`,
      \`涨跌幅: \${changePct > 0 ? '+' : ''}\${changePct.toFixed(2)}%\`,
      \`变动额: \${changePct > 0 ? '+' : ''}\${absChange.toFixed(4)}\`,
      \`时间: \${new Date(last.timestamp).toLocaleString()}\`,
    ].join('\\n'),
  )
}
`,
  },

  // ============================================================
  // 6. 多时间框架趋势共振
  // ============================================================
  {
    name: '多时间框架趋势共振',
    description:
      '同时评估多个技术指标（均线排列、价格位置、成交量方向）的一致性，共振时推送综合信号',
    language: 'javascript',
    channelIds: [],
    enabled: true,
    code: `// 多指标共振策略
// 综合判断均线排列方向、价格相对MA位置、成交量趋势，
// 三个维度同时指向同一方向时触发信号
const { klines, symbol, timeframe } = context

const MA_PERIOD = 20

if (klines.length < MA_PERIOD + 2) {
  api.log(\`K线数据不足，需要至少\${MA_PERIOD + 2}根\`)
  return
}

const last = klines[klines.length - 1]
const prev = klines[klines.length - 2]

// 1. 计算 MA20
function calcMA(data, period) {
  let sum = 0
  for (let i = data.length - period; i < data.length; i++) {
    sum += data[i].close
  }
  return sum / period
}
const ma20 = calcMA(klines, MA_PERIOD)
const prevMA20 =
  klines
    .slice(-MA_PERIOD - 1, -1)
    .reduce((s, k) => s + k.close, 0) / MA_PERIOD

// 2. 判断信号
const priceAboveMA = last.close > ma20 // 价格在均线上方
const prevPriceAboveMA = prev.close > prevMA20

const maRising = ma20 > prevMA20 // 均线上升
const volumeRising = last.volume > prev.volume // 成交量放大

const priceCrossUp = !prevPriceAboveMA && priceAboveMA // 价格上穿MA
const priceCrossDown = prevPriceAboveMA && !priceAboveMA // 价格下穿MA

// 多头共振：价格 > MA + MA上升 + 放量
const bullishScore = (priceAboveMA ? 1 : 0) + (maRising ? 1 : 0) + (volumeRising ? 1 : 0)

// 空头共振：价格 < MA + MA下降 + 放量
const bearishScore = (!priceAboveMA ? 1 : 0) + (!maRising ? 1 : 0) + (volumeRising ? 1 : 0)

if (bullishScore >= 3 || (bullishScore >= 2 && priceCrossUp)) {
  api.sendToAllChannels(
    '🐂 多头共振信号',
    [
      \`交易对: \${symbol}\`,
      \`周期: \${timeframe}\`,
      \`当前价: \${last.close}\`,
      \`MA\${MA_PERIOD}: \${ma20.toFixed(4)}\`,
      \`共振评分: \${bullishScore}/3\`,
      \`信号: 价格站上均线、均线向上、量能配合，多头趋势强化\`,
      \`时间: \${new Date(last.timestamp).toLocaleString()}\`,
    ].join('\\n'),
  )
}

if (bearishScore >= 3 || (bearishScore >= 2 && priceCrossDown)) {
  api.sendToAllChannels(
    '🐻 空头共振信号',
    [
      \`交易对: \${symbol}\`,
      \`周期: \${timeframe}\`,
      \`当前价: \${last.close}\`,
      \`MA\${MA_PERIOD}: \${ma20.toFixed(4)}\`,
      \`共振评分: \${bearishScore}/3\`,
      \`信号: 价格跌破均线、均线向下、量能配合，空头趋势强化\`,
      \`时间: \${new Date(last.timestamp).toLocaleString()}\`,
    ].join('\\n'),
  )
}
`,
  },

  // ============================================================
  // 7. 通知测试（默认关闭，仅用于验证 WebUI 通知功能）
  // ============================================================
  {
    name: '通知测试',
    description: '【默认关闭】每次运行都会无条件弹出 WebUI 通知，用于测试推送功能是否正常',
    language: 'javascript',
    channelIds: [],
    enabled: false,
    code: `// 通知功能测试
// 每次运行都会触发通知，用于验证 WebUI 通知和渠道推送是否正常工作
const { klines, symbol, timeframe } = context

// 无条件触发通知，测试 WebUI 弹出效果
api.sendToAllChannels(
  '🧪 测试通知',
  [
    \`这是一个测试通知\`,
    \`交易对: \${symbol}\`,
    \`周期: \${timeframe}\`,
    \`K线数量: \${klines.length}\`,
    \`当前时间: \${new Date().toLocaleString()}\`,
  ].join('\\n'),
)

// 测试 api.log 输出
api.log('测试日志输出 - 整合器运行正常')
api.log('context 内容:', JSON.stringify({ symbol, timeframe, klineCount: klines.length }))
`,
  },
]
