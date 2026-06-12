<script setup lang="tsx">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'

defineOptions({ name: 'NotificationsPage' })

import {
  NCard,
  NDataTable,
  NTag,
  NButton,
  NSpace,
  NEmpty,
  NSpin,
  NText,
} from 'naive-ui'
import type { DataTableColumns, DataTableSortState } from 'naive-ui'
import { useNotificationStore } from '@/stores/notification'
import type { NotificationRecord } from '@/types/notification'
import { formatTimestamp } from '@/utils/format'

const { t } = useI18n()
const store = useNotificationStore()

const sortState = ref<DataTableSortState | null>(null)

const typeColorMap: Record<string, 'default' | 'success' | 'warning' | 'error' | 'info' | 'primary'> = {
  info: 'info',
  success: 'success',
  warning: 'warning',
  error: 'error',
}

const sourceLabelMap: Record<string, string> = {
  integrator: t('notification.sourceIntegrator'),
  system: t('notification.sourceSystem'),
  channel: t('notification.sourceChannel'),
}

const columns: DataTableColumns<NotificationRecord> = [
  {
    title: t('notification.type'),
    key: 'type',
    width: '10%',
    sorter: true,
    render: (row) => (
      <NTag type={typeColorMap[row.type] ?? 'default'} size="small" bordered={false}>
        {t(`notification.type${row.type.charAt(0).toUpperCase() + row.type.slice(1)}`)}
      </NTag>
    ),
  },
  {
    title: t('notification.source'),
    key: 'source',
    width: '12%',
    sorter: true,
    render: (row) => (
      <NText depth="3">{sourceLabelMap[row.source] ?? row.source}</NText>
    ),
  },
  {
    title: t('notification.title'),
    key: 'title',
    width: '20%',
    ellipsis: { tooltip: true },
  },
  {
    title: t('notification.content'),
    key: 'content',
    ellipsis: { tooltip: true },
  },
  {
    title: t('notification.time'),
    key: 'timestamp',
    width: '18%',
    sorter: true,
    defaultSortOrder: 'descend',
    render: (row) => (
      <NText depth="3">{formatTimestamp(row.timestamp)}</NText>
    ),
  },
  {
    title: t('notification.status'),
    key: 'read',
    width: '10%',
    sorter: true,
    render: (row) => (
      <NTag type={row.read ? 'default' : 'info'} size="small" bordered={false}>
        {row.read ? t('notification.read') : t('notification.unread')}
      </NTag>
    ),
  },
  {
    title: t('common.actions'),
    key: 'actions',
    width: '12%',
    render: (row) => (
      <NSpace>
        {!row.read && (
          <NButton size="tiny" quaternary onClick={() => store.markRead(row.id)}>
            {t('notification.markRead')}
          </NButton>
        )}
      </NSpace>
    ),
  },
]

const pagination = computed(() => ({
  pageSize: store.pageSize,
  itemCount: store.total,
}))

const rowKey = (row: NotificationRecord) => row.id

/** 处理排序变化 */
function handleSorterChange(s: DataTableSortState | null) {
  sortState.value = s
  const sortField = s
    ? typeof s === 'object' && 'columnKey' in s
      ? (s.columnKey as string)
      : undefined
    : undefined
  const sortOrder = s
    ? typeof s === 'object' && 'order' in s
      ? (s.order as 'ascend' | 'descend' | false) || undefined
      : undefined
    : undefined
  store.loadNotifications(0, sortField, sortOrder)
}

/** 分页变化 */
function handlePageChange(page: number) {
  const offset = (page - 1) * store.pageSize
  const sortField =
    sortState.value &&
    typeof sortState.value === 'object' &&
    'columnKey' in sortState.value
      ? (sortState.value.columnKey as string)
      : undefined
  const sortOrder =
    sortState.value &&
    typeof sortState.value === 'object' &&
    'order' in sortState.value
      ? sortOrderValue(sortState.value.order)
      : undefined
  store.loadNotifications(offset, sortField, sortOrder)
}

function sortOrderValue(
  order: 'ascend' | 'descend' | false,
): 'ascend' | 'descend' | undefined {
  return order || undefined
}

onMounted(() => {
  store.loadNotifications(0, 'timestamp', 'descend')
})
</script>

<template>
  <div class="notifications-page">
    <div class="page-header">
      <h1>{{ t('notification.title') }}</h1>
      <NSpace>
        <NButton size="small" :disabled="store.unreadCount === 0" @click="store.markAllRead()">
          {{ t('notification.markAllRead') }}
        </NButton>
        <NButton
          size="small"
          type="warning"
          :disabled="store.total === 0"
          @click="store.clearAll()"
        >
          {{ t('notification.clearAll') }}
        </NButton>
      </NSpace>
    </div>

    <NCard>
      <NSpin :show="store.loading">
        <NDataTable
          v-if="store.total > 0"
          :columns="columns"
          :data="store.notifications"
          :row-key="rowKey"
          :pagination="pagination"
          :virtual-scroll="true"
          :max-height="'calc(100vh - 220px)'"
          :bordered="false"
          remote
          @update:sorter="handleSorterChange"
          @update:page="handlePageChange"
        />
        <NEmpty v-else :description="t('notification.empty')" style="padding: 48px 0" />
      </NSpin>
    </NCard>
  </div>
</template>

<style scoped>
.notifications-page {
  width: 100%;
  max-width: 95vw;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.page-header h1 {
  font-size: 24px;
  margin: 0;
}
</style>
