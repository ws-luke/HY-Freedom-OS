<script setup lang="ts">
type IconName =
  | 'account'
  | 'activity'
  | 'arrow-down'
  | 'arrow-up'
  | 'chart'
  | 'chevron'
  | 'close'
  | 'edit'
  | 'plus'
  | 'receipt'
  | 'search'
  | 'shield'
  | 'trash'
  | 'wallet'

withDefaults(
  defineProps<{
    name: IconName
    size?: number
    strokeWidth?: number
  }>(),
  {
    size: 20,
    strokeWidth: 1.8,
  },
)
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    stroke="currentColor"
    :stroke-width="strokeWidth"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <template v-if="name === 'account'">
      <rect x="3" y="4" width="18" height="16" rx="3" />
      <path d="M8 9h8M8 13h5M8 17h3" />
    </template>
    <template v-else-if="name === 'activity'">
      <path d="M3 12h4l2.2-5 4.1 10 2.4-5H21" />
    </template>
    <template v-else-if="name === 'arrow-down'">
      <path d="M12 4v16M6 14l6 6 6-6" />
    </template>
    <template v-else-if="name === 'arrow-up'">
      <path d="M12 20V4M6 10l6-6 6 6" />
    </template>
    <template v-else-if="name === 'chart'">
      <path d="M4 19V9M10 19V5M16 19v-7M22 19H2" />
      <path d="m4 7 6-4 6 6 5-5" />
    </template>
    <template v-else-if="name === 'chevron'">
      <path d="m9 6 6 6-6 6" />
    </template>
    <template v-else-if="name === 'close'">
      <path d="m6 6 12 12M18 6 6 18" />
    </template>
    <template v-else-if="name === 'edit'">
      <path d="M13.5 6.5 17.5 10.5M4 20l4.5-1 10-10a2.8 2.8 0 0 0-4-4l-10 10L4 20Z" />
    </template>
    <template v-else-if="name === 'plus'">
      <path d="M12 5v14M5 12h14" />
    </template>
    <template v-else-if="name === 'receipt'">
      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" />
      <path d="M9 8h6M9 12h6M9 16h3" />
    </template>
    <template v-else-if="name === 'search'">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </template>
    <template v-else-if="name === 'shield'">
      <path d="M12 3 4.5 6v5.5c0 4.5 3 7.5 7.5 9.5 4.5-2 7.5-5 7.5-9.5V6L12 3Z" />
      <path d="m9 12 2 2 4-5" />
    </template>
    <template v-else-if="name === 'trash'">
      <path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6M14 11v6" />
    </template>
    <template v-else-if="name === 'wallet'">
      <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4H19v16H6.5A2.5 2.5 0 0 1 4 17.5v-11Z" />
      <path d="M4 7h15M15 11h6v5h-6a2.5 2.5 0 0 1 0-5Z" />
    </template>
  </svg>
</template>
