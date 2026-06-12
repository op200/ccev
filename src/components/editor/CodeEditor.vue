<script setup lang="ts">
/**
 * CodeEditor.vue — 基于 Monaco Editor 的代码编辑器组件
 *
 * 功能：
 * - JavaScript / TypeScript 语法高亮与 IntelliSense
 * - 主题跟随应用明暗切换
 * - v-model 双向绑定
 * - 支持模态框内渲染（延迟初始化 + ResizeObserver）
 * - 加载状态 & 错误回退（textarea）
 */
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useOsTheme } from 'naive-ui'
import type * as Monaco from 'monaco-editor'

// ============================================================
// Worker 工厂 — Vite 原生 ?worker 导入
// ============================================================

import editorWorkerFactory from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import tsWorkerFactory from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'

// 必须在加载 monaco 之前声明 Worker 环境
;(globalThis as Record<string, unknown>).MonacoEnvironment = {
  getWorker(_workerId: string, label: string): Worker {
    if (label === 'typescript' || label === 'javascript') {
      return new (tsWorkerFactory as unknown as new () => Worker)()
    }
    return new (editorWorkerFactory as unknown as new () => Worker)()
  },
}

// ============================================================
// Props & Emits
// ============================================================

const props = withDefaults(
  defineProps<{
    modelValue: string
    language?: 'javascript' | 'typescript'
    readonly?: boolean
    height?: string
    placeholder?: string
  }>(),
  {
    language: 'javascript',
    readonly: false,
    height: '420px',
    placeholder: undefined,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

// ============================================================
// 状态
// ============================================================

const containerRef = ref<HTMLDivElement>()
const editorLoading = ref(true)
const editorError = ref<string | null>(null)
let editor: Monaco.editor.IStandaloneCodeEditor | null = null
let isInternalUpdate = false
let resizeObserver: ResizeObserver | null = null

const osThemeRef = useOsTheme()
const currentTheme = ref<'light' | 'dark'>(osThemeRef.value === 'dark' ? 'dark' : 'light')

watch(osThemeRef, (val) => {
  currentTheme.value = val === 'dark' ? 'dark' : 'light'
  if (editor) {
    import('monaco-editor').then((m) => {
      m.editor.setTheme(currentTheme.value === 'dark' ? 'vs-dark' : 'vs')
    })
  }
})

// ============================================================
// 整合器 API 类型定义
// ============================================================

const INTEGRATOR_TYPES = `
declare interface KlineData {
  timestamp: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

declare type KlineTimeframe = '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d' | '1w' | '1M'

declare type ChannelType = 'dingtalk' | 'feishu' | 'email' | 'custom'

declare interface IntegratorContext {
  klines: KlineData[]
  exchangeId: string
  symbol: string
  timeframe: string
}

declare interface IntegratorAPI {
  sendToAllChannels(title: string, message: string): Promise<void>
  sendToChannel(channelType: ChannelType, title: string, message: string): Promise<void>
  getKlines(): KlineData[]
  log(...args: unknown[]): void
}

declare const context: IntegratorContext
declare const api: IntegratorAPI
`

// ============================================================
// 工具函数
// ============================================================

/** 等待容器获得非零尺寸（处理模态框动画延迟） */
function waitForContainerSize(el: HTMLElement, timeout = 3000): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now()
    const check = () => {
      const { width, height } = el.getBoundingClientRect()
      if (width > 0 && height > 0) return resolve()
      if (Date.now() - start > timeout) return reject(new Error('编辑器容器初始化超时'))
      requestAnimationFrame(check)
    }
    check()
  })
}

/** 配置 TypeScript 编译选项并注入类型 */
function setupTypeScriptDefaults(monaco: typeof Monaco) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tsApi = monaco.languages.typescript as any
  const tsDefaults = tsApi.typescriptDefaults

  tsDefaults.setCompilerOptions({
    target: tsApi.ScriptTarget.ESNext,
    module: tsApi.ModuleKind.ESNext,
    allowNonTsExtensions: true,
    strict: true,
    noLib: false,
    lib: ['esnext'],
  })
  tsDefaults.addExtraLib(INTEGRATOR_TYPES, 'ts:integrator-api.d.ts')

  const jsDefaults = tsApi.javascriptDefaults
  jsDefaults.setCompilerOptions({
    target: tsApi.ScriptTarget.ESNext,
    allowNonTsExtensions: true,
    lib: ['esnext'],
  })
  jsDefaults.addExtraLib(INTEGRATOR_TYPES, 'ts:integrator-api.d.ts')
}

// ============================================================
// 初始化编辑器
// ============================================================

async function createEditor() {
  if (!containerRef.value) return

  editorLoading.value = true
  editorError.value = null

  try {
    await nextTick()
    await waitForContainerSize(containerRef.value)

    const monaco = await import('monaco-editor')
    setupTypeScriptDefaults(monaco)

    editor = monaco.editor.create(containerRef.value, {
      value: props.modelValue,
      language: props.language,
      theme: currentTheme.value === 'dark' ? 'vs-dark' : 'vs',
      readOnly: props.readonly,
      automaticLayout: false,
      minimap: { enabled: false },
      lineNumbers: 'on',
      scrollBeyondLastLine: false,
      fontSize: 14,
      fontFamily:
        "'Cascadia Code', 'Fira Code', 'JetBrains Mono', 'Consolas', 'Courier New', monospace",
      tabSize: 2,
      insertSpaces: true,
      wordWrap: 'on',
      bracketPairColorization: { enabled: true },
      guides: { bracketPairs: true, indentation: true },
      smoothScrolling: true,
      cursorBlinking: 'smooth',
      cursorSmoothCaretAnimation: 'on' as const,
      renderWhitespace: 'selection',
      suggest: { showKeywords: true, showSnippets: true },
      formatOnPaste: true,
    })

    // 内容变更 → emit
    editor.onDidChangeModelContent(() => {
      if (isInternalUpdate) return
      emit('update:modelValue', editor!.getValue())
    })

    // Ctrl+Shift+F 格式化
    editor.addAction({
      id: 'format-document',
      label: 'Format Document',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyF],
      run: (ed) => {
        ed.getAction('editor.action.formatDocument')?.run()
      },
    })

    // ResizeObserver 自适应容器尺寸
    resizeObserver = new ResizeObserver(() => {
      editor?.layout()
    })
    resizeObserver.observe(containerRef.value)

    editorLoading.value = false
  } catch (err) {
    console.error('[CodeEditor] 初始化失败:', err)
    editorError.value = String(err)
    editorLoading.value = false
  }
}

// ============================================================
// 生命周期
// ============================================================

onMounted(() => {
  createEditor()
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  resizeObserver = null
  editor?.dispose()
  editor = null
})

// ============================================================
// 外部 prop 变更同步
// ============================================================

watch(
  () => props.modelValue,
  (newVal) => {
    if (!editor) return
    if (newVal !== editor.getValue()) {
      isInternalUpdate = true
      editor.setValue(newVal)
      isInternalUpdate = false
    }
  },
)

watch(
  () => props.language,
  (newLang) => {
    if (!editor) return
    const model = editor.getModel()
    if (model) {
      import('monaco-editor').then((m) => {
        m.editor.setModelLanguage(model, newLang)
      })
    }
  },
)

watch(
  () => props.readonly,
  (val) => {
    editor?.updateOptions({ readOnly: val })
  },
)

// ============================================================
// 暴露方法
// ============================================================

function format() {
  editor?.getAction('editor.action.formatDocument')?.run()
}

function getEditor() {
  return editor
}

defineExpose({ format, getEditor })
</script>

<template>
  <div class="code-editor-wrapper">
    <!-- 加载覆盖层 -->
    <div v-if="editorLoading" class="code-editor-placeholder">
      <span class="loading-dot" />
      <span>编辑器中...</span>
    </div>
    <!-- 错误回退为 textarea -->
    <textarea
      v-else-if="editorError"
      class="code-editor-fallback"
      :value="modelValue"
      :readonly="readonly"
      :style="{ height }"
      @input="emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
    />
    <!-- Monaco 容器 — 始终渲染以获取 ref，加载中用 CSS 隐藏 -->
    <div
      ref="containerRef"
      class="code-editor-container"
      :style="{ height, visibility: editorLoading ? 'hidden' : 'visible' }"
    />
  </div>
</template>

<style scoped>
.code-editor-wrapper {
  width: 100%;
  border: 1px solid var(--n-border-color, #e0e0e0);
  border-radius: 4px;
  overflow: hidden;
  position: relative;
}

.code-editor-container {
  width: 100%;
}

.code-editor-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 30vh;
  color: var(--n-text-color-disabled, #999);
  font-size: 13px;
}

.loading-dot {
  width: 14px;
  height: 14px;
  border: 2px solid var(--n-border-color, #ddd);
  border-top-color: var(--n-color-primary, #2080f0);
  border-radius: 50%;
  animation: ccev-spin 0.8s linear infinite;
}

@keyframes ccev-spin {
  to {
    transform: rotate(360deg);
  }
}

.code-editor-fallback {
  width: 100%;
  padding: 12px;
  font-family: 'Cascadia Code', 'Fira Code', 'Consolas', 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.6;
  border: none;
  outline: none;
  resize: vertical;
  background: var(--n-color-embedded, #fafafa);
  color: var(--n-text-color, #333);
}
</style>
