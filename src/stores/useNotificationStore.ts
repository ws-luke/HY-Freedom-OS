import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

export type NotificationType =
  | 'info'
  | 'success'
  | 'warning'
  | 'danger'

export interface AppNotification {
  id: string
  type: NotificationType
  title: string
  message: string
  createdAt: string
  read: boolean
  route?: string
}

export interface AddNotificationInput {
  type?: NotificationType
  title: string
  message: string
  route?: string
}

const STORAGE_KEY =
  'hy-freedom-os:notifications'

const createId = (): string => {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID()
  }

  return `notification-${Date.now()}-${Math.random()
    .toString(16)
    .slice(2)}`
}

const readStoredNotifications =
  (): AppNotification[] => {
    if (typeof window === 'undefined') {
      return []
    }

    try {
      const raw =
        window.localStorage.getItem(
          STORAGE_KEY,
        )

      if (!raw) {
        return []
      }

      const parsed = JSON.parse(raw) as unknown

      if (!Array.isArray(parsed)) {
        return []
      }

      return parsed.filter(
        (
          item,
        ): item is AppNotification => {
          if (
            typeof item !== 'object' ||
            item === null
          ) {
            return false
          }

          const notification =
            item as Partial<AppNotification>

          return Boolean(
            typeof notification.id ===
              'string' &&
              typeof notification.title ===
                'string' &&
              typeof notification.message ===
                'string' &&
              typeof notification.createdAt ===
                'string' &&
              typeof notification.read ===
                'boolean' &&
              (
                notification.type ===
                  'info' ||
                notification.type ===
                  'success' ||
                notification.type ===
                  'warning' ||
                notification.type ===
                  'danger'
              ),
          )
        },
      )
    }
    catch {
      return []
    }
  }

export const useNotificationStore =
  defineStore(
    'notifications',
    () => {
      const notifications =
        ref<AppNotification[]>(
          readStoredNotifications(),
        )

      const sortedNotifications =
        computed(() =>
          [...notifications.value].sort(
            (a, b) =>
              new Date(
                b.createdAt,
              ).getTime() -
              new Date(
                a.createdAt,
              ).getTime(),
          ),
        )

      const unreadNotifications =
        computed(() =>
          sortedNotifications.value.filter(
            notification =>
              !notification.read,
          ),
        )

      const unreadCount = computed(
        () =>
          unreadNotifications.value
            .length,
      )

      const save = (): void => {
        if (
          typeof window === 'undefined'
        ) {
          return
        }

        window.localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(
            notifications.value,
          ),
        )
      }

      const addNotification = (
        input: AddNotificationInput,
      ): AppNotification => {
        const notification: AppNotification =
          {
            id: createId(),
            type: input.type ?? 'info',
            title: input.title.trim(),
            message: input.message.trim(),
            createdAt:
              new Date().toISOString(),
            read: false,
            route: input.route,
          }

        notifications.value.unshift(
          notification,
        )

        save()

        return notification
      }

      const markAsRead = (
        notificationId: string,
      ): void => {
        const notification =
          notifications.value.find(
            item =>
              item.id === notificationId,
          )

        if (!notification) {
          return
        }

        notification.read = true
        save()
      }

      const markAsUnread = (
        notificationId: string,
      ): void => {
        const notification =
          notifications.value.find(
            item =>
              item.id === notificationId,
          )

        if (!notification) {
          return
        }

        notification.read = false
        save()
      }

      const markAllAsRead = (): void => {
        notifications.value.forEach(
          notification => {
            notification.read = true
          },
        )

        save()
      }

      const removeNotification = (
        notificationId: string,
      ): void => {
        notifications.value =
          notifications.value.filter(
            notification =>
              notification.id !==
              notificationId,
          )

        save()
      }

      const clearNotifications =
        (): void => {
          notifications.value = []
          save()
        }

      return {
        notifications,
        sortedNotifications,
        unreadNotifications,
        unreadCount,

        addNotification,
        markAsRead,
        markAsUnread,
        markAllAsRead,
        removeNotification,
        clearNotifications,
      }
    },
  )