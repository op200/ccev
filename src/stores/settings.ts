import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { db } from '@/db'
import type { AppSettings, CacheSettings, FetcherSettings } from '@/types/settings'
import { DEFAULT_SETTINGS, SETTINGS_VERSION } from '@/types/settings'
import type { SupportedLocale } from '@/i18n'
import { setLocale } from '@/i18n'
import type { ChannelConfig } from '@/types/channel'
import { applyTheme } from '@/composables/useTheme'

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<AppSettings>({ ...DEFAULT_SETTINGS })
  const loading = ref(true)
  const dbUsage = ref({ used: 0, quota: 0 })

  const enabledExchanges = computed(() => settings.value.enabledExchanges)
  const channels = computed(() => settings.value.channels)
  const cacheSettings = computed(() => settings.value.cache)
  const fetcherSettings = computed(() => settings.value.fetcher)

  /** 初始化：从 IndexedDB 加载设置 */
  async function init() {
    loading.value = true
    try {
      settings.value = await db.initSettings()
      const usage = await db.getStorageUsage()
      dbUsage.value = usage
    } catch {
      settings.value = { ...DEFAULT_SETTINGS }
    } finally {
      loading.value = false
    }
  }

  /** 更新部分设置 */
  async function updateSettings(partial: Partial<AppSettings>) {
    settings.value = { ...settings.value, ...partial }
    await persist()
  }

  /** 更新缓存设置 */
  async function updateCacheSettings(partial: Partial<CacheSettings>) {
    settings.value.cache = { ...settings.value.cache, ...partial }
    await persist()
  }

  /** 更新获取器设置 */
  async function updateFetcherSettings(partial: Partial<FetcherSettings>) {
    settings.value.fetcher = { ...settings.value.fetcher, ...partial }
    await persist()
  }

  /** 设置语言 */
  async function setLanguage(locale: SupportedLocale) {
    setLocale(locale)
    await updateSettings({ locale })
  }

  /** 设置主题 */
  async function setTheme(theme: AppSettings['theme']) {
    await updateSettings({ theme })
    applyTheme(theme)
  }

  /** 切换交易所启用状态 */
  async function toggleExchange(exchangeId: string) {
    const current = settings.value.enabledExchanges
    const idx = current.indexOf(exchangeId)
    if (idx >= 0) {
      current.splice(idx, 1)
    } else {
      current.push(exchangeId)
    }
    await updateSettings({ enabledExchanges: [...current] })
  }

  /** 添加渠道 */
  async function addChannel(channel: ChannelConfig) {
    settings.value.channels.push(channel)
    await persist()
    await db.channels.put(channel)
  }

  /** 更新渠道 */
  async function updateChannel(channel: ChannelConfig) {
    const idx = settings.value.channels.findIndex((c: ChannelConfig) => c.id === channel.id)
    if (idx >= 0) {
      settings.value.channels[idx] = channel
    }
    await persist()
    await db.channels.put(channel)
  }

  /** 删除渠道 */
  async function removeChannel(channelId: string) {
    settings.value.channels = settings.value.channels.filter(
      (c: ChannelConfig) => c.id !== channelId,
    )
    await persist()
    await db.channels.delete(channelId)
  }

  /** 刷新存储占用 */
  async function refreshStorageUsage() {
    dbUsage.value = await db.getStorageUsage()
  }

  /** 导出设置 */
  async function exportData(): Promise<string> {
    return db.exportData()
  }

  /** 导入设置 */
  async function importData(json: string) {
    await db.importData(json)
    await init()
  }

  /** 清空 K线数据缓存 */
  async function clearKlineCache() {
    await db.clearKlineData()
    await refreshStorageUsage()
  }

  /** 重置为默认设置 */
  async function resetToDefault() {
    settings.value = { ...DEFAULT_SETTINGS, version: SETTINGS_VERSION }
    await persist()
  }

  /** 持久化到 IndexedDB */
  async function persist() {
    await db.settings.put(
      { ...settings.value, version: SETTINGS_VERSION } as AppSettings & { id: number },
      1,
    )
  }

  return {
    settings,
    loading,
    dbUsage,
    enabledExchanges,
    channels,
    cacheSettings,
    fetcherSettings,
    init,
    updateSettings,
    updateCacheSettings,
    updateFetcherSettings,
    setLanguage,
    setTheme,
    toggleExchange,
    addChannel,
    updateChannel,
    removeChannel,
    refreshStorageUsage,
    exportData,
    importData,
    clearKlineCache,
    resetToDefault,
  }
})
