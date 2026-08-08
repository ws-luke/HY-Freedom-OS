<script setup lang="ts">
import { computed } from 'vue'

type BadgeVariant =
  | 'neutral'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'violet'

type BadgeSize = 'sm' | 'md'

interface Props {
  variant?: BadgeVariant
  size?: BadgeSize
  dot?: boolean
}

const props = withDefaults(
  defineProps<Props>(),
  {
    variant: 'neutral',
    size: 'sm',
    dot: false,
  },
)

const variantClasses = computed(() => {
  const classes: Record<BadgeVariant, string> = {
    neutral:
      'border-zinc-700 bg-zinc-800/70 text-zinc-300',
    success:
      'border-emerald-500/25 bg-emerald-500/10 text-emerald-300',
    warning:
      'border-amber-500/25 bg-amber-500/10 text-amber-300',
    danger:
      'border-rose-500/25 bg-rose-500/10 text-rose-300',
    info:
      'border-sky-500/25 bg-sky-500/10 text-sky-300',
    violet:
      'border-violet-500/25 bg-violet-500/10 text-violet-300',
  }

  return classes[props.variant]
})

const sizeClasses = computed(() => {
  return props.size === 'md'
    ? 'px-3 py-1.5 text-sm'
    : 'px-2.5 py-1 text-xs'
})

const dotClasses = computed(() => {
  const classes: Record<BadgeVariant, string> = {
    neutral: 'bg-zinc-400',
    success: 'bg-emerald-400',
    warning: 'bg-amber-400',
    danger: 'bg-rose-400',
    info: 'bg-sky-400',
    violet: 'bg-violet-400',
  }

  return classes[props.variant]
})
</script>

<template>
  <span
    class="inline-flex items-center gap-2 rounded-full border font-medium"
    :class="[
      variantClasses,
      sizeClasses,
    ]"
  >
    <span
      v-if="dot"
      class="h-2 w-2 rounded-full"
      :class="dotClasses"
    />

    <slot />
  </span>
</template>