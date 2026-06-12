import { ref, computed, toRaw } from 'vue'
import { defineStore } from 'pinia'
import { db } from '@/db'
import type { Integrator, IntegratorExecutionResult, IntegratorContext } from '@/types/integrator'
import { nanoid } from 'nanoid'
import type { ChannelType } from '@/types/channel'
import { DEFAULT_INTEGRATORS } from '@/types/integrator-defaults'

/** WebUI 通知回调类型 */
export type NotificationHandler = (title: string, message: string) => void

export const useIntegratorStore = defineStore('integrator', () => {
  const integrators = ref<Integrator[]>([])
  const executionResults = ref<Map<string, IntegratorExecutionResult>>(new Map())
  const loading = ref(false)

  const enabledIntegrators = computed(() => integrators.value.filter((i) => i.enabled))

  /** WebUI 通知回调（由页面组件注入） */
  let _notificationHandler: NotificationHandler | null = null

  /** 设置 WebUI 通知回调（由 Integrator.vue 在 onMounted 中调用） */
  function setNotificationHandler(handler: NotificationHandler) {
    _notificationHandler = handler
  }

  /** 加载所有整合器（首次无数据时自动种子默认整合器） */
  async function loadIntegrators() {
    loading.value = true
    try {
      integrators.value = await db.integrators.toArray()
      if (integrators.value.length === 0) {
        await seedDefaultIntegrators()
      }
    } finally {
      loading.value = false
    }
  }

  /** 种子默认整合器（仅在数据库中无整合器时调用，使用各默认项的 enabled 字段） */
  async function seedDefaultIntegrators() {
    const now = Date.now()
    const defaults: Integrator[] = DEFAULT_INTEGRATORS.map((d) => ({
      id: nanoid(),
      ...d,
      createdAt: now,
      updatedAt: now,
    }))
    await db.integrators.bulkPut(defaults)
    integrators.value = defaults
  }

  /** 创建整合器 */
  async function createIntegrator(data: {
    name: string
    description: string
    code: string
    language: 'javascript' | 'typescript'
    channelIds: string[]
  }): Promise<Integrator> {
    const now = Date.now()
    const integrator: Integrator = {
      id: nanoid(),
      ...data,
      enabled: true,
      createdAt: now,
      updatedAt: now,
    }
    await db.integrators.put(integrator)
    integrators.value.push(integrator)
    return integrator
  }

  /** 更新整合器 */
  async function updateIntegrator(id: string, data: Partial<Integrator>) {
    const idx = integrators.value.findIndex((i) => i.id === id)
    if (idx >= 0) {
      // 使用 toRaw 获取原始对象，避免 Vue 响应式 Proxy 导致 IndexedDB DataCloneError
      const raw = toRaw(integrators.value[idx]!)
      const updated = {
        ...raw,
        ...data,
        updatedAt: Date.now(),
      }
      integrators.value[idx] = updated
      // 传入 DB 前再次 toRaw 确保是纯对象（赋值后 Vue 可能重新包装）
      await db.integrators.put(toRaw(updated) as Integrator)
    }
  }

  /** 删除整合器 */
  async function deleteIntegrator(id: string) {
    integrators.value = integrators.value.filter((i) => i.id !== id)
    await db.integrators.delete(id)
    executionResults.value.delete(id)
  }

  /** 执行整合器 */
  async function executeIntegrator(
    id: string,
    context: IntegratorContext,
  ): Promise<IntegratorExecutionResult> {
    const integrator = integrators.value.find((i) => i.id === id)
    if (!integrator) {
      return {
        integratorId: id,
        success: false,
        error: 'Integrator not found',
        executedAt: Date.now(),
      }
    }

    try {
      // 构建沙箱 API
      const api = buildSandboxAPI(integrator)
      const result = await runSandbox(integrator.code, context, api)
      const execResult: IntegratorExecutionResult = {
        integratorId: id,
        success: true,
        output: result,
        executedAt: Date.now(),
      }
      executionResults.value.set(id, execResult)
      return execResult
    } catch (e) {
      const execResult: IntegratorExecutionResult = {
        integratorId: id,
        success: false,
        error: String(e),
        executedAt: Date.now(),
      }
      executionResults.value.set(id, execResult)
      return execResult
    }
  }

  /** 构建沙箱 API */
  function buildSandboxAPI(integrator: Integrator) {
    return {
      sendToChannel: async (channelType: ChannelType, title: string, message: string) => {
        // WebUI 内通知
        if (_notificationHandler) {
          _notificationHandler(title, message)
        }
        // TODO: 发送到指定类型的外部渠道（钉钉/飞书/邮箱）
        const channels = integrator.channelIds
        console.log(`[Integrator API] sendToChannel: ${channelType}`, title, message, channels)
      },
      sendToAllChannels: async (title: string, message: string) => {
        // WebUI 内通知
        if (_notificationHandler) {
          _notificationHandler(title, message)
        }
        // TODO: 发送到所有关联的外部渠道
        console.log(`[Integrator API] sendToAllChannels`, title, message)
      },
      getKlines: () => {
        // 由上下文提供
        return []
      },
      log: (...args: unknown[]) => {
        console.log(`[Integrator: ${integrator.name}]`, ...args)
      },
    }
  }

  /** 在沙箱中运行代码 */
  async function runSandbox(
    code: string,
    context: IntegratorContext,
    api: Record<string, unknown>,
  ) {
    // 使用 Function 构造器创建沙箱
    const wrappedCode = `
      "use strict";
      return (async function(api, context) {
        ${code}
      })(api, context);
    `
    const fn = new Function('api', 'context', wrappedCode)
    return await fn(api, context)
  }

  return {
    integrators,
    executionResults,
    loading,
    enabledIntegrators,
    loadIntegrators,
    seedDefaultIntegrators,
    createIntegrator,
    updateIntegrator,
    deleteIntegrator,
    executeIntegrator,
    setNotificationHandler,
  }
})
