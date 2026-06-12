import type { ChannelType } from './channel'
import type { KlineData } from './kline'

/** 数据整合器定义 */
export interface Integrator {
  id: string
  name: string
  description: string
  /** 用户编写的过滤代码 */
  code: string
  /** 代码语言 */
  language: 'javascript' | 'typescript'
  /** 启用状态 */
  enabled: boolean
  /** 关联的推送渠道 ID 列表 */
  channelIds: string[]
  /** 创建时间 */
  createdAt: number
  /** 更新时间 */
  updatedAt: number
}

/** 整合器输入上下文 */
export interface IntegratorContext {
  /** 当前K线数据 */
  klines: KlineData[]
  /** 交易所 ID */
  exchangeId: string
  /** 交易对 */
  symbol: string
  /** 时间周期 */
  timeframe: string
}

/** 整合器输出 */
export interface IntegratorOutput {
  /** 是否触发推送 */
  shouldNotify: boolean
  /** 推送标题 */
  title?: string
  /** 推送内容 */
  message?: string
  /** 附加数据 */
  data?: Record<string, unknown>
}

/** 整合器沙箱 API */
export interface IntegratorAPI {
  /** 发送通知到指定渠道 */
  sendToChannel: (channelType: ChannelType, title: string, message: string) => Promise<void>
  /** 发送通知到所有关联渠道 */
  sendToAllChannels: (title: string, message: string) => Promise<void>
  /** 获取当前K线数据 */
  getKlines: () => KlineData[]
  /** 日志输出 */
  log: (...args: unknown[]) => void
}

/** 整合器执行结果 */
export interface IntegratorExecutionResult {
  integratorId: string
  success: boolean
  output?: IntegratorOutput
  error?: string
  executedAt: number
}

/** 整合器 API 文档项 */
export interface APIDocItem {
  name: string
  type: 'function' | 'property' | 'class'
  description: string
  params?: APIParamDoc[]
  returns?: string
  example?: string
}

export interface APIParamDoc {
  name: string
  type: string
  description: string
  required: boolean
}
