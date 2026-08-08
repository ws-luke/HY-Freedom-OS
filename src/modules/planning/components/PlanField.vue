<script setup lang="ts">
withDefaults(
  defineProps<{
    label: string
    description?: string
    modelValue: string
    placeholder?: string
    rows?: number
    disabled?: boolean
  }>(),
  {
    description: '',
    placeholder: '',
    rows: 4,
    disabled: false,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>

<template>
  <label class="block">
    <span class="text-sm font-medium text-zinc-200">
      {{ label }}
    </span>

    <span
      v-if="description"
      class="mt-1 block text-xs leading-5 text-zinc-500"
    >
      {{ description }}
    </span>

    <textarea
      :value="modelValue"
      :placeholder="placeholder"
      :rows="rows"
      :disabled="disabled"
      class="mt-3 w-full resize-y rounded-2xl border border-zinc-800 bg-zinc-950/70 px-4 py-3 text-sm leading-6 text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-amber-500/40 disabled:cursor-not-allowed disabled:opacity-60"
      @input="
        emit(
          'update:modelValue',
          ($event.target as HTMLTextAreaElement).value,
        )
      "
    />
  </label>
</template>
