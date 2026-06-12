<script setup lang="tsx">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'

defineOptions({ name: 'SettingsPage' })

import {
  NCard,
  NTabs,
  NTabPane,
  NForm,
  NFormItem,
  NSelect,
  NInputNumber,
  NInput,
  NSwitch,
  NButton,
  NSpace,
  NCheckbox,
  NDataTable,
  NModal,
  NPopconfirm,
  NTag,
  NText,
  NUpload,
  NDivider,
  NProgress,
  useMessage,
} from 'naive-ui'
import type { DataTableColumns, UploadFileInfo } from 'naive-ui'
import { useSettingsStore } from '@/stores/settings'
import { useExchangeStore } from '@/stores/exchange'
import { useNotificationStore } from '@/stores/notification'
import { SUPPORTED_LOCALES, LOCALE_LABELS } from '@/i18n'
import { TIMEFRAME_LABELS } from '@/utils/format'
import { formatBytes } from '@/utils/format'
import type { SupportedLocale } from '@/i18n'
import type { ChannelConfig, ChannelType, DingTalkConfig, FeishuConfig, EmailConfig, CustomChannelConfig } from '@/types/channel'
import type { KlineTimeframe } from '@/types/kline'
import { nanoid } from 'nanoid'

const { t } = useI18n()
const message = useMessage()
const settingsStore = useSettingsStore()
const exchangeStore = useExchangeStore()
const notificationStore = useNotificationStore()

// 主题选项
const themeOptions = computed(() => [
  { label: t('settings.themeAuto'), value: 'auto' },
  { label: t('settings.themeLight'), value: 'light' },
  { label: t('settings.themeDark'), value: 'dark' },
])

// 语言选项
const localeOptions = computed(() =>
  SUPPORTED_LOCALES.map((loc) => ({
    label: LOCALE_LABELS[loc],
    value: loc,
  })),
)

// 交易所选项
const exchangeOptions = computed(() =>
  exchangeStore.allExchangeIds.map((id) => ({
    label: id.toUpperCase(),
    value: id,
  })),
)

// 时间周期选项
const timeframeOptions = computed(() =>
  (Object.keys(TIMEFRAME_LABELS) as KlineTimeframe[]).map((tf) => ({
    label: TIMEFRAME_LABELS[tf],
    value: tf,
  })),
)

// 渠道类型选项
const channelTypeOptions: { label: string; value: ChannelType }[] = [
  { label: t('channel.dingtalk'), value: 'dingtalk' },
  { label: t('channel.feishu'), value: 'feishu' },
  { label: t('channel.email'), value: 'email' },
  { label: t('channel.custom'), value: 'custom' },
]

// 渠道弹窗
const showChannelModal = ref(false)
const editingChannel = ref<ChannelConfig | null>(null)
const channelForm = ref({
  type: 'dingtalk' as ChannelType,
  name: '',
  webhookUrl: '',
  secret: '',
  smtpHost: '',
  smtpPort: 465,
  username: '',
  password: '',
  toEmails: '',
  url: '',
  method: 'POST' as 'GET' | 'POST',
  headers: '{}',
  bodyTemplate: '',
})

const dbUsedPercent = computed(() => {
  if (settingsStore.dbUsage.quota === 0) return 0
  return Math.round(
    (settingsStore.dbUsage.used / settingsStore.dbUsage.quota) * 100,
  )
})

// 渠道表格
const channelColumns: DataTableColumns<ChannelConfig> = [
  {
    title: t('settings.channelName'),
    key: 'name',
    width: '30%',
  },
  {
    title: t('settings.channelType'),
    key: 'type',
    width: '25%',
    render: (row) => <NTag>{t(`channel.${row.type}`)}</NTag>,
  },
  {
    title: t('common.actions'),
    key: 'actions',
    width: '35%',
    render: (row) => (
      <NSpace>
        <NButton size="small" onClick={() => editChannel(row)}>
          {t('common.edit')}
        </NButton>
        <NButton size="small" type="error" onClick={() => handleDeleteChannel(row.id)}>
          {t('common.delete')}
        </NButton>
      </NSpace>
    ),
  },
]

function openAddChannel() {
  editingChannel.value = null
  channelForm.value = {
    type: 'dingtalk',
    name: '',
    webhookUrl: '',
    secret: '',
    smtpHost: '',
    smtpPort: 465,
    username: '',
    password: '',
    toEmails: '',
    url: '',
    method: 'POST',
    headers: '{}',
    bodyTemplate: '',
  }
  showChannelModal.value = true
}

function editChannel(channel: ChannelConfig) {
  editingChannel.value = channel
  const config = channel.config as unknown as Record<string, unknown>
  const s = (v: unknown): string => (typeof v === 'string' ? v : '')
  const n = (v: unknown): number => (typeof v === 'number' ? v : 0)
  channelForm.value = {
    type: channel.type,
    name: channel.name,
    webhookUrl: s(config.webhookUrl),
    secret: s(config.secret),
    smtpHost: s(config.smtpHost),
    smtpPort: n(config.smtpPort) || 465,
    username: s(config.username),
    password: s(config.password),
    toEmails: Array.isArray(config.to) ? (config.to as string[]).join(', ') : '',
    url: s(config.url),
    method: (config.method as 'GET' | 'POST' | undefined) || 'POST',
    headers: typeof config.headers === 'object' ? JSON.stringify(config.headers) : '{}',
    bodyTemplate: s(config.bodyTemplate),
  }
  showChannelModal.value = true
}

function buildChannelConfig(): DingTalkConfig | FeishuConfig | EmailConfig | CustomChannelConfig {
  switch (channelForm.value.type) {
    case 'dingtalk':
      return {
        webhookUrl: channelForm.value.webhookUrl,
        secret: channelForm.value.secret || undefined,
      } satisfies DingTalkConfig
    case 'feishu':
      return {
        webhookUrl: channelForm.value.webhookUrl,
        secret: channelForm.value.secret || undefined,
      } satisfies FeishuConfig
    case 'email':
      return {
        smtpHost: channelForm.value.smtpHost,
        smtpPort: channelForm.value.smtpPort,
        username: channelForm.value.username,
        password: channelForm.value.password,
        to: channelForm.value.toEmails.split(',').map((s) => s.trim()).filter(Boolean),
      } satisfies EmailConfig
    case 'custom':
      return {
        url: channelForm.value.url,
        method: channelForm.value.method,
        headers: JSON.parse(channelForm.value.headers || '{}') as Record<string, string>,
        bodyTemplate: channelForm.value.bodyTemplate,
      } satisfies CustomChannelConfig
  }
}

async function handleSaveChannel() {
  const config = buildChannelConfig()
  if (editingChannel.value) {
    const channel: ChannelConfig = {
      ...editingChannel.value,
      type: channelForm.value.type,
      name: channelForm.value.name,
      config,
    }
    await settingsStore.updateChannel(channel)
  } else {
    const channel: ChannelConfig = {
      id: nanoid(),
      type: channelForm.value.type,
      name: channelForm.value.name,
      enabled: true,
      config,
      createdAt: Date.now(),
    }
    await settingsStore.addChannel(channel)
  }
  showChannelModal.value = false
}

async function handleDeleteChannel(id: string) {
  await settingsStore.removeChannel(id)
}

// 导入导出
async function handleExport() {
  const json = await settingsStore.exportData()
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `ccev-settings-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

async function handleImport(options: { file: UploadFileInfo }) {
  const file = options.file.file
  if (!file) return
  try {
    const text = await file.text()
    await settingsStore.importData(text)
    message.success(t('settings.importSuccess'))
  } catch {
    message.error(t('settings.importError'))
  }
}

async function handleClearKlineCache() {
  await settingsStore.clearKlineCache()
  message.success(t('settings.clearKlineCacheSuccess'))
}

/** 清空所有通知 */
async function handleClearNotifications() {
  await notificationStore.clearAll()
  message.success(t('settings.clearNotificationsSuccess'))
}

// 交易所切换
function isExchangeEnabled(id: string): boolean {
  return settingsStore.enabledExchanges.includes(id)
}

function toggleExchangeEnabled(id: string, enabled: boolean) {
  if (enabled && !isExchangeEnabled(id)) {
    settingsStore.toggleExchange(id)
  } else if (!enabled && isExchangeEnabled(id)) {
    settingsStore.toggleExchange(id)
  }
}

onMounted(async () => {
  await exchangeStore.initExchanges()
  await settingsStore.refreshStorageUsage()
})
</script>

<template>
  <div class="settings-page">
    <h1>{{ t('settings.title') }}</h1>

    <NTabs type="line" animated>
      <!-- 通用设置 -->
      <NTabPane :tab="t('settings.general')" name="general">
        <NCard>
          <NForm label-placement="left" label-width="160">
            <NFormItem :label="t('settings.language')">
              <NSelect
                :value="settingsStore.settings.locale"
                :options="localeOptions"
                style="width: 100%"
                @update:value="(v: SupportedLocale) => settingsStore.setLanguage(v)"
              />
            </NFormItem>
            <NFormItem :label="t('settings.theme')">
              <NSelect
                :value="settingsStore.settings.theme"
                :options="themeOptions"
                style="width: 100%"
                @update:value="(v: any) => settingsStore.setTheme(v)"
              />
            </NFormItem>
            <NFormItem :label="t('settings.defaultExchange')">
              <NSelect
                :value="settingsStore.settings.defaultExchange"
                :options="exchangeOptions"
                style="width: 100%"
                @update:value="(v: string) => settingsStore.updateSettings({ defaultExchange: v })"
              />
            </NFormItem>
            <NFormItem :label="t('settings.defaultTimeframe')">
              <NSelect
                :value="settingsStore.settings.defaultTimeframe"
                :options="timeframeOptions"
                style="width: 100%"
                @update:value="(v: string) => settingsStore.updateSettings({ defaultTimeframe: v })"
              />
            </NFormItem>
          </NForm>
        </NCard>
      </NTabPane>

      <!-- 交易所 -->
      <NTabPane :tab="t('settings.exchanges')" name="exchanges">
        <NCard>
          <NSpace vertical size="medium">
            <NSpace>
              <NButton
                size="small"
                @click="
                  settingsStore.updateSettings({
                    enabledExchanges: [...exchangeStore.allExchangeIds],
                  })
                "
              >
                {{ t('settings.enableAll') }}
              </NButton>
              <NButton size="small" @click="settingsStore.updateSettings({ enabledExchanges: [] })">
                {{ t('settings.disableAll') }}
              </NButton>
            </NSpace>
            <NSpace vertical>
              <NCheckbox
                v-for="id in exchangeStore.allExchangeIds"
                :key="id"
                :checked="isExchangeEnabled(id)"
                @update:checked="(v: boolean) => toggleExchangeEnabled(id, v)"
              >
                {{ id.toUpperCase() }}
              </NCheckbox>
            </NSpace>
          </NSpace>
        </NCard>
      </NTabPane>

      <!-- 通知渠道 -->
      <NTabPane :tab="t('settings.channels')" name="channels">
        <NCard>
          <NSpace vertical size="medium">
            <NButton type="primary" @click="openAddChannel">
              {{ t('settings.addChannel') }}
            </NButton>
            <NDataTable
              v-if="settingsStore.channels.length > 0"
              :columns="channelColumns"
              :data="settingsStore.channels"
              :bordered="false"
            />
            <NText v-else depth="3">{{ t('common.noData') }}</NText>
          </NSpace>
        </NCard>
      </NTabPane>

      <!-- 缓存设置 -->
      <NTabPane :tab="t('settings.cache')" name="cache">
        <NCard>
          <NForm label-placement="left" label-width="200">
            <NFormItem :label="t('settings.maxKlineCount')">
              <NInputNumber
                :value="settingsStore.cacheSettings.maxKlineCount"
                :min="100"
                :max="10000"
                style="width: 100%"
                @update:value="(v: number | null) => v && settingsStore.updateCacheSettings({ maxKlineCount: v })"
              />
            </NFormItem>
            <NFormItem :label="t('settings.ttl')">
              <NInputNumber
                :value="Math.round(settingsStore.cacheSettings.ttl / (24 * 60 * 60 * 1000))"
                :min="1"
                :max="90"
                style="width: 100%"
                @update:value="(v: number | null) => v && settingsStore.updateCacheSettings({ ttl: v * 24 * 60 * 60 * 1000 })"
              />
            </NFormItem>
            <NFormItem :label="t('settings.maxDbSize')">
              <NInputNumber
                :value="Math.round(settingsStore.cacheSettings.maxDbSize / (1024 * 1024))"
                :min="50"
                :max="2000"
                style="width: 100%"
                @update:value="(v: number | null) => v && settingsStore.updateCacheSettings({ maxDbSize: v * 1024 * 1024 })"
              />
            </NFormItem>
            <NFormItem :label="t('settings.notificationTtl')">
              <NInputNumber
                :value="settingsStore.cacheSettings.notificationTtlDays"
                :min="1"
                :max="365"
                style="width: 100%"
                @update:value="(v: number | null) => v !== null && settingsStore.updateCacheSettings({ notificationTtlDays: v })"
              />
            </NFormItem>
          </NForm>
        </NCard>
      </NTabPane>

      <!-- 数据获取设置 -->
      <NTabPane :tab="t('settings.data')" name="data">
        <NCard>
          <NForm label-placement="left" label-width="200">
            <NFormItem :label="t('settings.pageSize')">
              <NInputNumber
                :value="settingsStore.fetcherSettings.pageSize"
                :min="50"
                :max="1000"
                style="width: 100%"
                @update:value="(v: number | null) => v && settingsStore.updateFetcherSettings({ pageSize: v })"
              />
            </NFormItem>
            <NFormItem :label="t('settings.autoPageInterval')">
              <NInputNumber
                :value="settingsStore.fetcherSettings.autoPageInterval"
                :min="500"
                :max="10000"
                :step="500"
                style="width: 100%"
                @update:value="(v: number | null) => v && settingsStore.updateFetcherSettings({ autoPageInterval: v })"
              />
            </NFormItem>
            <NFormItem :label="t('settings.enableWs')">
              <NSwitch
                :value="settingsStore.fetcherSettings.enableWs"
                @update:value="(v: boolean) => settingsStore.updateFetcherSettings({ enableWs: v })"
              />
            </NFormItem>
            <NFormItem :label="t('settings.timeout')">
              <NInputNumber
                :value="settingsStore.fetcherSettings.timeout"
                :min="1000"
                :max="30000"
                :step="1000"
                style="width: 100%"
                @update:value="(v: number | null) => v && settingsStore.updateFetcherSettings({ timeout: v })"
              />
            </NFormItem>
          </NForm>
        </NCard>
      </NTabPane>

      <!-- 导入导出 -->
      <NTabPane :tab="t('settings.importExport')" name="importExport">
        <NCard>
          <NSpace vertical size="large">
            <!-- 数据库使用情况 -->
            <div>
              <NText strong>{{ t('settings.dbUsage') }}</NText>
              <NProgress
                :percentage="dbUsedPercent"
                :indicator-placement="'inside'"
                style="margin-top: 8px"
              />
              <NSpace style="margin-top: 4px">
                <NText depth="3">
                  {{ t('settings.dbUsed') }}: {{ formatBytes(settingsStore.dbUsage.used) }}
                </NText>
                <NText depth="3">
                  {{ t('settings.dbAvailable') }}: {{ formatBytes(settingsStore.dbUsage.quota) }}
                </NText>
              </NSpace>
              <NPopconfirm @positive-click="handleClearKlineCache">
                <template #trigger>
                  <NButton size="small" type="warning" style="margin-top: 8px">
                    {{ t('settings.clearKlineCache') }}
                  </NButton>
                </template>
                {{ t('settings.clearKlineCacheConfirm') }}
              </NPopconfirm>
              <NPopconfirm @positive-click="handleClearNotifications">
                <template #trigger>
                  <NButton size="small" type="error" style="margin-top: 8px; margin-left: 8px">
                    {{ t('settings.clearNotifications') }}
                  </NButton>
                </template>
                {{ t('settings.clearNotificationsConfirm') }}
              </NPopconfirm>
            </div>

            <NDivider />

            <NSpace>
              <NButton type="primary" @click="handleExport">
                {{ t('settings.exportSettings') }}
              </NButton>
              <NUpload
                :show-file-list="false"
                accept=".json"
                @update:file-list="(files: UploadFileInfo[]) => files.length && handleImport({ file: files[0]! })"
              >
                <NButton>{{ t('settings.importSettings') }}</NButton>
              </NUpload>
              <NPopconfirm @positive-click="settingsStore.resetToDefault()">
                <template #trigger>
                  <NButton type="error">{{ t('settings.resetToDefault') }}</NButton>
                </template>
                {{ t('settings.confirmReset') }}
              </NPopconfirm>
            </NSpace>
          </NSpace>
        </NCard>
      </NTabPane>
    </NTabs>

    <!-- 渠道弹窗 -->
    <NModal
      v-model:show="showChannelModal"
      preset="card"
      :title="editingChannel ? t('common.edit') : t('settings.addChannel')"
      style="width: min(600px, 90vw)"
      :mask-closable="false"
    >
      <NForm label-placement="left" label-width="120">
        <NFormItem :label="t('settings.channelType')" required>
          <NSelect
            v-model:value="channelForm.type"
            :options="channelTypeOptions"
            :disabled="!!editingChannel"
          />
        </NFormItem>
        <NFormItem :label="t('settings.channelName')" required>
          <NInput v-model:value="channelForm.name" />
        </NFormItem>

        <!-- 钉钉/飞书 -->
        <template v-if="channelForm.type === 'dingtalk' || channelForm.type === 'feishu'">
          <NFormItem :label="t('settings.webhookUrl')" required>
            <NInput v-model:value="channelForm.webhookUrl" />
          </NFormItem>
          <NFormItem :label="t('settings.secret')">
            <NInput v-model:value="channelForm.secret" />
          </NFormItem>
        </template>

        <!-- 邮箱 -->
        <template v-if="channelForm.type === 'email'">
          <NFormItem :label="t('settings.smtpHost')" required>
            <NInput v-model:value="channelForm.smtpHost" />
          </NFormItem>
          <NFormItem :label="t('settings.smtpPort')" required>
            <NInputNumber v-model:value="channelForm.smtpPort" :min="1" :max="65535" />
          </NFormItem>
          <NFormItem :label="t('settings.username')" required>
            <NInput v-model:value="channelForm.username" />
          </NFormItem>
          <NFormItem :label="t('settings.password')" required>
            <NInput v-model:value="channelForm.password" type="password" />
          </NFormItem>
          <NFormItem :label="t('settings.toEmails')" required>
            <NInput v-model:value="channelForm.toEmails" />
          </NFormItem>
        </template>

        <!-- 自定义 -->
        <template v-if="channelForm.type === 'custom'">
          <NFormItem :label="t('settings.url')" required>
            <NInput v-model:value="channelForm.url" />
          </NFormItem>
          <NFormItem :label="t('settings.method')" required>
            <NSelect
              v-model:value="channelForm.method"
              :options="[
                { label: 'GET', value: 'GET' },
                { label: 'POST', value: 'POST' },
              ]"
            />
          </NFormItem>
          <NFormItem :label="t('settings.headers')">
            <NInput v-model:value="channelForm.headers" type="textarea" />
          </NFormItem>
          <NFormItem :label="t('settings.bodyTemplate')">
            <NInput v-model:value="channelForm.bodyTemplate" type="textarea" />
          </NFormItem>
        </template>
      </NForm>
      <template #footer>
        <NSpace justify="end">
          <NButton @click="showChannelModal = false">
            {{ t('common.cancel') }}
          </NButton>
          <NButton type="primary" @click="handleSaveChannel">
            {{ t('common.save') }}
          </NButton>
        </NSpace>
      </template>
    </NModal>
  </div>
</template>

<style scoped>
.settings-page {
  width: 100%;
  max-width: 95vw;
}

.settings-page h1 {
  font-size: 24px;
  margin-bottom: 16px;
}
</style>
