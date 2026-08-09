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
  success: 'hy-app-toast--success',
  danger: 'hy-app-toast--danger',
  warning: 'hy-app-toast--warning',
  info: 'hy-app-toast--info',
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
        <article v-for="toast in visible" :key="toast.id" class="hy-app-toast pointer-events-auto overflow-hidden rounded-2xl border p-4 shadow-2xl shadow-black/30 backdrop-blur-xl" :class="toneClass[toast.type]">
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

<style>
.hy-app-toast {
  --toast-accent: #7dd3fc;
  --toast-border: rgba(56, 189, 248, 0.22);
  background: rgba(8, 47, 73, 0.95);
  border-color: var(--toast-border);
  color: var(--toast-accent);
}

.hy-app-toast--success {
  --toast-accent: #6ee7b7;
  --toast-border: rgba(52, 211, 153, 0.22);
  background: rgba(2, 44, 34, 0.95);
}

.hy-app-toast--danger {
  --toast-accent: #fda4af;
  --toast-border: rgba(251, 113, 133, 0.22);
  background: rgba(76, 5, 25, 0.95);
}

.hy-app-toast--warning {
  --toast-accent: #fcd34d;
  --toast-border: rgba(251, 191, 36, 0.22);
  background: rgba(69, 26, 3, 0.95);
}

.hy-app-toast--info {
  --toast-accent: #7dd3fc;
  --toast-border: rgba(56, 189, 248, 0.22);
  background: rgba(8, 47, 73, 0.95);
}

:root[data-theme='light'] .hy-app-toast {
  background: rgba(255, 255, 255, 0.97);
  border-color: var(--toast-border);
  color: var(--toast-accent);
  box-shadow:
    0 18px 45px rgba(15, 23, 42, 0.14),
    0 2px 8px rgba(15, 23, 42, 0.06);
}

:root[data-theme='light'] .hy-app-toast--success {
  --toast-accent: #047857;
  --toast-border: rgba(5, 150, 105, 0.24);
  background: rgba(240, 253, 250, 0.98);
}

:root[data-theme='light'] .hy-app-toast--danger {
  --toast-accent: #be123c;
  --toast-border: rgba(225, 29, 72, 0.22);
  background: rgba(255, 241, 242, 0.98);
}

:root[data-theme='light'] .hy-app-toast--warning {
  --toast-accent: #b45309;
  --toast-border: rgba(217, 119, 6, 0.24);
  background: rgba(255, 251, 235, 0.98);
}

:root[data-theme='light'] .hy-app-toast--info {
  --toast-accent: #0369a1;
  --toast-border: rgba(2, 132, 199, 0.22);
  background: rgba(240, 249, 255, 0.98);
}

:root[data-theme='light'] .hy-app-toast .text-zinc-100 {
  color: #0f172a !important;
}

:root[data-theme='light'] .hy-app-toast .text-zinc-400,
:root[data-theme='light'] .hy-app-toast .text-zinc-500 {
  color: #64748b !important;
}

:root[data-theme='light'] .hy-app-toast button:hover {
  background: rgba(15, 23, 42, 0.06);
  color: #334155 !important;
}
</style>
