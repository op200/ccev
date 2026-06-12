import { describe, it, expect } from 'vitest'

import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import { createRouter, createWebHistory } from 'vue-router'
import App from '../App.vue'
import en from '../i18n/locales/en'

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  messages: { en },
})

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: { template: '<div>Home</div>' } },
    { path: '/chart', name: 'chart', component: { template: '<div>Chart</div>' } },
    { path: '/integrator', name: 'integrator', component: { template: '<div>Integrator</div>' } },
    { path: '/docs', name: 'docs', component: { template: '<div>Docs</div>' } },
    { path: '/settings', name: 'settings', component: { template: '<div>Settings</div>' } },
  ],
})

describe('App', () => {
  it('mounts renders properly', async () => {
    router.push({ name: 'home' })
    await router.isReady()
    const wrapper = mount(App, {
      global: {
        plugins: [createPinia(), i18n, router],
      },
    })
    expect(wrapper.exists()).toBe(true)
  })
})
