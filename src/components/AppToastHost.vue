<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'

import { useNotificationStore, type AppNotification } from '@/stores/useNotificationStore'

interface ToastItem extends AppNotification {
  timer: number
}

const notificationStore = useNotificationStore()
const visible = ref<ToastItem[]>([])
const knownIds = new Set(notificationStore.notifications.map(item => item.id))

const dismiss = (id: string): void => {
  const item = visible.value.find(toast => toast.id === id)
  if (item) window.clearTimeout(item.timer)
  visible.value = visible.value.filter(toast => toast.id !== id)
}

const show = (notification: AppNotification): void => {
  if (visible.value.some(item => item.id === notification.id)) return
  const timer = window.setTimeout(() => dismiss(notification.id), 4800)
  visible.value.unshift({ ...notification, timer })
  const overflowToast = visible.value.length > 4 ? visible.value.at(-1) : null
  if (overflowToast) dismiss(overflowToast.id)
}

onMounted(() => {
  watch(
    () => notificationStore.notifications.map(item => item.id),
    ids => {
      ids.forEach(id => {
        if (knownIds.has(id)) return
        knownIds.add(id)
        const notification = notificationStore.notifications.find(item => item.id === id)
        if (notification) show(notification)
      })
    },
  )
})

const toneClass: Record<AppNotification['type'], string> = {
  success: 'border-emerald-400/20 bg-emerald-950/95 text-emerald-300',
  danger: 'border-rose-400/20 bg-rose-950/95 text-rose-300',
  warning: 'border-amber-400/20 bg-amber-950/95 text-amber-300',
  info: 'border-sky-400/20 bg-sky-950/95 text-sky-300',
}

const label: Record<AppNotification['type'], string> = {
  success: '成功',
  danger: '錯誤',
  warning: '提醒',
  info: '通知',
}
</script>

<template>
  <Teleport to="body">
    <div class="pointer-events-none fixed right-3 top-[max(0.75rem,env(safe-area-inset-top))] z-[120] flex w-[min(24rem,calc(100vw-1.5rem))] flex-col gap-3 sm:right-5 sm:top-5" aria-live="polite" aria-atomic="false">
      <TransitionGroup enter-active-class="transition duration-250" enter-from-class="translate-x-6 opacity-0" leave-active-class="transition duration-200" leave-to-class="translate-x-6 opacity-0" move-class="transition duration-200">
        <article v-for="toast in visible" :key="toast.id" class="pointer-events-auto overflow-hidden rounded-2xl border p-4 shadow-2xl shadow-black/30 backdrop-blur-xl" :class="toneClass[toast.type]">
          <div class="flex items-start gap-3">
            <div class="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-current/10">
              <span class="text-sm font-bold">{{ toast.type === 'success' ? '✓' : toast.type === 'danger' ? '!' : toast.type === 'warning' ? '!' : 'i' }}</span>
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-[10px] font-semibold tracking-[0.14em] opacity-75">{{ label[toast.type] }}</p>
              <p class="mt-1 text-sm font-semibold text-zinc-100">{{ toast.title }}</p>
              <p class="mt-1 text-xs leading-5 text-zinc-400">{{ toast.message }}</p>
            </div>
            <button type="button" class="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-zinc-500 transition hover:bg-white/5 hover:text-zinc-200" aria-label="關閉通知" @click="dismiss(toast.id)">×</button>
          </div>
        </article>
      </TransitionGroup>
    </div>
  </Teleport>
</template>
