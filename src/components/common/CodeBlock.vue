<script setup lang="ts">
/**
 * CodeBlock.vue — 基于 highlight.js 的代码高亮块
 *
 * 用于 API 文档中的代码示例展示，支持：
 * - JavaScript / TypeScript 语法高亮
 * - 一键复制
 * - 明暗主题自适应
 */
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { NButton } from 'naive-ui'
import { currentTheme } from '@/composables/useTheme'

const props = withDefaults(
  defineProps<{
    /** 代码内容 */
    code: string
    /** 代码语言 */
    language?: 'javascript' | 'typescript' | 'js' | 'ts'
    /** 是否显示语言标签 */
    showLanguage?: boolean
    /** 最大高度（超出滚动） */
    maxHeight?: string
  }>(),
  {
    language: 'javascript',
    showLanguage: false,
    maxHeight: '300px',
  },
)

const emit = defineEmits<{
  copy: [code: string]
}>()

const { t } = useI18n()

/** 规范化语言名 */
const normalizedLang = computed(() => {
  if (props.language === 'js') return 'javascript'
  if (props.language === 'ts') return 'typescript'
  return props.language
})

/** 高亮 HTML — 由父组件通过 window.hljs 渲染后传入，此处保留静态降级 */
const highlightedHtml = computed(() => {
  if (typeof window !== 'undefined' && window.hljs) {
    const result = window.hljs.highlight(props.code, {
      language: normalizedLang.value,
    })
    return result.value
  }
  // 降级：转义 HTML 后直接输出
  return props.code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
})
</script>

<template>
  <div
    class="code-block"
    :class="[`code-block--${currentTheme}`, `code-block--lang-${normalizedLang}`]"
    :style="{ maxHeight: props.maxHeight }"
  >
    <div class="code-block__header">
      <span v-if="props.showLanguage" class="code-block__lang-tag">
        {{ normalizedLang.toUpperCase() }}
      </span>
      <span v-else class="code-block__spacer" />
      <NButton size="tiny" quaternary @click="emit('copy', props.code)">
        {{ t('docs.copy') }}
      </NButton>
    </div>
    <pre class="code-block__pre"><code
      class="code-block__code"
      :class="`language-${normalizedLang}`"
      v-html="highlightedHtml"
    /></pre>
  </div>
</template>

<style scoped>
.code-block {
  position: relative;
  border-radius: 8px;
  overflow: hidden;
  font-size: 13px;
  line-height: 1.6;
}

.code-block--dark {
  border: 1px solid #333;
  background: #0d1117;
}

.code-block--dark .code-block__header {
  background: #161b22;
  border-bottom: 1px solid #333;
}

.code-block--light {
  border: 1px solid #d0d7de;
  background: #f6f8fa;
}

.code-block--light .code-block__header {
  background: #fff;
  border-bottom: 1px solid #d0d7de;
}

.code-block__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 8px;
}

.code-block__lang-tag {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.code-block--dark .code-block__lang-tag {
  color: #8b949e;
}

.code-block--light .code-block__lang-tag {
  color: #57606a;
}

.code-block__spacer {
  flex: 1;
}

.code-block__pre {
  margin: 0;
  padding: 12px 16px;
  overflow: auto;
  tab-size: 2;
  white-space: pre;
  word-wrap: normal;
}

.code-block__code {
  font-family: 'Cascadia Code', 'Fira Code', 'JetBrains Mono', 'Consolas', 'Courier New', monospace;
}

/* 暗色主题下的高亮样式覆盖 */
.code-block--dark :deep(.hljs-keyword) {
  color: #ff7b72;
}
.code-block--dark :deep(.hljs-string) {
  color: #a5d6ff;
}
.code-block--dark :deep(.hljs-number) {
  color: #79c0ff;
}
.code-block--dark :deep(.hljs-comment) {
  color: #8b949e;
}
.code-block--dark :deep(.hljs-function) {
  color: #d2a8ff;
}
.code-block--dark :deep(.hljs-title) {
  color: #d2a8ff;
}
.code-block--dark :deep(.hljs-built_in) {
  color: #ffa657;
}
.code-block--dark :deep(.hljs-literal) {
  color: #79c0ff;
}
.code-block--dark :deep(.hljs-params) {
  color: #ffc;
}
.code-block--dark :deep(.hljs-variable) {
  color: #ffa657;
}
.code-block--dark :deep(.hljs-attr) {
  color: #79c0ff;
}

/* 亮色主题下的高亮样式覆盖 */
.code-block--light :deep(.hljs-keyword) {
  color: #cf222e;
}
.code-block--light :deep(.hljs-string) {
  color: #0a3069;
}
.code-block--light :deep(.hljs-number) {
  color: #0550ae;
}
.code-block--light :deep(.hljs-comment) {
  color: #6e7781;
}
.code-block--light :deep(.hljs-function) {
  color: #8250df;
}
.code-block--light :deep(.hljs-title) {
  color: #8250df;
}
.code-block--light :deep(.hljs-built_in) {
  color: #953800;
}
.code-block--light :deep(.hljs-literal) {
  color: #0550ae;
}
.code-block--light :deep(.hljs-params) {
  color: #111;
}
.code-block--light :deep(.hljs-variable) {
  color: #953800;
}
.code-block--light :deep(.hljs-attr) {
  color: #0550ae;
}
</style>
