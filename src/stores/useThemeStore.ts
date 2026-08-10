import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'

export type AppTheme = 'dark' | 'light'

const THEME_STORAGE_KEY = 'hy-freedom-os:theme'

const readStoredTheme = (): AppTheme => {
  if (typeof window === 'undefined') {
    return 'dark'
  }

  let storedTheme: string | null = null

  try {
    storedTheme = window.localStorage.getItem(
      THEME_STORAGE_KEY,
    )
  } catch {
    return 'dark'
  }

  return storedTheme === 'light' ? 'light' : 'dark'
}

export const useThemeStore = defineStore('theme', () => {
  const theme = ref<AppTheme>(readStoredTheme())

  const isDark = computed(
    () => theme.value === 'dark',
  )

  const syncDocumentTheme = (): void => {
    if (typeof document === 'undefined') {
      return
    }

    document.documentElement.dataset.theme = theme.value
    document.documentElement.style.colorScheme = theme.value

    const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    themeColor?.setAttribute(
      'content',
      theme.value === 'light' ? '#f4f4f5' : '#09090b',
    )
  }

  const initialize = (): void => {
    syncDocumentTheme()
  }

  const persistTheme = (nextTheme: AppTheme): void => {
    if (typeof window === 'undefined') {
      return
    }

    try {
      window.localStorage.setItem(
        THEME_STORAGE_KEY,
        nextTheme,
      )
    } catch {
      // Theme still works for the current session when storage is unavailable.
    }
  }

  const setTheme = (nextTheme: AppTheme): void => {
    // Save synchronously before other lifecycle work can read the old value.
    persistTheme(nextTheme)
    theme.value = nextTheme
    syncDocumentTheme()
  }

  const toggleTheme = (): void => {
    theme.value = isDark.value ? 'light' : 'dark'
  }

  watch(theme, nextTheme => {
    persistTheme(nextTheme)
    syncDocumentTheme()
  })

  return {
    theme,
    isDark,
    initialize,
    setTheme,
    toggleTheme,
  }
})
