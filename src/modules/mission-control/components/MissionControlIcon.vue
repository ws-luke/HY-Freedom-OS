<script setup lang="ts">
type IconName =
  | 'arrow'
  | 'calendar'
  | 'chart'
  | 'check'
  | 'clock'
  | 'coach'
  | 'journal'
  | 'plan'
  | 'review'
  | 'shield'
  | 'target'
  | 'trade'
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
    :stroke-width="strokeWidth"
    stroke="currentColor"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <template v-if="name === 'arrow'">
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </template>

    <template v-else-if="name === 'calendar'">
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M8 3v4M16 3v4M3 10h18" />
      <path d="M8 14h.01M12 14h.01M16 14h.01M8 17h.01M12 17h.01" />
    </template>

    <template v-else-if="name === 'chart'">
      <path d="M4 19V9M10 19V5M16 19v-7M22 19H2" />
      <path d="m4 7 6-4 6 6 5-5" />
    </template>

    <template v-else-if="name === 'check'">
      <path d="m5 12 4 4L19 6" />
    </template>

    <template v-else-if="name === 'clock'">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </template>

    <template v-else-if="name === 'coach'">
      <path d="M8 4h8a4 4 0 0 1 4 4v5a4 4 0 0 1-4 4h-3l-4 3v-3H8a4 4 0 0 1-4-4V8a4 4 0 0 1 4-4Z" />
      <path d="M8.5 10h.01M12 10h.01M15.5 10h.01" />
    </template>

    <template v-else-if="name === 'journal'">
      <path d="M6 3h12a2 2 0 0 1 2 2v16H7a3 3 0 0 1-3-3V5a2 2 0 0 1 2-2Z" />
      <path d="M8 3v18M11 8h5M11 12h5" />
    </template>

    <template v-else-if="name === 'plan'">
      <rect x="5" y="3" width="14" height="18" rx="3" />
      <path d="M9 3.5V2h6v1.5M9 9h6M9 13h6M9 17h4" />
    </template>

    <template v-else-if="name === 'review'">
      <path d="M4 4h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H8l-4 4V4Z" />
      <path d="m9 10 2 2 4-5" />
    </template>

    <template v-else-if="name === 'shield'">
      <path d="M12 3 4.5 6v5.5c0 4.5 3 7.5 7.5 9.5 4.5-2 7.5-5 7.5-9.5V6L12 3Z" />
      <path d="m9 12 2 2 4-5" />
    </template>

    <template v-else-if="name === 'target'">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1" />
    </template>

    <template v-else-if="name === 'trade'">
      <path d="M4 17 9 12l3 3 8-9" />
      <path d="M15 6h5v5" />
    </template>

    <template v-else-if="name === 'wallet'">
      <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4H19v16H6.5A2.5 2.5 0 0 1 4 17.5v-11Z" />
      <path d="M4 7h15M15 11h6v5h-6a2.5 2.5 0 0 1 0-5Z" />
    </template>
  </svg>
</template>
