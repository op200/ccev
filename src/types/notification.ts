/** 通知类型 */
export type NotificationType = 'info' | 'success' | 'warning' | 'error'

/** 通知来源 */
export type NotificationSource = 'integrator' | 'system' | 'channel'

/** 通知记录 */
export interface NotificationRecord {
  /** 唯一标识（nanoid） */
  id: string
  /** 通知时间戳 */
  timestamp: number
  /** 通知类型 */
  type: NotificationType
  /** 通知来源 */
  source: NotificationSource
  /** 通知标题 */
  title: string
  /** 通知内容 */
  content: string
  /** 是否已读 */
  read: boolean
  /** 关联的整合器 ID（可选） */
  integratorId?: string
  /** 关联的渠道 ID（可选） */
  channelId?: string
}

/** 通知 TTL 默认值（天） */
export const DEFAULT_NOTIFICATION_TTL_DAYS = 30

/** 创建通知的输入参数 */
export interface CreateNotificationInput {
  type: NotificationType
  source: NotificationSource
  title: string
  content: string
  integratorId?: string
  channelId?: string
}
