<script setup lang="ts">
import { onMounted } from 'vue'
import {
  NConfigProvider,
  NMessageProvider,
  NDialogProvider,
  NNotificationProvider,
  NLayout,
  NGlobalStyle,
  zhCN,
  dateZhCN,
  enUS,
  dateEnUS,
} from 'naive-ui'
import { useI18n } from 'vue-i18n'
import { useSettingsStore } from '@/stores/settings'
import { useNotificationStore } from '@/stores/notification'
import { initTheme, naiveTheme } from '@/composables/useTheme'
import AppHeader from '@/components/layout/AppHeader.vue'
import AppContent from '@/components/layout/AppContent.vue'

const { locale } = useI18n()
const settingsStore = useSettingsStore()
const notificationStore = useNotificationStore()

// NaiveUI 与 vue-i18n 语言映射
function getNaiveLocale() {
  return locale.value === 'zh-CN' ? zhCN : enUS
}

function getNaiveDateLocale() {
  return locale.value === 'zh-CN' ? dateZhCN : dateEnUS
}

onMounted(async () => {
  await settingsStore.init()
  initTheme()
  // DB 就绪后立即查询全局未读通知数，确保导航栏红点刷新不丢失
  notificationStore.fetchTotalUnread()
})
</script>

<template>
  <NConfigProvider
    :theme="naiveTheme"
    :locale="getNaiveLocale()"
    :date-locale="getNaiveDateLocale()"
  >
    <NMessageProvider>
      <NDialogProvider>
        <NNotificationProvider>
          <NGlobalStyle />
          <NLayout class="app-layout">
            <AppHeader />
            <AppContent />
          </NLayout>
        </NNotificationProvider>
      </NDialogProvider>
    </NMessageProvider>
  </NConfigProvider>
</template>

<style>
/* 全局样式 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html,
body,
#app {
  height: 100%;
  width: 100%;
  overflow: hidden;
}

.app-layout {
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* NaiveUI 暗色主题全局变量 */
html[data-theme='dark'] {
  color-scheme: dark;
}
</style>
