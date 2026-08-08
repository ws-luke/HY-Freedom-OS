import { watch } from 'vue'
import { storeToRefs } from 'pinia'

import { useNotificationStore } from '@/stores/useNotificationStore'
import { useTradingRiskStore } from '@/stores/useTradingRiskStore'

const getLocalDateKey = (): string => {
  const now = new Date()

  const year = now.getFullYear()
  const month = String(
    now.getMonth() + 1,
  ).padStart(2, '0')
  const day = String(
    now.getDate(),
  ).padStart(2, '0')

  return `${year}-${month}-${day}`
}

export const useTradingRiskNotifications =
  (): void => {
    const tradingRiskStore =
      useTradingRiskStore()

    const notificationStore =
      useNotificationStore()

    const {
      risk,
    } = storeToRefs(tradingRiskStore)

    const notifiedKeys = new Set<string>()

    const notifyOnce = (
      key: string,
      title: string,
      message: string,
      type:
        | 'info'
        | 'success'
        | 'warning'
        | 'danger',
    ): void => {
      const datedKey =
        `${getLocalDateKey()}:${key}`

      if (notifiedKeys.has(datedKey)) {
        return
      }

      notifiedKeys.add(datedKey)

      notificationStore.addNotification({
        type,
        title,
        message,
        route: '/trading-risk',
      })
    }

    watch(
      risk,
      currentRisk => {
        if (
          currentRisk.tradeLimitReached
        ) {
          notifyOnce(
            'trade-limit',
            '今日交易次數已達上限',
            '系統已停止今日新增交易，請進行復盤。',
            'danger',
          )
        }

        if (
          currentRisk.dailyLossReached
        ) {
          notifyOnce(
            'daily-loss',
            '今日虧損已達限制',
            '請立即停止交易，避免擴大虧損。',
            'danger',
          )
        }

        if (
          currentRisk
            .consecutiveLossReached
        ) {
          notifyOnce(
            'consecutive-loss',
            '連續虧損已達限制',
            '建議暫停交易，重新檢查策略與情緒狀態。',
            'danger',
          )
        }

        if (currentRisk.riskExceeded) {
          notifyOnce(
            'risk-exceeded',
            '單筆風險超過限制',
            '今日紀錄中有交易超過單筆風險上限。',
            'danger',
          )
        }

        if (
          currentRisk.level ===
          'warning'
        ) {
          notifyOnce(
            'risk-warning',
            '今日風控接近上限',
            '下一筆交易請提高進場標準並降低風險。',
            'warning',
          )
        }
      },
      {
        immediate: true,
        deep: true,
      },
    )
  }