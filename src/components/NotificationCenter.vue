<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'

import { useNotificationStore } from '@/stores/useNotificationStore'
import { useConfirmDialogStore } from '@/stores/useConfirmDialogStore'

import type {
  AppNotification,
  NotificationType,
} from '@/stores/useNotificationStore'

const notificationStore =
  useNotificationStore()
const confirmDialog = useConfirmDialogStore()

const router = useRouter()

const {
  sortedNotifications,
  unreadCount,
} = storeToRefs(notificationStore)

const open = ref(false)

const recentNotifications = computed(() =>
  sortedNotifications.value.slice(0, 20),
)

const typeClasses: Record<
  NotificationType,
  {
    icon: string
    container: string
    iconContainer: string
  }
> = {
  info: {
    icon: 'i',
    container:
      'border-sky-500/15 bg-sky-500/5',
    iconContainer:
      'border-sky-500/25 bg-sky-500/10 text-sky-300',
  },
  success: {
    icon: '✓',
    container:
      'border-emerald-500/15 bg-emerald-500/5',
    iconContainer:
      'border-emerald-500/25 bg-emerald-500/10 text-emerald-300',
  },
  warning: {
    icon: '!',
    container:
      'border-amber-500/15 bg-amber-500/5',
    iconContainer:
      'border-amber-500/25 bg-amber-500/10 text-amber-300',
  },
  danger: {
    icon: '×',
    container:
      'border-rose-500/15 bg-rose-500/5',
    iconContainer:
      'border-rose-500/25 bg-rose-500/10 text-rose-300',
  },
}

const formatRelativeTime = (
  value: string,
): string => {
  const timestamp = new Date(value).getTime()

  if (Number.isNaN(timestamp)) {
    return ''
  }

  const seconds = Math.max(
    0,
    Math.floor(
      (Date.now() - timestamp) / 1000,
    ),
  )

  if (seconds < 60) {
    return '剛剛'
  }

  const minutes = Math.floor(
    seconds / 60,
  )

  if (minutes < 60) {
    return `${minutes} 分鐘前`
  }

  const hours = Math.floor(
    minutes / 60,
  )

  if (hours < 24) {
    return `${hours} 小時前`
  }

  const days = Math.floor(
    hours / 24,
  )

  if (days < 7) {
    return `${days} 天前`
  }

  return new Intl.DateTimeFormat(
    'zh-TW',
    {
      month: '2-digit',
      day: '2-digit',
    },
  ).format(new Date(timestamp))
}

const togglePanel = (): void => {
  open.value = !open.value
}

const closePanel = (): void => {
  open.value = false
}

const openNotification = async (
  notification: AppNotification,
): Promise<void> => {
  notificationStore.markAsRead(
    notification.id,
  )

  closePanel()

  if (!notification.route) {
    return
  }

  await router.push(notification.route)
}

const toggleReadStatus = (
  notification: AppNotification,
): void => {
  if (notification.read) {
    notificationStore.markAsUnread(
      notification.id,
    )

    return
  }

  notificationStore.markAsRead(
    notification.id,
  )
}

const clearAll = async (): Promise<void> => {
  if (
    sortedNotifications.value.length === 0
  ) {
    return
  }

  const confirmed = await confirmDialog.ask({
    title: '清除所有通知？',
    message: '通知中心內的所有歷史訊息都會被移除，此操作無法復原。',
    confirmLabel: '全部清除',
    tone: 'danger',
  })

  if (!confirmed) {
    return
  }

  notificationStore.clearNotifications()
}
</script>

<template>
  <div class="relative">
    <button
      type="button"
      class="relative flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/70 text-zinc-400 transition hover:border-zinc-700 hover:text-zinc-100"
      aria-label="開啟通知中心"
      :aria-expanded="open"
      @click="togglePanel"
    >
      <span class="text-lg">
        🔔
      </span>

      <span
        v-if="unreadCount > 0"
        class="absolute -right-1.5 -top-1.5 flex min-h-5 min-w-5 items-center justify-center rounded-full border-2 border-zinc-950 bg-rose-500 px-1 text-[10px] font-bold text-white"
      >
        {{
          unreadCount > 99
            ? '99+'
            : unreadCount
        }}
      </span>
    </button>

    <div
      v-if="open"
      class="fixed inset-0 z-40"
      @click="closePanel"
    />

    <Transition
      enter-active-class="transition duration-150"
      enter-from-class="translate-y-2 opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition duration-100"
      leave-from-class="translate-y-0 opacity-100"
      leave-to-class="translate-y-2 opacity-0"
    >
      <section
        v-if="open"
        class="absolute right-0 top-12 z-50 flex max-h-[min(620px,calc(100vh-6rem))] w-[min(420px,calc(100vw-2rem))] flex-col overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950 shadow-2xl shadow-black/60"
      >
        <header
          class="flex items-start justify-between gap-4 border-b border-zinc-800 p-5"
        >
          <div>
            <p
              class="text-xs font-medium tracking-[0.18em] text-sky-400"
            >
              NOTIFICATIONS
            </p>

            <h2
              class="mt-1 text-lg font-semibold text-zinc-100"
            >
              通知中心
            </h2>

            <p
              class="mt-1 text-xs text-zinc-500"
            >
              {{ unreadCount }} 則未讀通知
            </p>
          </div>

          <button
            type="button"
            class="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-800 text-lg text-zinc-500 transition hover:border-zinc-700 hover:text-zinc-200"
            aria-label="關閉通知中心"
            @click="closePanel"
          >
            ×
          </button>
        </header>

        <div
          v-if="recentNotifications.length"
          class="flex-1 space-y-3 overflow-y-auto p-4"
        >
          <article
            v-for="notification in recentNotifications"
            :key="notification.id"
            class="group rounded-2xl border p-4 transition"
            :class="[
              typeClasses[
                notification.type
              ].container,
              notification.read
                ? 'opacity-60'
                : '',
            ]"
          >
            <div
              class="flex items-start gap-3"
            >
              <button
                type="button"
                class="flex min-w-0 flex-1 items-start gap-3 text-left"
                @click="
                  openNotification(
                    notification,
                  )
                "
              >
                <span
                  class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border text-sm font-bold"
                  :class="
                    typeClasses[
                      notification.type
                    ].iconContainer
                  "
                >
                  {{
                    typeClasses[
                      notification.type
                    ].icon
                  }}
                </span>

                <span class="min-w-0 flex-1">
                  <span
                    class="flex items-start gap-2"
                  >
                    <span
                      class="flex-1 font-medium text-zinc-200"
                    >
                      {{ notification.title }}
                    </span>

                    <span
                      v-if="!notification.read"
                      class="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-sky-400"
                    />
                  </span>

                  <span
                    class="mt-1 block text-sm leading-6 text-zinc-500"
                  >
                    {{ notification.message }}
                  </span>

                  <span
                    class="mt-2 block text-xs text-zinc-600"
                  >
                    {{
                      formatRelativeTime(
                        notification.createdAt,
                      )
                    }}
                  </span>
                </span>
              </button>

              <div
                class="flex shrink-0 flex-col gap-1 opacity-0 transition group-hover:opacity-100"
              >
                <button
                  type="button"
                  class="flex h-7 w-7 items-center justify-center rounded-lg text-xs text-zinc-500 transition hover:bg-zinc-800 hover:text-zinc-200"
                  :title="
                    notification.read
                      ? '標示為未讀'
                      : '標示為已讀'
                  "
                  @click="
                    toggleReadStatus(
                      notification,
                    )
                  "
                >
                  {{
                    notification.read
                      ? '○'
                      : '●'
                  }}
                </button>

                <button
                  type="button"
                  class="flex h-7 w-7 items-center justify-center rounded-lg text-sm text-zinc-500 transition hover:bg-rose-500/10 hover:text-rose-300"
                  title="刪除通知"
                  @click="
                    notificationStore
                      .removeNotification(
                        notification.id,
                      )
                  "
                >
                  ×
                </button>
              </div>
            </div>
          </article>
        </div>

        <div
          v-else
          class="flex flex-1 flex-col items-center justify-center p-10 text-center"
        >
          <div
            class="flex h-12 w-12 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900 text-xl"
          >
            🔔
          </div>

          <p
            class="mt-4 font-medium text-zinc-300"
          >
            目前沒有通知
          </p>

          <p
            class="mt-2 text-sm leading-6 text-zinc-600"
          >
            交易、風控與系統提醒會顯示在這裡。
          </p>
        </div>

        <footer
          v-if="recentNotifications.length"
          class="flex items-center justify-between gap-3 border-t border-zinc-800 p-4"
        >
          <button
            type="button"
            :disabled="unreadCount === 0"
            class="rounded-xl border border-zinc-800 px-4 py-2 text-xs font-medium text-zinc-400 transition hover:border-sky-500/30 hover:text-sky-300 disabled:cursor-not-allowed disabled:opacity-40"
            @click="
              notificationStore
                .markAllAsRead()
            "
          >
            全部標示已讀
          </button>

          <button
            type="button"
            class="rounded-xl px-4 py-2 text-xs font-medium text-rose-300 transition hover:bg-rose-500/10"
            @click="clearAll"
          >
            清除全部
          </button>
        </footer>
      </section>
    </Transition>
  </div>
</template>
