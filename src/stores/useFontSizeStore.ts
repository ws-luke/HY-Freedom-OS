import { ref } from 'vue'
import { defineStore } from 'pinia'

export type AppFontSize = 'small' | 'medium' | 'large'

const FONT_SIZE_STORAGE_KEY = 'hy-freedom-os:font-size'

const isFontSize = (value: string | null): value is AppFontSize =>
  value === 'small' || value === 'medium' || value === 'large'

const readStoredFontSize = (): AppFontSize => {
  if (typeof window === 'undefined') return 'medium'

  try {
    const stored = window.localStorage.getItem(FONT_SIZE_STORAGE_KEY)
    return isFontSize(stored) ? stored : 'medium'
  } catch {
    return 'medium'
  }
}

export const useFontSizeStore = defineStore('font-size', () => {
  const fontSize = ref<AppFontSize>(readStoredFontSize())

  const applyFontSize = (nextFontSize: AppFontSize): void => {
    if (typeof document === 'undefined') return
    document.documentElement.dataset.fontSize = nextFontSize
  }

  const persistFontSize = (nextFontSize: AppFontSize): void => {
    if (typeof window === 'undefined') return

    try {
      window.localStorage.setItem(FONT_SIZE_STORAGE_KEY, nextFontSize)
    } catch {
      // Keep the current session usable if browser storage is unavailable.
    }
  }

  const initialize = (): void => {
    applyFontSize(fontSize.value)
  }

  const setFontSize = (nextFontSize: AppFontSize): void => {
    persistFontSize(nextFontSize)
    fontSize.value = nextFontSize
    applyFontSize(nextFontSize)
  }

  return {
    fontSize,
    initialize,
    setFontSize,
  }
})
