/** 推送渠道类型 */
export type ChannelType = 'dingtalk' | 'feishu' | 'email' | 'custom'

/** 渠道配置 */
export interface ChannelConfig {
  id: string
  type: ChannelType
  name: string
  enabled: boolean
  /** 渠道特定配置 */
  config: DingTalkConfig | FeishuConfig | EmailConfig | CustomChannelConfig
  createdAt: number
}

/** 钉钉机器人配置 */
export interface DingTalkConfig {
  webhookUrl: string
  secret?: string
}

/** 飞书机器人配置 */
export interface FeishuConfig {
  webhookUrl: string
  secret?: string
}

/** 邮箱配置 */
export interface EmailConfig {
  smtpHost: string
  smtpPort: number
  username: string
  password: string
  to: string[]
}

/** 自定义渠道配置 */
export interface CustomChannelConfig {
  url: string
  method: 'GET' | 'POST'
  headers: Record<string, string>
  bodyTemplate: string
}

/** 渠道类型元数据 */
export interface ChannelTypeMeta {
  type: ChannelType
  label: string
  description: string
  icon: string
}
