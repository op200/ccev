/**
 * 整合器 API 文档动态生成器
 *
 * 根据 IntegratorAPI / IntegratorContext 的类型定义，
 * 结合用户编写的整合器代码，自动生成 API 文档。
 *
 * 核心思路：
 * 1. 预先定义完整的 API Schema（类型、参数、返回值、描述、默认示例）
 * 2. 解析整合器代码，检测实际使用了哪些 API
 * 3. 从代码中提取真实使用示例
 * 4. 按"已使用 / 可用"分组输出文档
 */

import type { APIDocItem } from '@/types/integrator'

// ============================================================
// API Schema 定义
// ============================================================

interface APISchemaEntry {
  name: string
  type: APIDocItem['type']
  description: string
  params?: APIDocItem['params']
  returns?: string
  example: string
}

// ============================================================
// 数据类型文档定义
// ============================================================

/** 类型属性文档条目 */
export interface TypePropDoc {
  name: string
  type: string
  required: boolean
  description: string
}

/** 数据类型文档条目 */
export interface TypeDocEntry {
  /** 类型名称 */
  name: string
  /** 类型种类 */
  kind: 'interface' | 'type' | 'enum'
  /** 描述 */
  description: string
  /** 来源文件 */
  source: string
  /** 属性列表（interface 用） */
  props?: TypePropDoc[]
  /** 联合类型成员（type 用） */
  unionMembers?: string[]
  /** 使用示例 */
  example?: string
  /** 所属分组 */
  group: '沙箱 API' | '上下文' | 'K线数据' | '推送渠道' | '整合器' | '内部类型'
}

/**
 * 完整数据类型参考
 * 覆盖整合器沙箱环境中的所有关键类型
 */
const TYPE_REFERENCE: TypeDocEntry[] = [
  // ============================================================
  // 沙箱 API 相关
  // ============================================================
  {
    name: 'IntegratorAPI',
    kind: 'interface',
    source: 'src/types/integrator.ts',
    group: '沙箱 API',
    description: '整合器沙箱中可用的 API 对象，通过全局变量 `api` 访问',
    props: [
      {
        name: 'sendToAllChannels',
        type: '(title: string, message: string) => Promise<void>',
        required: true,
        description: '发送消息到所有已关联的推送渠道',
      },
      {
        name: 'sendToChannel',
        type: '(channelType: ChannelType, title: string, message: string) => Promise<void>',
        required: true,
        description: '发送消息到指定类型的推送渠道',
      },
      {
        name: 'getKlines',
        type: '() => KlineData[]',
        required: true,
        description: '获取当前加载的全部 K 线数据，按时间升序排列',
      },
      {
        name: 'log',
        type: '(...args: unknown[]) => void',
        required: true,
        description: '输出调试日志到浏览器控制台',
      },
    ],
    example: `// api 在沙箱中作为全局变量注入
api.log('当前价格:', context.klines.at(-1)?.close)
await api.sendToAllChannels('提醒', 'BTC 突破关键位')`,
  },

  // ============================================================
  // 上下文相关
  // ============================================================
  {
    name: 'IntegratorContext',
    kind: 'interface',
    source: 'src/types/integrator.ts',
    group: '上下文',
    description: '整合器执行时的输入上下文，通过全局变量 `context` 访问',
    props: [
      {
        name: 'klines',
        type: 'KlineData[]',
        required: true,
        description: '当前交易所/交易对/周期的 K 线数据数组，按时间升序排列',
      },
      {
        name: 'exchangeId',
        type: 'string',
        required: true,
        description: '数据来源的交易所 ID（如 binance, okx, bybit）',
      },
      {
        name: 'symbol',
        type: 'string',
        required: true,
        description: '交易对符号（如 BTC/USDT:USDT, ETH/USDT:USDT）',
      },
      {
        name: 'timeframe',
        type: 'string',
        required: true,
        description: 'K 线时间周期（1m, 5m, 15m, 30m, 1h, 4h, 1d, 1w, 1M）',
      },
    ],
    example: `// 解构获取上下文属性
const { klines, symbol, timeframe } = context
const last = klines[klines.length - 1]
api.log(\`[\${symbol} \${timeframe}] 最新价: \${last.close}\`)`,
  },

  {
    name: 'IntegratorOutput',
    kind: 'interface',
    source: 'src/types/integrator.ts',
    group: '上下文',
    description: '整合器执行后的返回值结构',
    props: [
      { name: 'shouldNotify', type: 'boolean', required: true, description: '是否触发推送通知' },
      { name: 'title', type: 'string', required: false, description: '推送标题' },
      { name: 'message', type: 'string', required: false, description: '推送内容' },
      {
        name: 'data',
        type: 'Record<string, unknown>',
        required: false,
        description: '附加数据（自由扩展）',
      },
    ],
    example: `// 返回值示例
return {
  shouldNotify: true,
  title: '价格突破提醒',
  message: 'BTC 突破 70000',
  data: { level: 'warning' }
}`,
  },

  // ============================================================
  // K线数据相关
  // ============================================================
  {
    name: 'KlineData',
    kind: 'interface',
    source: 'src/types/kline.ts',
    group: 'K线数据',
    description: '单根 OHLCV K 线数据，包含开盘价、最高价、最低价、收盘价和成交量',
    props: [
      {
        name: 'timestamp',
        type: 'number',
        required: true,
        description: 'K 线时间戳（毫秒 Unix 时间）',
      },
      { name: 'open', type: 'number', required: true, description: '开盘价' },
      { name: 'high', type: 'number', required: true, description: '最高价' },
      { name: 'low', type: 'number', required: true, description: '最低价' },
      { name: 'close', type: 'number', required: true, description: '收盘价' },
      { name: 'volume', type: 'number', required: true, description: '成交量（以基础货币计）' },
    ],
    example: `const kline: KlineData = {
  timestamp: 1718150400000,
  open: 67450.0,
  high: 68200.0,
  low: 67200.0,
  close: 67980.5,
  volume: 1234.56,
}`,
  },

  {
    name: 'KlineTimeframe',
    kind: 'type',
    source: 'src/types/kline.ts',
    group: 'K线数据',
    description: 'K 线时间周期，决定每根 K 线覆盖的时间范围',
    unionMembers: ['"1m"', '"5m"', '"15m"', '"30m"', '"1h"', '"4h"', '"1d"', '"1w"', '"1M"'],
    example: `const tf: KlineTimeframe = '1h'`,
  },

  {
    name: 'KlineFetchParams',
    kind: 'interface',
    source: 'src/types/kline.ts',
    group: 'K线数据',
    description: 'K 线数据获取的查询参数（内部使用，非沙箱 API）',
    props: [
      { name: 'exchangeId', type: 'string', required: true, description: '交易所 ID' },
      { name: 'symbol', type: 'string', required: true, description: '交易对' },
      { name: 'timeframe', type: 'KlineTimeframe', required: true, description: '时间周期' },
      { name: 'since', type: 'number', required: false, description: '起始时间戳' },
      {
        name: 'endTime',
        type: 'number',
        required: false,
        description: '结束时间戳（惰性加载历史）',
      },
      { name: 'limit', type: 'number', required: false, description: '返回条数上限' },
    ],
  },

  // ============================================================
  // 推送渠道相关
  // ============================================================
  {
    name: 'ChannelType',
    kind: 'type',
    source: 'src/types/channel.ts',
    group: '推送渠道',
    description: '支持的推送渠道类型，用于 api.sendToChannel 的 channelType 参数',
    unionMembers: ['"dingtalk"', '"feishu"', '"email"', '"custom"'],
    example: `await api.sendToChannel('dingtalk', '提醒', '内容')
await api.sendToChannel('feishu', '提醒', '内容')
await api.sendToChannel('email', '提醒', '内容')
await api.sendToChannel('custom', '提醒', '内容')`,
  },

  {
    name: 'ChannelConfig',
    kind: 'interface',
    source: 'src/types/channel.ts',
    group: '推送渠道',
    description: '推送渠道的完整配置（在设置页面管理，非沙箱 API）',
    props: [
      { name: 'id', type: 'string', required: true, description: '渠道唯一标识' },
      { name: 'type', type: 'ChannelType', required: true, description: '渠道类型' },
      { name: 'name', type: 'string', required: true, description: '渠道名称' },
      { name: 'enabled', type: 'boolean', required: true, description: '是否启用' },
      {
        name: 'config',
        type: 'DingTalkConfig | FeishuConfig | EmailConfig | CustomChannelConfig',
        required: true,
        description: '渠道特定配置',
      },
      { name: 'createdAt', type: 'number', required: true, description: '创建时间戳' },
    ],
  },

  // ============================================================
  // 整合器相关
  // ============================================================
  {
    name: 'Integrator',
    kind: 'interface',
    source: 'src/types/integrator.ts',
    group: '整合器',
    description: '用户创建的数据整合器配置，持久化在 IndexedDB 中',
    props: [
      { name: 'id', type: 'string', required: true, description: '整合器唯一标识（nanoid）' },
      { name: 'name', type: 'string', required: true, description: '整合器名称' },
      { name: 'description', type: 'string', required: true, description: '整合器描述' },
      { name: 'code', type: 'string', required: true, description: '用户编写的过滤/推送代码' },
      {
        name: 'language',
        type: '"javascript" | "typescript"',
        required: true,
        description: '代码语言',
      },
      { name: 'enabled', type: 'boolean', required: true, description: '是否启用' },
      {
        name: 'channelIds',
        type: 'string[]',
        required: true,
        description: '关联的推送渠道 ID 列表',
      },
      { name: 'createdAt', type: 'number', required: true, description: '创建时间戳（毫秒）' },
      { name: 'updatedAt', type: 'number', required: true, description: '最后更新时间戳（毫秒）' },
    ],
  },

  {
    name: 'IntegratorExecutionResult',
    kind: 'interface',
    source: 'src/types/integrator.ts',
    group: '整合器',
    description: '整合器执行结果',
    props: [
      { name: 'integratorId', type: 'string', required: true, description: '执行的整合器 ID' },
      { name: 'success', type: 'boolean', required: true, description: '是否执行成功' },
      {
        name: 'output',
        type: 'IntegratorOutput',
        required: false,
        description: '执行输出（成功时）',
      },
      { name: 'error', type: 'string', required: false, description: '错误信息（失败时）' },
      { name: 'executedAt', type: 'number', required: true, description: '执行时间戳' },
    ],
  },
]

/**
 * 完整 API Schema
 * 当 API 变更时只需修改此处，文档自动更新
 */
const API_SCHEMA: Record<string, APISchemaEntry> = {
  // ---- api.* 方法 ----
  'api.sendToAllChannels': {
    name: 'api.sendToAllChannels',
    type: 'function',
    description: '发送消息到所有已关联的推送渠道（钉钉/飞书/邮箱/自定义）',
    params: [
      { name: 'title', type: 'string', description: '消息标题', required: true },
      { name: 'message', type: 'string', description: '消息内容，支持换行符 \\n', required: true },
    ],
    returns: 'Promise<void>',
    example: `await api.sendToAllChannels('价格提醒', 'BTC 突破 70000 美元')`,
  },

  'api.sendToChannel': {
    name: 'api.sendToChannel',
    type: 'function',
    description: '发送消息到指定类型的推送渠道',
    params: [
      {
        name: 'channelType',
        type: 'ChannelType',
        description: '渠道类型: "dingtalk" | "feishu" | "email" | "custom"',
        required: true,
      },
      { name: 'title', type: 'string', description: '消息标题', required: true },
      { name: 'message', type: 'string', description: '消息内容', required: true },
    ],
    returns: 'Promise<void>',
    example: `await api.sendToChannel('dingtalk', '价格提醒', 'BTC 突破 70000 美元')`,
  },

  'api.getKlines': {
    name: 'api.getKlines',
    type: 'function',
    description: '获取当前加载的全部 K 线数据数组，按时间升序排列',
    params: [],
    returns: 'KlineData[]',
    example: `const klines = api.getKlines()
const lastPrice = klines[klines.length - 1]?.close`,
  },

  'api.log': {
    name: 'api.log',
    type: 'function',
    description: '输出调试日志到浏览器控制台，自动附带整合器名称前缀',
    params: [
      { name: '...args', type: 'any[]', description: '任意数量的输出参数', required: false },
    ],
    returns: 'void',
    example: `api.log('当前价格:', last.close, '时间:', new Date(last.timestamp))`,
  },

  // ---- context.* 属性 ----
  'context.klines': {
    name: 'context.klines',
    type: 'property',
    description:
      '当前 K 线数据数组，每个元素为 OHLCV 格式（timestamp, open, high, low, close, volume），按时间升序排列',
    example: `const last = context.klines[context.klines.length - 1]
const prev = context.klines[context.klines.length - 2]
if (last.close > prev.high) { /* 向上突破 */ }`,
  },

  'context.exchangeId': {
    name: 'context.exchangeId',
    type: 'property',
    description: '当前数据来源的交易所 ID（如 binance, okx, bybit）',
    example: `api.log('当前交易所:', context.exchangeId)`,
  },

  'context.symbol': {
    name: 'context.symbol',
    type: 'property',
    description: '当前交易对符号（如 BTC/USDT:USDT, ETH/USDT:USDT）',
    example: `api.log('交易对:', context.symbol)`,
  },

  'context.timeframe': {
    name: 'context.timeframe',
    type: 'property',
    description: '当前 K 线时间周期（1m, 5m, 15m, 30m, 1h, 4h, 1d, 1w, 1M）',
    example: `api.log('周期:', context.timeframe)`,
  },
}

// ============================================================
// 代码解析
// ============================================================

/** API 使用检测规则 */
interface UsageRule {
  /** 匹配的 API key */
  key: string
  /** 正则表达式 */
  regex: RegExp
}

const USAGE_RULES: UsageRule[] = [
  { key: 'api.sendToAllChannels', regex: /api\.sendToAllChannels\s*\(/g },
  { key: 'api.sendToChannel', regex: /api\.sendToChannel\s*\(/g },
  { key: 'api.getKlines', regex: /api\.getKlines\s*\(/g },
  { key: 'api.log', regex: /api\.log\s*\(/g },
  { key: 'context.klines', regex: /context\.klines|klines(?!\s*=)/g },
  { key: 'context.exchangeId', regex: /context\.exchangeId|exchangeId(?!\s*[=:])/g },
  { key: 'context.symbol', regex: /context\.symbol|(?<!\w)symbol(?!\s*[=:])/g },
  { key: 'context.timeframe', regex: /context\.timeframe|(?<!\w)timeframe(?!\s*[=:])/g },
]

/**
 * 检测整合器代码中使用了哪些 API
 */
function detectUsedApis(code: string): Set<string> {
  const used = new Set<string>()

  // 检测解构赋值：const { klines, symbol, timeframe } = context
  const destructMatch = code.match(/const\s*\{\s*([^}]+)\}\s*=\s*context/)
  if (destructMatch) {
    const props = destructMatch[1]!.split(',').map((p) => p.trim())
    for (const prop of props) {
      const clean = prop.replace(/:.*/, '').trim()
      used.add(`context.${clean}`)
    }
  }

  // 检测直接 API 调用
  for (const rule of USAGE_RULES) {
    // 对于 context 属性，先检查解构后的直接引用
    if (rule.key.startsWith('context.')) {
      const propName = rule.key.replace('context.', '')
      // 检查是否有解构后的直接使用（如单独的 klines, symbol 等变量）
      if (destructMatch) {
        const destructProps = destructMatch[1]!.split(',').map((p) => p.trim().replace(/:.*/, ''))
        if (destructProps.includes(propName)) {
          used.add(rule.key)
          continue
        }
      }
    }

    // 标准正则匹配
    rule.regex.lastIndex = 0
    if (rule.regex.test(code)) {
      used.add(rule.key)
    }
  }

  return used
}

/**
 * 从整合器代码中提取 API 使用示例
 * 返回每个 API 对应的真实代码片段（最多3条）
 */
function extractExamples(code: string, apiKey: string): string[] {
  const examples: string[] = []
  const lines = code.split('\n')

  switch (apiKey) {
    case 'api.sendToAllChannels': {
      for (let i = 0; i < lines.length; i++) {
        if (lines[i]!.includes('api.sendToAllChannels')) {
          // 收集连续的行直到遇到 );
          let snippet = lines[i]!
          let j = i + 1
          while (j < lines.length && !snippet.includes(');') && j - i < 8) {
            snippet += '\n' + lines[j]!
            j++
          }
          // 清理缩进
          examples.push(snippet.trim().replace(/^\s+/, '').replace(/,\s*$/, ''))
        }
        if (examples.length >= 3) break
      }
      break
    }
    case 'api.sendToChannel': {
      for (let i = 0; i < lines.length; i++) {
        if (lines[i]!.includes('api.sendToChannel')) {
          let snippet = lines[i]!
          let j = i + 1
          while (j < lines.length && !snippet.includes(');') && j - i < 8) {
            snippet += '\n' + lines[j]!
            j++
          }
          examples.push(snippet.trim().replace(/^\s+/, '').replace(/,\s*$/, ''))
        }
        if (examples.length >= 3) break
      }
      break
    }
    case 'api.getKlines': {
      for (let i = 0; i < lines.length; i++) {
        if (lines[i]!.includes('api.getKlines')) {
          examples.push(lines[i]!.trim())
        }
        if (examples.length >= 3) break
      }
      break
    }
    case 'api.log': {
      for (let i = 0; i < lines.length; i++) {
        if (lines[i]!.includes('api.log')) {
          examples.push(lines[i]!.trim())
        }
        if (examples.length >= 3) break
      }
      break
    }
    case 'context.klines': {
      // 提取包含 klines 且有操作的代码行
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]!.trim()
        if (
          line.includes('klines') &&
          !line.startsWith('//') &&
          (line.includes('[') || line.includes('.length') || line.includes('slice'))
        ) {
          examples.push(line)
        }
        if (examples.length >= 3) break
      }
      break
    }
    default:
      break
  }

  return examples
}

// ============================================================
// 文档生成
// ============================================================

export interface ApiDocsResult {
  /** 已使用的 API 文档项 */
  used: APIDocItem[]
  /** 可用但未使用的 API 文档项 */
  available: APIDocItem[]
}

/**
 * 根据整合器代码动态生成 API 文档
 *
 * @param code - 整合器的用户代码
 * @returns 分类后的 API 文档项
 */
export function generateApiDocs(code: string): ApiDocsResult {
  const usedApis = detectUsedApis(code)
  const used: APIDocItem[] = []
  const available: APIDocItem[] = []

  for (const [key, schema] of Object.entries(API_SCHEMA)) {
    const realExamples = extractExamples(code, key)

    const docItem: APIDocItem = {
      name: schema.name,
      type: schema.type,
      description: schema.description,
      params: schema.params,
      returns: schema.returns,
      // 优先使用代码中提取的真实示例，否则用默认示例
      example: realExamples.length > 0 ? realExamples.join('\n\n') : schema.example,
    }

    if (usedApis.has(key)) {
      used.push(docItem)
    } else {
      available.push(docItem)
    }
  }

  return { used, available }
}

/**
 * 获取完整的 API Schema（用于展示全部可用 API）
 */
export function getAllApiDocs(): APIDocItem[] {
  return Object.values(API_SCHEMA).map((schema) => ({
    name: schema.name,
    type: schema.type,
    description: schema.description,
    params: schema.params,
    returns: schema.returns,
    example: schema.example,
  }))
}

/**
 * 获取完整的数据类型参考文档
 * 覆盖沙箱环境中的所有关键类型定义
 */
export function getFullTypesReference(): TypeDocEntry[] {
  return TYPE_REFERENCE
}

/**
 * 获取按分组组织的完整数据类型参考
 */
export function getTypesReferenceByGroup(): Map<string, TypeDocEntry[]> {
  const map = new Map<string, TypeDocEntry[]>()
  for (const entry of TYPE_REFERENCE) {
    const group = map.get(entry.group) ?? []
    group.push(entry)
    map.set(entry.group, group)
  }
  return map
}
