import { watch } from 'vue'
import { storeToRefs } from 'pinia'

import { usePlaybookStore } from '@/stores/usePlaybookStore'
import { useTradeStore } from '@/stores/useTradeStore'

export const usePlaybookPerformanceSync = (): void => {
  const tradeStore = useTradeStore()
  const playbookStore = usePlaybookStore()

  const {
    trades,
  } = storeToRefs(tradeStore)

  const syncPlaybookPerformance = (): void => {
    playbookStore.playbooks.forEach(playbook => {
      const matchedTrades = trades.value.filter(
        trade => {
          if (trade.positionStatus !== 'closed') return false

          const tradePlaybook =
            trade.playbook.trim().toLowerCase()

          const playbookName =
            playbook.name.trim().toLowerCase()

          const shortName =
            playbook.shortName.trim().toLowerCase()

          return (
            tradePlaybook === playbookName ||
            tradePlaybook === shortName ||
            tradePlaybook.includes(playbookName) ||
            tradePlaybook.includes(shortName)
          )
        },
      )

      const totalTrades =
        matchedTrades.length

      const wins =
        matchedTrades.filter(
          trade => trade.result === 'win',
        ).length

      const totalR =
        matchedTrades.reduce(
          (total, trade) =>
            total + trade.rMultiple,
          0,
        )

      const averageR =
        totalTrades > 0
          ? Number(
              (
                totalR /
                totalTrades
              ).toFixed(2),
            )
          : 0

      playbookStore.updatePerformance(
        playbook.id,
        totalTrades,
        wins,
        averageR,
      )
    })
  }

  watch(
    trades,
    syncPlaybookPerformance,
    {
      deep: true,
      immediate: true,
    },
  )
}
