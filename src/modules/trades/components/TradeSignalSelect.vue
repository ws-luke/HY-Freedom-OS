<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useSignalStore } from '@/stores/useSignalStore'

defineProps<{
  modelValue: string | null
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string | null]
}>()

const signalStore = useSignalStore()
const { selectableSignals } = storeToRefs(signalStore)

const updateValue = (event: Event): void => {
  const value = (event.target as HTMLSelectElement).value
  emit('update:modelValue', value || null)
}
</script>

<template>
  <label class="block">
    <span class="text-sm font-medium text-zinc-300">進場確認訊號</span>
    <select
      :value="modelValue ?? ''"
      :disabled="disabled"
      class="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-zinc-100 outline-none transition focus:border-sky-500/40 disabled:cursor-not-allowed disabled:opacity-50"
      @change="updateValue"
    >
      <option value="">未指定訊號</option>
      <option v-for="signal in selectableSignals" :key="signal.id" :value="signal.id">
        {{ signal.name }} · {{ signal.timeframe }}
      </option>
    </select>
    <p class="mt-2 text-xs text-zinc-600">記錄真正觸發這筆進場的確認訊號；訊號可在 Playbook 自訂。</p>
  </label>
</template>
