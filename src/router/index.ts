import { createRouter, createWebHashHistory } from 'vue-router'

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/pages/Home.vue'),
    },
    {
      path: '/chart',
      name: 'chart',
      component: () => import('@/pages/Chart.vue'),
    },
    {
      path: '/integrator',
      name: 'integrator',
      component: () => import('@/pages/Integrator.vue'),
    },
    {
      path: '/docs',
      name: 'docs',
      component: () => import('@/pages/Docs.vue'),
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('@/pages/Settings.vue'),
    },
  ],
})

export default router
