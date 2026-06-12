<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  NCard,
  NSelect,
  NSpace,
  NTag,
  NText,
  NEmpty,
  NDivider,
  NButton,
  NStatistic,
  NGrid,
  NGi,
  NTabs,
  NTabPane,
  useMessage,
} from 'naive-ui'
import { useIntegratorStore } from '@/stores/integrator'
import { generateApiDocs, getAllApiDocs, getTypesReferenceByGroup } from '@/utils/api-docs'
import DocItemCard from '@/components/common/DocItemCard.vue'
import TypeDocCard from '@/components/common/TypeDocCard.vue'

defineOptions({ name: 'DocsPage' })

const { t } = useI18n()
const message = useMessage()
const integratorStore = useIntegratorStore()

// ============================================================
// 标签页
// ============================================================
const activeTab = ref('reference')

// ============================================================
// 完整参考（始终可用）
// ============================================================
const allApiDocs = computed(() => getAllApiDocs())
const typesByGroup = computed(() => getTypesReferenceByGroup())
const groupOrder = ['沙箱 API', '上下文', 'K线数据', '推送渠道', '整合器', '内部类型']

const totalApiCount = computed(() => allApiDocs.value.length)
const totalTypeCount = computed(() => {
  let count = 0
  for (const entries of typesByGroup.value.values()) {
    count += entries.length
  }
  return count
})

// ============================================================
// 按整合器查看
// ============================================================
const selectedIntegratorId = ref<string | null>(null)
const showAllApis = ref(false)

const integratorOptions = computed(() =>
  integratorStore.integrators.map((i) => ({
    label: i.name,
    value: i.id,
  })),
)

const selectedIntegrator = computed(() =>
  integratorStore.integrators.find((i) => i.id === selectedIntegratorId.value),
)

const apiDocsResult = computed(() => {
  const integrator = selectedIntegrator.value
  if (!integrator) return null
  return generateApiDocs(integrator.code)
})

watch(selectedIntegratorId, () => {
  showAllApis.value = false
})

// ============================================================
// 通用
// ============================================================
function copyCode(code: string) {
  navigator.clipboard.writeText(code).then(() => {
    message.success(t('docs.copySuccess'))
  })
}

onMounted(() => {
  integratorStore.loadIntegrators()
})
</script>

<template>
  <div class="docs-page">
    <NSpace vertical size="large">
      <!-- 页头 -->
      <div class="page-header">
        <h1>{{ t('docs.title') }}</h1>
      </div>

      <NTabs v-model:value="activeTab" type="line" animated>
        <!-- ============================================================ -->
        <!-- 标签页 1：完整 API 参考 -->
        <!-- ============================================================ -->
        <NTabPane name="reference" :tab="t('docs.fullReference')">
          <NSpace vertical size="large">
            <!-- 统计概览 -->
            <NCard size="small">
              <NGrid :cols="2" :x-gap="12">
                <NGi>
                  <NStatistic :label="t('docs.totalApiMethods')" :value="totalApiCount" />
                </NGi>
                <NGi>
                  <NStatistic :label="t('docs.totalDataTypes')" :value="totalTypeCount" />
                </NGi>
              </NGrid>
            </NCard>

            <!-- 沙箱 API 文档区 -->
            <NDivider title-placement="left">
              {{ t('docs.sandboxApiSection') }}
            </NDivider>
            <DocItemCard
              v-for="doc in allApiDocs"
              :key="doc.name"
              :doc="doc"
              :is-used="undefined"
              @copy="copyCode"
            />

            <!-- 数据类型文档区 -->
            <NDivider title-placement="left">
              {{ t('docs.dataTypesSection') }}
            </NDivider>
            <template v-for="group in groupOrder" :key="group">
              <template v-if="typesByGroup.has(group)">
                <NDivider
                  v-if="typesByGroup.get(group)!.length > 0"
                  title-placement="left"
                  style="margin-top: 8px"
                >
                  <NText depth="2" style="font-size: 14px">{{
                    t(`docs.typeGroup.${group}`) || group
                  }}</NText>
                </NDivider>
                <TypeDocCard
                  v-for="entry in typesByGroup.get(group)!"
                  :key="entry.name"
                  :entry="entry"
                />
              </template>
            </template>
          </NSpace>
        </NTabPane>

        <!-- ============================================================ -->
        <!-- 标签页 2：按整合器查看 -->
        <!-- ============================================================ -->
        <NTabPane name="integrator" :tab="t('docs.perIntegrator')">
          <NSpace vertical size="large">
            <!-- 整合器选择器 -->
            <NCard size="small">
              <NSpace align="center">
                <NText>{{ t('docs.integratorSelect') }}:</NText>
                <NSelect
                  v-model:value="selectedIntegratorId"
                  :options="integratorOptions"
                  :placeholder="t('docs.integratorSelect')"
                  style="width: max(200px, 25%)"
                  clearable
                />
              </NSpace>
            </NCard>

            <template v-if="selectedIntegrator && apiDocsResult">
              <!-- 整合器概览 -->
              <NCard>
                <template #header>
                  <NText strong>{{ selectedIntegrator.name }}</NText>
                </template>
                <NSpace vertical size="small">
                  <NText depth="2">
                    {{ selectedIntegrator.description || t('common.noData') }}
                  </NText>
                  <NSpace size="small">
                    <NTag
                      :type="selectedIntegrator.language === 'typescript' ? 'info' : 'warning'"
                      size="small"
                    >
                      {{ selectedIntegrator.language.toUpperCase() }}
                    </NTag>
                    <NTag :type="selectedIntegrator.enabled ? 'success' : 'default'" size="small">
                      {{ selectedIntegrator.enabled ? t('docs.enabled') : t('docs.disabled') }}
                    </NTag>
                    <NText depth="3" style="font-size: 12px">
                      {{ t('docs.generatedAt') }}:
                      {{ new Date(selectedIntegrator.updatedAt).toLocaleString() }}
                    </NText>
                  </NSpace>
                </NSpace>
              </NCard>

              <!-- 使用统计 -->
              <NCard size="small">
                <NGrid :cols="4" :x-gap="12">
                  <NGi>
                    <NStatistic
                      :label="t('docs.totalApis')"
                      :value="apiDocsResult.used.length + apiDocsResult.available.length"
                    />
                  </NGi>
                  <NGi>
                    <NStatistic :label="t('docs.usedApis')" :value="apiDocsResult.used.length" />
                  </NGi>
                  <NGi>
                    <NStatistic
                      :label="t('docs.unusedApis')"
                      :value="apiDocsResult.available.length"
                    />
                  </NGi>
                  <NGi>
                    <NStatistic :label="t('docs.usageRate')">
                      {{
                        apiDocsResult.used.length + apiDocsResult.available.length > 0
                          ? Math.round(
                              (apiDocsResult.used.length /
                                (apiDocsResult.used.length + apiDocsResult.available.length)) *
                                100,
                            ) + '%'
                          : '0%'
                      }}
                    </NStatistic>
                  </NGi>
                </NGrid>
                <NButton
                  v-if="apiDocsResult.available.length > 0"
                  size="small"
                  quaternary
                  type="primary"
                  style="margin-top: 8px"
                  @click="showAllApis = !showAllApis"
                >
                  {{
                    showAllApis
                      ? t('docs.hideUnused')
                      : t('docs.showUnused', { count: apiDocsResult.available.length })
                  }}
                </NButton>
              </NCard>

              <!-- 已使用 API -->
              <template v-if="apiDocsResult.used.length > 0">
                <NDivider title-placement="left">
                  {{ t('docs.usedSection') }}
                </NDivider>
                <DocItemCard
                  v-for="doc in apiDocsResult.used"
                  :key="doc.name"
                  :doc="doc"
                  :is-used="true"
                  @copy="copyCode"
                />
              </template>

              <!-- 未使用 API -->
              <template v-if="showAllApis && apiDocsResult.available.length > 0">
                <NDivider title-placement="left">
                  {{ t('docs.availableSection') }}
                </NDivider>
                <DocItemCard
                  v-for="doc in apiDocsResult.available"
                  :key="doc.name"
                  :doc="doc"
                  :is-used="false"
                  @copy="copyCode"
                />
              </template>

              <NEmpty
                v-if="apiDocsResult.used.length === 0 && apiDocsResult.available.length === 0"
                :description="t('docs.noApiFound')"
              />
            </template>

            <NEmpty v-else :description="t('docs.noDocs')">
              <template #extra>
                <NText depth="3">{{ t('docs.noDocsHint') }}</NText>
              </template>
            </NEmpty>
          </NSpace>
        </NTabPane>
      </NTabs>
    </NSpace>
  </div>
</template>

<style scoped>
.docs-page {
  width: 100%;
  max-width: 95vw;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.page-header h1 {
  margin: 0;
  font-size: 24px;
}
</style>
