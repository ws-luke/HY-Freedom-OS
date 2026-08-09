import { createRouter, createWebHistory } from 'vue-router'

import MainLayout from '@/layouts/MainLayout.vue'
import { getCloudSession } from '@/services/cloud/cloud-auth.service'
import { isCloudAuthRequired } from '@/services/runtime-mode.service'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/modules/auth/views/LoginView.vue'),
    },
    {
      path: '/',
      component: MainLayout,
      children: [
        {
          path: '',
          name: 'mission-control',
          component: () =>
            import('@/modules/mission-control/MissionControlView.vue'),
        },
        {
          path: 'planning',
          name: 'planning',
          component: () =>
            import('@/modules/planning/views/PlanningView.vue'),
        },
        {
          path: 'economic-calendar',
          name: 'economic-calendar',
          component: () =>
            import(
              '@/modules/economic-calendar/views/EconomicCalendarView.vue'
            ),
        },
        {
          path: 'trades',
          name: 'trades',
          component: () =>
            import('@/modules/trades/views/TradesView.vue'),
        },
        {
          path: '/trade-analytics',
          name: 'trade-analytics',
          component: () =>
            import(
              '@/modules/trades/views/TradeAnalyticsView.vue'
            ),
        },
        {
          path: '/trading-risk',
          name: 'trading-risk',
          component: () =>
            import(
              '@/modules/trades/views/TradingRiskView.vue'
            ),
        },
        {
          path: 'playbook',
          name: 'playbook',
          component: () =>
            import('@/modules/playbook/views/PlaybookView.vue'),
        },
        {
          path: 'review',
          name: 'review',
          component: () =>
            import('@/modules/review/views/ReviewView.vue'),
        },
        {
          path: 'ai-coach',
          name: 'ai-coach',
          component: () =>
            import(
              '@/modules/ai-coach/views/AiCoachView.vue'
            ),
        },
        {
          path: 'accounts',
          name: 'accounts',
          component: () =>
            import('@/modules/accounts/views/AccountsView.vue'),
        },
        {
          path: 'investment',
          name: 'investment',
          component: () =>
            import('@/modules/investment/views/InvestmentView.vue'),
        },
        {
          path: 'tools',
          name: 'tools',
          component: () =>
            import('@/modules/tools/views/ToolsView.vue'),
        },
        {
          path: 'settings',
          name: 'settings',
          component: () =>
            import('@/modules/settings/views/SettingsView.vue'),
        },
      ],
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
})

router.beforeEach(async to => {
  if (!isCloudAuthRequired()) {
    return to.name === 'login' ? { name: 'mission-control' } : true
  }

  let session = null
  try { session = await getCloudSession() }
  catch { session = null }

  if (to.name === 'login') {
    const resettingPassword = to.query.mode === 'reset'
    return session && !resettingPassword ? { name: 'mission-control' } : true
  }
  if (!session) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  return true
})

export default router
