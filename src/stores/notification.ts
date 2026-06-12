import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { db } from '@/db'
import type { NotificationRecord, CreateNotificationInput } from '@/types/notification'
import { nanoid } from 'nanoid'

export const useNotificationStore = defineStore('notification', () => {
  const notifications = ref<NotificationRecord[]>([])
  const total = ref(0)
  const loading = ref(false)
  const totalUnread = ref(0)
  const pageSize = 50

  const unreadCount = computed(() => notifications.value.filter((n) => !n.read).length)

  /** 从 DB 查询全局未读总数 */
  async function fetchTotalUnread() {
    try {
      totalUnread.value = await db.notifications.where('read').equals(0).count()
    } catch (err) {
      console.error('[NotificationStore] 查询未读总数失败:', err)
    }
  }

  /** 加载通知列表（分页） */
  async function loadNotifications(
    offset: number,
    sortField?: string,
    sortOrder?: 'ascend' | 'descend',
  ) {
    loading.value = true
    try {
      const result = await db.getNotifications(offset, pageSize, sortField, sortOrder)
      notifications.value = result.items
      total.value = result.total
    } catch (err) {
      console.error('[NotificationStore] 加载通知失败:', err)
      notifications.value = []
      total.value = 0
    } finally {
      loading.value = false
    }
  }

  /** 发送一条通知 */
  async function sendNotification(input: CreateNotificationInput) {
    const record: NotificationRecord = {
      id: nanoid(),
      timestamp: Date.now(),
      type: input.type,
      source: input.source,
      title: input.title,
      content: input.content,
      read: 0,
      integratorId: input.integratorId,
      channelId: input.channelId,
    }
    try {
      await db.putNotification(record)
      totalUnread.value++
    } catch (err) {
      console.error('[NotificationStore] 保存通知失败:', err)
    }
  }

  /** 标记为已读 */
  async function markRead(id: string) {
    try {
      await db.markNotificationRead(id)
      const item = notifications.value.find((n) => n.id === id)
      if (item) {
        item.read = 1
        if (totalUnread.value > 0) totalUnread.value--
      }
    } catch (err) {
      console.error('[NotificationStore] 标记已读失败:', err)
    }
  }

  /** 标记全部为已读 */
  async function markAllRead() {
    try {
      await db.markAllNotificationsRead()
      notifications.value.forEach((n) => {
        n.read = 1
      })
      totalUnread.value = 0
    } catch (err) {
      console.error('[NotificationStore] 标记全部已读失败:', err)
    }
  }

  /** 清空所有通知 */
  async function clearAll() {
    try {
      await db.clearNotifications()
      notifications.value = []
      total.value = 0
      totalUnread.value = 0
    } catch (err) {
      console.error('[NotificationStore] 清空通知失败:', err)
    }
  }

  /** 清理过期通知 */
  async function cleanExpired(ttlDays: number) {
    try {
      await db.cleanExpiredNotifications(ttlDays)
    } catch (err) {
      console.error('[NotificationStore] 清理过期通知失败:', err)
    }
  }

  return {
    notifications,
    total,
    loading,
    unreadCount,
    totalUnread,
    pageSize,
    loadNotifications,
    sendNotification,
    markRead,
    markAllRead,
    clearAll,
    cleanExpired,
    fetchTotalUnread,
  }
})
