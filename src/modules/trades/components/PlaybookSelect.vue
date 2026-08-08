<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'

import { usePlaybookStore } from '@/stores/usePlaybookStore'

import type {
  PlaybookDirection,
  PlaybookRecord,
  PlaybookStatus,
} from '@/types/playbook'

const props = withDefaults(
  defineProps<{
    modelValue: string
    tradeDirection?: 'buy' | 'sell'
    includePaused?: boolean
    required?: boolean
  }>(),
  {
    tradeDirection: undefined,
    includePaused: false,
    required: false,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
  select: [playbook: PlaybookRecord | null]
}>()

const playbookStore = usePlaybookStore()

const {
  sortedPlaybooks,
} = storeToRefs(playbookStore)

const availablePlaybooks = computed(() => {
  return sortedPlaybooks.value.filter(playbook => {
    const matchesStatus =
      props.includePaused ||
      playbook.status !== 'paused'

    const matchesDirection =
      !props.tradeDirection ||
      playbook.direction === 'both' ||
      playbook.direction === props.tradeDirection

    return matchesStatus && matchesDirection
  })
})

const selectedPlaybook = computed(() => {
  const normalizedValue = props.modelValue
    .trim()
    .toLowerCase()

  if (!normalizedValue) {
    return null
  }

  return (
    sortedPlaybooks.value.find(playbook => {
      return (
        playbook.name.trim().toLowerCase() ===
          normalizedValue ||
        playbook.shortName.trim().toLowerCase() ===
          normalizedValue
      )
    }) ?? null
  )
})

const directionLabel = (
  direction: PlaybookDirection,
): string => {
  const labels: Record<PlaybookDirection, string> = {
    buy: '多單',
    sell: '空單',
    both: '雙向',
  }

  return labels[direction]
}

const statusLabel = (
  status: PlaybookStatus,
): string => {
  const labels: Record<PlaybookStatus, string> = {
    active: '正式使用',
    testing: '測試中',
    paused: '暫停使用',
  }

  return labels[status]
}

const statusClasses = (
  status: PlaybookStatus,
): string => {
  const classes: Record<PlaybookStatus, string> = {
    active:
      'border-emerald-500/25 bg-emerald-500/10 text-emerald-300',
    testing:
      'border-amber-500/25 bg-amber-500/10 text-amber-300',
    paused:
      'border-zinc-700 bg-zinc-800/70 text-zinc-400',
  }

  return classes[status]
}

const handleChange = (
  event: Event,
): void => {
  const target = event.target as HTMLSelectElement
  const value = target.value

  emit('update:modelValue', value)

  const playbook =
    sortedPlaybooks.value.find(
      item => item.name === value,
    ) ?? null

  emit('select', playbook)
}

const clearSelection = (): void => {
  emit('update:modelValue', '')
  emit('select', null)
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between gap-3">
      <span class="text-sm font-medium text-zinc-300">
        使用策略
      </span>

      <button
        v-if="modelValue"
        type="button"
        class="text-xs text-zinc-600 transition hover:text-rose-300"
        @click="clearSelection"
      >
        清除
      </button>
    </div>

    <select
      :value="modelValue"
      :required="required"
      class="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-zinc-100 outline-none transition focus:border-amber-500/40"
      @change="handleChange"
    >
      <option value="" disabled>
        請選擇交易策略
      </option>

      <option
        v-for="playbook in availablePlaybooks"
        :key="playbook.id"
        :value="playbook.name"
      >
        {{ playbook.name }}
        ·
        {{ directionLabel(playbook.direction) }}
        ·
        {{ statusLabel(playbook.status) }}
      </option>
    </select>

    <div
      v-if="selectedPlaybook"
      class="mt-3 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4"
    >
      <div class="flex flex-wrap items-center gap-2">
        <span
          class="rounded-full border border-sky-500/25 bg-sky-500/10 px-2.5 py-1 text-xs font-medium text-sky-300"
        >
          {{ directionLabel(selectedPlaybook.direction) }}
        </span>

        <span
          class="rounded-full border px-2.5 py-1 text-xs font-medium"
          :class="statusClasses(selectedPlaybook.status)"
        >
          {{ statusLabel(selectedPlaybook.status) }}
        </span>

        <span
          class="text-sm text-amber-300"
        >
          {{ '★'.repeat(selectedPlaybook.rating) }}
        </span>
      </div>

      <p class="mt-3 text-sm leading-6 text-zinc-400">
        {{ selectedPlaybook.description }}
      </p>

    </div>

    <div
      v-else-if="modelValue"
      class="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3"
    >
      <p class="text-sm text-amber-300">
        目前交易使用的是舊策略名稱「{{ modelValue }}」，策略庫中找不到完全相符的項目。
      </p>
    </div>

    <p
      v-if="availablePlaybooks.length === 0"
      class="mt-3 text-sm text-rose-300"
    >
      目前沒有符合交易方向且可使用的策略，請先到策略庫建立或啟用策略。
    </p>
  </div>
</template>
