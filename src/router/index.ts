import { createRouter, createWebHistory } from 'vue-router'

import MainLayout from '@/layouts/MainLayout.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
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

export default router