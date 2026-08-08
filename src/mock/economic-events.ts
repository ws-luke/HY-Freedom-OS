import type { EconomicEvent } from '@/types'

export const mockEconomicEvents: EconomicEvent[] = [
  {
    id: 'event-1',
    time: '20:30',
    currency: 'USD',
    title: '美國重要經濟數據',
    impact: 'high',
    previous: '待更新',
    forecast: '待更新',
  },
  {
    id: 'event-2',
    time: '22:00',
    currency: 'USD',
    title: '美國市場信心數據',
    impact: 'medium',
    previous: '待更新',
    forecast: '待更新',
  },
]
