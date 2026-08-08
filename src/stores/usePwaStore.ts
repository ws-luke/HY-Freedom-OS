import { computed, ref, shallowRef } from 'vue'
import { defineStore } from 'pinia'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

const isStandaloneDisplay = (): boolean => {
  if (typeof window === 'undefined') return false
  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean }
  return window.matchMedia('(display-mode: standalone)').matches || navigatorWithStandalone.standalone === true
}

export const usePwaStore = defineStore('pwa', () => {
  const initialized = ref(false)
  const online = ref(typeof navigator === 'undefined' || navigator.onLine !== false)
  const installed = ref(isStandaloneDisplay())
  const installPrompt = shallowRef<BeforeInstallPromptEvent | null>(null)
  const serviceWorkerReady = ref(false)
  const updateAvailable = ref(false)
  const registration = shallowRef<ServiceWorkerRegistration | null>(null)
  let reloadOnControllerChange = false

  const isIos = computed(() => {
    if (typeof navigator === 'undefined') return false
    return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  })

  const canInstall = computed(() => Boolean(installPrompt.value) && !installed.value)

  const initialize = (): void => {
    if (initialized.value || typeof window === 'undefined') return
    initialized.value = true

    window.addEventListener('online', () => { online.value = true })
    window.addEventListener('offline', () => { online.value = false })
    window.addEventListener('appinstalled', () => {
      installed.value = true
      installPrompt.value = null
    })
    window.addEventListener('beforeinstallprompt', event => {
      event.preventDefault()
      installPrompt.value = event as BeforeInstallPromptEvent
    })

    if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return

    void navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then(result => {
        registration.value = result
        serviceWorkerReady.value = true

        if (result.waiting && navigator.serviceWorker.controller) updateAvailable.value = true

        result.addEventListener('updatefound', () => {
          const worker = result.installing
          if (!worker) return
          worker.addEventListener('statechange', () => {
            if (worker.state === 'installed' && navigator.serviceWorker.controller) {
              updateAvailable.value = true
            }
          })
        })
      })
      .catch(() => {
        serviceWorkerReady.value = false
      })

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!reloadOnControllerChange) return
      reloadOnControllerChange = false
      window.location.reload()
    })
  }

  const install = async (): Promise<boolean> => {
    const prompt = installPrompt.value
    if (!prompt) return false
    await prompt.prompt()
    const choice = await prompt.userChoice
    if (choice.outcome === 'accepted') installPrompt.value = null
    return choice.outcome === 'accepted'
  }

  const applyUpdate = (): void => {
    const waiting = registration.value?.waiting
    if (!waiting) return
    reloadOnControllerChange = true
    waiting.postMessage({ type: 'SKIP_WAITING' })
  }

  return {
    online,
    installed,
    serviceWorkerReady,
    updateAvailable,
    isIos,
    canInstall,
    initialize,
    install,
    applyUpdate,
  }
})
