import { createI18n } from 'vue-i18n'
import en from './locales/en'
import zhCN from './locales/zh-CN'

/** 支持的语言 */
export const SUPPORTED_LOCALES = ['en', 'zh-CN'] as const
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]

/** 语言显示名称 */
export const LOCALE_LABELS: Record<SupportedLocale, string> = {
  en: 'English',
  'zh-CN': '简体中文',
}

/** 检测浏览器语言 */
function detectBrowserLocale(): SupportedLocale {
  const browserLang = navigator.language
  if (browserLang.startsWith('zh')) {
    return 'zh-CN'
  }
  return 'en'
}

/** 从 localStorage 获取已保存的语言设置 */
function getSavedLocale(): SupportedLocale | null {
  try {
    const saved = localStorage.getItem('ccev-locale')
    if (saved && SUPPORTED_LOCALES.includes(saved as SupportedLocale)) {
      return saved as SupportedLocale
    }
  } catch {
    // localStorage 不可用
  }
  return null
}

const savedLocale = getSavedLocale()
const browserLocale = detectBrowserLocale()
const initialLocale = savedLocale || browserLocale

export const i18n = createI18n({
  legacy: false,
  locale: initialLocale,
  fallbackLocale: 'en',
  messages: {
    en,
    'zh-CN': zhCN,
  },
})

/** 切换语言 */
export function setLocale(locale: SupportedLocale) {
  i18n.global.locale.value = locale
  try {
    localStorage.setItem('ccev-locale', locale)
  } catch {
    // localStorage 不可用
  }
}

export default i18n
