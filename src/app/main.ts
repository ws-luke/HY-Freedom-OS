import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from '@/app/App.vue'
import router from '@/router'
import { useNotificationStore } from '@/stores/useNotificationStore'
import { useThemeStore } from '@/stores/useThemeStore'
import '@/styles/main.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

const themeStore = useThemeStore(pinia)
themeStore.initialize()

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
