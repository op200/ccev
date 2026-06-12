import { ref, watch } from 'vue'
import { useOsTheme, darkTheme } from 'naive-ui'
import type { GlobalTheme } from 'naive-ui'
import { db } from '@/db'
import type { AppSettings } from '@/types/settings'

const osThemeRef = useOsTheme()

/** 当前主题 */
export const currentTheme = ref<'light' | 'dark'>(osThemeRef.value === 'dark' ? 'dark' : 'light')

/** NaiveUI 主题对象 */
export const naiveTheme = ref<GlobalTheme | null>(currentTheme.value === 'dark' ? darkTheme : null)

/** 监听系统主题变化（当设置为 auto 时） */
watch(osThemeRef, (_newOsTheme) => {
  // 检查用户是否设置为 auto
  db.settings.get(1).then((settings) => {
    if (!settings || settings.theme === 'auto') {
      applyTheme('auto')
    }
  })
})

/** 应用主题 */
export function applyTheme(theme: AppSettings['theme']) {
  if (theme === 'auto') {
    const isDark = osThemeRef.value === 'dark'
    currentTheme.value = isDark ? 'dark' : 'light'
    naiveTheme.value = isDark ? darkTheme : null
  } else {
    currentTheme.value = theme
    naiveTheme.value = theme === 'dark' ? darkTheme : null
  }
  document.documentElement.setAttribute('data-theme', currentTheme.value)
}

/** 初始化主题 */
export async function initTheme() {
  const settings = await db.settings.get(1)
  applyTheme(settings?.theme || 'auto')
}
