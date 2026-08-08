import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from '@/app/App.vue'
import router from '@/router'
import { onCloudAuthStateChange } from '@/services/cloud/cloud-auth.service'
import { isCloudAuthRequired } from '@/services/runtime-mode.service'
import { useNotificationStore } from '@/stores/useNotificationStore'
import { useThemeStore } from '@/stores/useThemeStore'
import { usePwaStore } from '@/stores/usePwaStore'
import '@/styles/main.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

const themeStore = useThemeStore(pinia)
themeStore.initialize()
usePwaStore(pinia).initialize()

if (isCloudAuthRequired()) {
  onCloudAuthStateChange((_event, session) => {
    const currentRoute = router.currentRoute.value
    if (!session && currentRoute.name !== 'login') {
      void router.replace({ name: 'login', query: { redirect: currentRoute.fullPath } })
    }
    else if (session && currentRoute.name === 'login') {
      const redirect = typeof currentRoute.query.redirect === 'string'
        ? currentRoute.query.redirect
        : '/'
      const destination = redirect.startsWith('/') && !redirect.startsWith('//') && redirect !== '/login'
        ? redirect
        : '/'
      void router.replace(destination)
    }
  })
}

const notificationStore =
  useNotificationStore(pinia)

if (
  !notificationStore.sortedNotifications.some(
    notification =>
      notification.title ===
        'HY Freedom OS' &&
      notification.message ===
        '系統已成功啟動。',
  )
) {
  notificationStore.addNotification({
    type: 'success',
    title: 'HY Freedom OS',
    message: '系統已成功啟動。',
  })
}

app.mount('#app')
