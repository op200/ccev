<script setup lang="ts">
import { computed } from 'vue'
import { NCard, NSpace, NTag, NText, NTable, NCode } from 'naive-ui'
import { useI18n } from 'vue-i18n'
import { useMessage } from 'naive-ui'
import CodeBlock from '@/components/common/CodeBlock.vue'
import type { TypeDocEntry } from '@/utils/api-docs'

const props = defineProps<{
  entry: TypeDocEntry
}>()

const { t } = useI18n()
const message = useMessage()

const kindColor = computed(() => {
  switch (props.entry.kind) {
    case 'interface':
      return 'success' as const
    case 'type':
      return 'info' as const
    default:
      return 'warning' as const
  }
})

const columns = [
  { title: t('docs.propName'), key: 'name', width: 160 },
  { title: t('docs.propType'), key: 'type', width: 240 },
  { title: t('docs.propRequired'), key: 'required', width: 80 },
  { title: t('docs.propDesc'), key: 'description' },
]

const propData = computed(() =>
  (props.entry.props ?? []).map((p) => ({
    name: p.name,
    type: p.type,
    required: p.required ? '✅' : '',
    description: p.description,
  })),
)

function copyCode(code: string) {
  navigator.clipboard.writeText(code).then(() => {
    message.success(t('docs.copySuccess'))
  })
}
</script>

<template>
  <NCard size="small">
    <template #header>
      <NSpace align="center">
        <NTag :type="kindColor" size="small" :bordered="false">
          {{ entry.kind }}
        </NTag>
        <NCode style="font-size: 15px; font-weight: 600">{{ entry.name }}</NCode>
        <NText depth="3" style="font-size: 12px">{{ entry.source }}</NText>
      </NSpace>
    </template>

    <NSpace vertical size="medium">
      <NText>{{ entry.description }}</NText>

      <!-- 联合类型成员 -->
      <div v-if="entry.unionMembers && entry.unionMembers.length > 0">
        <NText strong depth="1" style="margin-bottom: 4px; display: inline-block">
          {{ t('docs.members') }}:
        </NText>
        <NSpace size="small" style="margin-top: 4px">
          <NTag v-for="m in entry.unionMembers" :key="m" size="small" bordered>
            {{ m }}
          </NTag>
        </NSpace>
      </div>

      <!-- 属性表 -->
      <div v-if="entry.props && entry.props.length > 0">
        <NText strong depth="1" style="margin-bottom: 4px; display: inline-block">
          {{ t('docs.props') }}:
        </NText>
        <NTable
          :columns="columns"
          :data="propData"
          size="small"
          :bordered="false"
          :single-line="false"
          style="margin-top: 4px"
        />
      </div>

      <!-- 示例 -->
      <div v-if="entry.example">
        <NText strong depth="1" style="margin-bottom: 4px; display: inline-block">
          {{ t('docs.example') }}:
        </NText>
        <CodeBlock
          :code="entry.example"
          language="typescript"
          :show-language="true"
          @copy="copyCode(entry.example)"
        />
      </div>
    </NSpace>
  </NCard>
</template>
