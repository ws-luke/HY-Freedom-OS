<script setup lang="ts">
import { computed } from 'vue'

type ProgressVariant =
  | 'neutral'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'

type ProgressSize = 'sm' | 'md'

interface Props {
  value: number
  max?: number
  variant?: ProgressVariant
  size?: ProgressSize
  showValue?: boolean
}

const props = withDefaults(
  defineProps<Props>(),
  {
    max: 100,
    variant: 'neutral',
    size: 'md',
    showValue: false,
  },
)

const percentage = computed(() => {
  if (
    !Number.isFinite(props.max) ||
    props.max <= 0
  ) {
    return 0
  }

  const normalizedValue = Number.isFinite(
    props.value,
  )
    ? props.value
    : 0

  return Math.min(
    100,
    Math.max(
      0,
      Math.round(
        (normalizedValue / props.max) * 100,
      ),
    ),
  )
})

const trackClasses = computed(() => {
  return props.size === 'sm'
    ? 'h-2'
    : 'h-2.5'
})

const barClasses = computed(() => {
  const classes: Record<
    ProgressVariant,
    string
  > = {
    neutral: 'bg-zinc-400',
    success: 'bg-emerald-400',
    warning: 'bg-amber-400',
    danger: 'bg-rose-400',
    info: 'bg-sky-400',
  }

  return classes[props.variant]
})
</script>

<template>
  <div>
    <div
      v-if="showValue"
      class="mb-2 flex items-center justify-between gap-4"
    >
      <slot name="label" />

      <span class="text-xs text-zinc-500">
        {{ percentage }}%
      </span>
    </div>

    <div
      class="overflow-hidden rounded-full bg-zinc-800"
      :class="trackClasses"
      role="progressbar"
      :aria-valuenow="percentage"
      aria-valuemin="0"
      aria-valuemax="100"
    >
      <div
        class="h-full rounded-full transition-all duration-500"
        :class="barClasses"
        :style="{
          width: `${percentage}%`,
        }"
      />
    </div>
  </div>
</template>