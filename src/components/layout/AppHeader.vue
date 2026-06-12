<script setup lang="ts">
import { computed, h } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { NLayoutHeader, NMenu, NSpace, NSwitch, NIcon, NText } from 'naive-ui'
import { useI18n } from 'vue-i18n'
import { useSettingsStore } from '@/stores/settings'
import { useNotificationStore } from '@/stores/notification'
import { currentTheme, applyTheme } from '@/composables/useTheme'

const { t } = useI18n()
const router = useRouter()
const route = useRoute()
const settingsStore = useSettingsStore()
const notificationStore = useNotificationStore()

const isDark = computed(() => currentTheme.value === 'dark')

const menuOptions = computed(() => {
  const unread = notificationStore.totalUnread
  const dotStyle = {
    display: 'inline-block',
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: '#d03050',
    marginLeft: '4px',
    verticalAlign: 'middle',
    position: 'relative' as const,
    top: '-1px',
  }
  return [
    { label: t('nav.home'), key: 'home' },
    { label: t('nav.chart'), key: 'chart' },
    { label: t('nav.integrator'), key: 'integrator' },
    { label: t('nav.docs'), key: 'docs' },
    {
      label: () =>
        h(
          'span',
          { style: { display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap' } },
          [t('nav.notifications'), unread > 0 ? h('span', { style: dotStyle }) : null],
        ),
      key: 'notifications',
    },
    { label: t('nav.settings'), key: 'settings' },
  ]
})

const activeKey = computed(() => {
  const name = String(route.name || 'home')
  return name
})

function navigateTo(key: string) {
  router.push({ name: key })
}

function toggleTheme() {
  const newTheme = isDark.value ? 'light' : 'dark'
  applyTheme(newTheme)
  settingsStore.settings.theme = newTheme
}
</script>

<template>
  <NLayoutHeader bordered class="app-header">
    <div class="header-content">
      <div class="header-left">
        <NText strong class="app-logo">📊 CCEV</NText>
      </div>
      <div class="header-center">
        <NMenu
          :key="notificationStore.totalUnread"
          :value="activeKey"
          mode="horizontal"
          :options="menuOptions"
          @update:value="navigateTo"
        />
      </div>
      <div class="header-right">
        <NSpace align="center">
          <NIcon size="18">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          </NIcon>
          <NSwitch :value="isDark" @update:value="toggleTheme" />
        </NSpace>
      </div>
    </div>
  </NLayoutHeader>
</template>

<style scoped>
.app-header {
  position: sticky;
  top: 0;
  z-index: 100;
  height: 3.5rem;
  display: flex;
  align-items: center;
  padding: 0 16px;
}

.header-content {
  display: flex;
  align-items: center;
  width: 100%;
  max-width: 95%;
  margin: 0 auto;
}

.header-left {
  flex-shrink: 0;
  margin-right: 24px;
}

.app-logo {
  font-size: 18px;
  cursor: pointer;
}

.header-center {
  flex: 1;
  display: flex;
  justify-content: center;
}

.header-right {
  flex-shrink: 0;
  margin-left: 24px;
}
</style>
