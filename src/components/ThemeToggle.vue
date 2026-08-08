<script setup lang="ts">
import { storeToRefs } from 'pinia'

import { useThemeStore } from '@/stores/useThemeStore'

const themeStore = useThemeStore()
const { isDark } = storeToRefs(themeStore)
</script>

<template>
  <button
    type="button"
    class="hy-theme-toggle"
    :aria-label="isDark ? '切換為亮色模式' : '切換為暗色模式'"
    :title="isDark ? '切換為亮色模式' : '切換為暗色模式'"
    @click="themeStore.toggleTheme()"
  >
    <svg
      v-if="isDark"
      viewBox="0 0 24 24"
      aria-hidden="true"
      class="h-[18px] w-[18px]"
      fill="none"
      stroke="currentColor"
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="1.8"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42" />
    </svg>

    <svg
      v-else
      viewBox="0 0 24 24"
      aria-hidden="true"
      class="h-[18px] w-[18px]"
      fill="none"
      stroke="currentColor"
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="1.8"
    >
      <path d="M20.5 14.2A8.4 8.4 0 0 1 9.8 3.5a8.5 8.5 0 1 0 10.7 10.7Z" />
    </svg>

    <span class="sr-only">
      {{ isDark ? '亮色模式' : '暗色模式' }}
    </span>
  </button>
</template>
