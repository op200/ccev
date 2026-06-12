<script setup lang="tsx">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'

defineOptions({ name: 'IntegratorPage' })

import {
  NCard,
  NButton,
  NModal,
  NForm,
  NFormItem,
  NInput,
  NSelect,
  NDataTable,
  NSpace,
  NPopconfirm,
  NTag,
  NEmpty,
  NSpin,
  NSwitch,
  NAlert,
  NDivider,
  NGi,
  NGrid,
  NResult,
  useMessage,
} from 'naive-ui'
import type { DataTableColumns } from 'naive-ui'
import { useIntegratorStore } from '@/stores/integrator'
import { useSettingsStore } from '@/stores/settings'
import { useNotificationStore } from '@/stores/notification'
import CodeEditor from '@/components/editor/CodeEditor.vue'
import type { Integrator, IntegratorContext } from '@/types/integrator'

const { t } = useI18n()
const message = useMessage()
const integratorStore = useIntegratorStore()
const settingsStore = useSettingsStore()
const notificationStore = useNotificationStore()

// ============================================================
// 弹窗状态
// ============================================================

const showModal = ref(false)
const editingIntegrator = ref<Integrator | null>(null)
const saving = ref(false)

const defaultCode = `// 在这里编写你的数据整合逻辑
// 可用变量：
//   context.klines - 当前K线数据数组
//   context.exchangeId - 交易所ID
//   context.symbol - 交易对
//   context.timeframe - 时间周期
// 可用API：
//   api.sendToAllChannels(title, message)
//   api.sendToChannel(channelType, title, message)
//   api.log(...args)
`

const formData = ref({
  name: '',
  description: '',
  code: defaultCode,
  language: 'javascript' as 'javascript' | 'typescript',
  channelIds: [] as string[],
})

// ============================================================
// 执行结果状态
// ============================================================

const executingId = ref<string | null>(null)
const showResult = ref(false)
const execResult = ref<{ success: boolean; output?: string; error?: string } | null>(null)

// ============================================================
// 计算属性
// ============================================================

const channelOptions = computed(() =>
  settingsStore.channels.map((c) => ({
    label: `${c.name} (${t(`channel.${c.type}`)})`,
    value: c.id,
  })),
)

const languageOptions = [
  { label: 'JavaScript', value: 'javascript' as const },
  { label: 'TypeScript', value: 'typescript' as const },
]

const hasChannels = computed(() => channelOptions.value.length > 0)

// ============================================================
// 表格列定义
// ============================================================

const columns: DataTableColumns<Integrator> = [
  { title: t('integrator.name'), key: 'name', width: '18%' },
  { title: t('integrator.description'), key: 'description', ellipsis: true, minWidth: 120 },
  {
    title: t('integrator.language'),
    key: 'language',
    width: '10%',
    render: (row) => <NTag size="small">{row.language}</NTag>,
  },
  {
    title: t('integrator.channels'),
    key: 'channelIds',
    width: '8%',
    render: (row) => (
      <NTag size="small" type={row.channelIds.length > 0 ? 'success' : 'default'}>
        {row.channelIds.length}
      </NTag>
    ),
  },
  {
    title: t('integrator.enabled'),
    key: 'enabled',
    width: '7%',
    render: (row) => (
      <NSwitch
        size="small"
        value={row.enabled}
        onUpdateValue={(val: boolean) => handleToggle(row.id, val)}
      />
    ),
  },
  {
    title: t('common.actions'),
    key: 'actions',
    width: '25%',
    render: (row) => (
      <NSpace wrap={false}>
        <NButton size="small" onClick={() => openEdit(row)}>
          {t('common.edit')}
        </NButton>
        <NButton
          size="small"
          type="warning"
          loading={executingId.value === row.id}
          onClick={() => handleRun(row)}
        >
          {t('integrator.run')}
        </NButton>
        <NPopconfirm onPositiveClick={() => handleDelete(row.id)}>
          {{
            trigger: () => (
              <NButton size="small" type="error">
                {t('common.delete')}
              </NButton>
            ),
            default: () => t('integrator.confirmDelete'),
          }}
        </NPopconfirm>
      </NSpace>
    ),
  },
]

// ============================================================
// CRUD 操作
// ============================================================

function openCreate() {
  editingIntegrator.value = null
  formData.value = {
    name: '',
    description: '',
    code: defaultCode,
    language: 'javascript',
    channelIds: [],
  }
  execResult.value = null
  showResult.value = false
  showModal.value = true
}

function openEdit(integrator: Integrator) {
  editingIntegrator.value = integrator
  formData.value = {
    name: integrator.name,
    description: integrator.description,
    code: integrator.code,
    language: integrator.language,
    channelIds: [...integrator.channelIds],
  }
  execResult.value = null
  showResult.value = false
  showModal.value = true
}

async function handleSave() {
  const name = formData.value.name.trim()
  const code = formData.value.code.trim()
  if (!name || !code) {
    message.warning(t('integrator.nameCodeRequired'))
    return
  }

  saving.value = true
  try {
    if (editingIntegrator.value) {
      await integratorStore.updateIntegrator(editingIntegrator.value.id, {
        name,
        description: formData.value.description.trim(),
        code,
        language: formData.value.language,
        channelIds: formData.value.channelIds,
      })
      message.success(t('integrator.updateSuccess'))
    } else {
      await integratorStore.createIntegrator({
        name,
        description: formData.value.description.trim(),
        code,
        language: formData.value.language,
        channelIds: formData.value.channelIds,
      })
      message.success(t('integrator.createSuccess'))
    }
    showModal.value = false
  } catch (err) {
    message.error(String(err))
  } finally {
    saving.value = false
  }
}

async function handleDelete(id: string) {
  await integratorStore.deleteIntegrator(id)
  message.success(t('integrator.deleteSuccess'))
}

async function handleToggle(id: string, enabled: boolean) {
  await integratorStore.updateIntegrator(id, { enabled })
}

// ============================================================
// 通知测试
// ============================================================

function handleNotificationTest() {
  const now = new Date().toLocaleString()
  const title = t('integrator.notificationTestTitle')
  const content = t('integrator.notificationTestContent', { time: now })
  // 持久化到 IndexedDB 通知历史，导航栏显示未读红点
  notificationStore.sendNotification({
    type: 'info',
    source: 'system',
    title,
    content,
  })
  message.success(t('integrator.notificationTestSent'))
}

// ============================================================
// 运行整合器
// ============================================================

async function handleRun(integrator: Integrator) {
  executingId.value = integrator.id
  try {
    const context: IntegratorContext = {
      klines: [],
      exchangeId: 'binance',
      symbol: 'BTC/USDT',
      timeframe: '1h',
    }
    const result = await integratorStore.executeIntegrator(integrator.id, context)
    execResult.value = {
      success: result.success,
      output: result.output ? JSON.stringify(result.output, null, 2) : undefined,
      error: result.error,
    }
    showResult.value = true
  } catch (err) {
    execResult.value = { success: false, error: String(err) }
    showResult.value = true
  } finally {
    executingId.value = null
  }
}

// ============================================================
// 初始化
// ============================================================

onMounted(() => {
  integratorStore.loadIntegrators()

  // 注入通知回调：整合器调用 api.sendToAllChannels 时持久化到 DB，导航栏显示未读红点
  integratorStore.setNotificationHandler((title: string, content: string) => {
    notificationStore.sendNotification({
      type: 'info',
      source: 'integrator',
      title,
      content,
    })
  })
})
</script>

<template>
  <div class="integrator-page">
    <NSpace vertical size="large">
      <!-- 页头 -->
      <div class="page-header">
        <h1 class="page-title">{{ t('integrator.title') }}</h1>
        <NSpace>
          <NButton secondary @click="handleNotificationTest">
            {{ t('integrator.notificationTest') }}
          </NButton>
          <NButton type="primary" @click="openCreate">
            {{ t('integrator.create') }}
          </NButton>
        </NSpace>
      </div>

      <!-- 渠道未配置提示 -->
      <NAlert
        v-if="!hasChannels && integratorStore.integrators.length > 0"
        type="warning"
        :title="t('integrator.noChannelWarning')"
        closable
      />

      <!-- 加载状态 -->
      <NSpin v-if="integratorStore.loading" />

      <!-- 整合器列表 -->
      <NCard v-else-if="integratorStore.integrators.length > 0">
        <NDataTable
          :columns="columns"
          :data="integratorStore.integrators"
          :bordered="false"
          :single-line="false"
          striped
          size="small"
          scroll-x="{780}"
        />
      </NCard>

      <!-- 空状态 -->
      <NEmpty v-else :description="t('integrator.noIntegrator')">
        <template #extra>
          <NButton type="primary" @click="openCreate">
            {{ t('integrator.create') }}
          </NButton>
        </template>
      </NEmpty>

      <!-- 运行结果面板 -->
      <NCard v-if="showResult && execResult" :title="t('integrator.runResult')">
        <template #header-extra>
          <NButton size="small" text @click="showResult = false">
            {{ t('common.close') }}
          </NButton>
        </template>
        <NResult
          :status="execResult.success ? 'success' : 'error'"
          :title="execResult.success ? t('common.success') : t('common.error')"
        >
          <template v-if="execResult.output" #footer>
            <NInput
              type="textarea"
              readonly
              :value="execResult.output"
              :autosize="{ minRows: 2, maxRows: 8 }"
            />
          </template>
          <template v-if="execResult.error">
            <p class="exec-error">{{ execResult.error }}</p>
          </template>
        </NResult>
      </NCard>

      <!-- 创建/编辑弹窗 -->
      <NModal
        v-model:show="showModal"
        preset="card"
        :title="editingIntegrator ? t('integrator.edit') : t('integrator.create')"
        style="width: min(960px, 95vw)"
        :mask-closable="false"
        @after-enter="() => {}"
      >
        <NForm label-placement="top" :show-feedback="false">
          <NGrid :cols="2" :x-gap="16" responsive="screen">
            <NGi :span="2">
              <NFormItem :label="t('integrator.name')" required>
                <NInput
                  v-model:value="formData.name"
                  :placeholder="t('integrator.namePlaceholder')"
                  maxlength="50"
                  show-count
                />
              </NFormItem>
            </NGi>
            <NGi :span="2">
              <NFormItem :label="t('integrator.description')">
                <NInput
                  v-model:value="formData.description"
                  type="textarea"
                  :placeholder="t('integrator.descriptionPlaceholder')"
                  :autosize="{ minRows: 2, maxRows: 4 }"
                  maxlength="200"
                  show-count
                />
              </NFormItem>
            </NGi>
            <NGi :span="1">
              <NFormItem :label="t('integrator.language')">
                <NSelect v-model:value="formData.language" :options="languageOptions" />
              </NFormItem>
            </NGi>
            <NGi :span="1">
              <NFormItem :label="t('integrator.channels')">
                <NSelect
                  v-model:value="formData.channelIds"
                  :options="channelOptions"
                  multiple
                  :placeholder="t('integrator.channels')"
                  :empty-label="t('integrator.noChannels')"
                />
              </NFormItem>
            </NGi>
            <NGi :span="2">
              <NDivider />
            </NGi>
            <NGi :span="2">
              <NFormItem :label="t('integrator.code')" required>
                <CodeEditor v-model="formData.code" :language="formData.language" height="420px" />
              </NFormItem>
            </NGi>
          </NGrid>
        </NForm>

        <template #footer>
          <NSpace justify="end">
            <NButton @click="showModal = false">{{ t('common.cancel') }}</NButton>
            <NButton type="primary" :loading="saving" @click="handleSave">
              {{ t('common.save') }}
            </NButton>
          </NSpace>
        </template>
      </NModal>
    </NSpace>
  </div>
</template>

<style scoped>
.integrator-page {
  width: 100%;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}

.page-title {
  margin: 0;
  font-size: 24px;
}

.exec-error {
  color: var(--n-color-error, #d03050);
  font-size: 13px;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
