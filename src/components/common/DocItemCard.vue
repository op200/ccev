<script setup lang="ts">
import type { APIDocItem } from '@/types/integrator'
import { useI18n } from 'vue-i18n'
import { NCard, NSpace, NTag, NText, NCode, NList, NListItem } from 'naive-ui'
import CodeBlock from '@/components/common/CodeBlock.vue'

defineProps<{
  doc: APIDocItem
  isUsed?: boolean
}>()

const emit = defineEmits<{
  copy: [code: string]
}>()

const { t } = useI18n()
</script>

<template>
  <NCard>
    <template #header>
      <NSpace align="center" justify="space-between" style="width: 100%">
        <NSpace align="center">
          <NTag :type="doc.type === 'function' ? 'success' : 'info'" size="small" :bordered="false">
            {{ t(`docs.${doc.type}`) }}
          </NTag>
          <NCode style="font-size: 14px; font-weight: 600">{{ doc.name }}</NCode>
        </NSpace>
        <NSpace size="small">
          <NTag v-if="isUsed === true" type="success" size="tiny" :bordered="false">
            {{ t('docs.inUse') }}
          </NTag>
          <NTag v-else-if="isUsed === false" type="default" size="tiny" :bordered="false">
            {{ t('docs.notUsed') }}
          </NTag>
        </NSpace>
      </NSpace>
    </template>

    <NSpace vertical size="medium">
      <NText depth="2">{{ doc.description }}</NText>

      <!-- 参数表 -->
      <div v-if="doc.params && doc.params.length > 0">
        <NText strong depth="1" style="margin-bottom: 4px; display: inline-block">
          {{ t('docs.params') }}:
        </NText>
        <NList>
          <NListItem v-for="param in doc.params" :key="param.name">
            <NSpace align="center" size="small">
              <NCode>{{ param.name }}</NCode>
              <NTag size="tiny" bordered>{{ param.type }}</NTag>
              <NTag v-if="param.required" size="tiny" type="error" :bordered="false">
                required
              </NTag>
              <NText depth="3">{{ param.description }}</NText>
            </NSpace>
          </NListItem>
        </NList>
      </div>

      <!-- 返回值 -->
      <div v-if="doc.returns">
        <NText strong depth="1"> {{ t('docs.returns') }}: </NText>
        <NTag size="small" type="info" :bordered="false" style="margin-left: 8px">
          {{ doc.returns }}
        </NTag>
      </div>

      <!-- 代码示例 -->
      <div v-if="doc.example">
        <NText strong depth="1" style="margin-bottom: 4px; display: inline-block">
          {{ t('docs.example') }}:
        </NText>
        <CodeBlock
          :code="doc.example"
          language="javascript"
          :show-language="true"
          @copy="emit('copy', doc.example!)"
        />
      </div>
    </NSpace>
  </NCard>
</template>
