<script setup lang="ts">
import { onMounted, onUnmounted, watch } from 'vue'

const props = withDefaults(defineProps<{
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  busy?: boolean
  tone?: 'default' | 'danger'
}>(), {
  confirmLabel: '確認',
  cancelLabel: '取消',
  busy: false,
  tone: 'default',
})

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

const handleKeydown = (event: KeyboardEvent): void => {
  if (event.key === 'Escape' && props.open && !props.busy) emit('cancel')
}

watch(() => props.open, open => {
  document.body.style.overflow = open ? 'hidden' : ''
})

onMounted(() => window.addEventListener('keydown', handleKeydown))
onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  document.body.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <Transition enter-active-class="transition duration-200" enter-from-class="opacity-0" leave-active-class="transition duration-150" leave-to-class="opacity-0">
      <div v-if="open" class="fixed inset-0 z-[100] grid place-items-center bg-black/65 p-4 backdrop-blur-sm" @click.self="!busy && emit('cancel')">
        <Transition appear enter-active-class="transition duration-200" enter-from-class="translate-y-3 scale-95 opacity-0">
          <section role="alertdialog" aria-modal="true" :aria-label="title" class="w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-zinc-900 shadow-2xl shadow-black/50">
            <div class="p-6">
              <div class="flex items-start gap-4">
                <div class="grid h-11 w-11 shrink-0 place-items-center rounded-2xl" :class="tone === 'danger' ? 'bg-rose-400/10 text-rose-300' : 'bg-sky-400/10 text-sky-300'">
                  <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                    <path d="M12 8v4m0 4h.01M10.3 3.8 2.7 17a2 2 0 0 0 1.74 3h15.12A2 2 0 0 0 21.3 17L13.7 3.8a2 2 0 0 0-3.4 0Z" />
                  </svg>
                </div>
                <div class="min-w-0">
                  <h2 class="text-lg font-semibold text-zinc-100">{{ title }}</h2>
                  <p class="mt-2 text-sm leading-6 text-zinc-500">{{ message }}</p>
                </div>
              </div>
            </div>
            <div class="flex justify-end gap-3 border-t border-white/[0.06] bg-black/15 px-6 py-4">
              <button type="button" :disabled="busy" class="rounded-xl border border-zinc-700 px-4 py-2.5 text-sm font-medium text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-200 disabled:opacity-50" @click="emit('cancel')">{{ cancelLabel }}</button>
              <button type="button" :disabled="busy" class="rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-wait disabled:opacity-60" :class="tone === 'danger' ? 'bg-rose-400 text-zinc-950 hover:bg-rose-300' : 'bg-sky-300 text-zinc-950 hover:bg-sky-200'" @click="emit('confirm')">{{ busy ? '處理中…' : confirmLabel }}</button>
            </div>
          </section>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
