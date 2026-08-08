import { mockEconomicEvents } from '@/mock'
import type { EconomicEvent } from '@/types'

export const economicEventService = {
  getToday(): EconomicEvent[] {
    return structuredClone(mockEconomicEvents)
  },
}