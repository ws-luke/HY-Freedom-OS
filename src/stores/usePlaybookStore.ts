import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { queueCloudDeletion } from '@/services/cloud/cloud-deletion.service'

import type {
  NewPlaybookInput,
  PlaybookRecord,
  PlaybookStatistics,
} from '@/types/playbook'

const STORAGE_KEY = 'hy-freedom-os:playbooks'

const createDefaultPlaybooks = (): PlaybookRecord[] => [
  {
    id: 'playbook-w',
    name: 'W 型支撐反轉',
    shortName: 'W 型',
    description:
      '價格進入高週期支撐區後，低週期形成雙底結構，等待突破頸線或回踩確認後進場。',
    direction: 'buy',
    status: 'active',
    timeframe: '4H → 1H → 15M → 1M',
    marketCondition: '回踩支撐、下跌動能減弱',
    entryConditions: [
      '價格到達 4H 或 1H 重要支撐區',
      '15M 結構停止創低',
      '1M 或 5M 形成清楚 W 型',
      '突破頸線後出現回踩確認',
      '停損可放在結構低點之外',
    ],
    avoidConditions: [
      '重大數據公布前後',
      '價格位於區間中央',
      'W 型尚未完成就提前進場',
      '頸線突破後直接追價',
    ],
    totalTrades: 18,
    wins: 14,
    averageR: 2.8,
    rating: 5,
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
  },
  {
    id: 'playbook-m',
    name: 'M 型壓力反轉',
    shortName: 'M 型',
    description:
      '價格進入高週期壓力區後，低週期形成雙頂結構，等待跌破頸線或回踩確認後放空。',
    direction: 'sell',
    status: 'active',
    timeframe: '4H → 1H → 15M → 1M',
    marketCondition: '反彈壓力、上漲動能減弱',
    entryConditions: [
      '價格到達 4H 或 1H 重要壓力區',
      '15M 結構停止創高',
      '1M 或 5M 形成清楚 M 型',
      '跌破頸線後出現回踩確認',
      '停損可放在結構高點之外',
    ],
    avoidConditions: [
      '大趨勢強勢上漲',
      '壓力區尚未出現反應',
      'M 型尚未完成就提前放空',
      '跌破後離停損距離過遠',
    ],
    totalTrades: 15,
    wins: 10,
    averageR: 2.2,
    rating: 4,
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
  },
  {
    id: 'playbook-break-retest',
    name: '突破回踩',
    shortName: '突破回踩',
    description:
      '關鍵結構被有效突破後，等待價格回踩原壓力或支撐區，再依照低週期訊號順勢進場。',
    direction: 'both',
    status: 'active',
    timeframe: '1H → 15M → 5M',
    marketCondition: '趨勢延續、結構突破',
    entryConditions: [
      '關鍵高點或低點被實體 K 棒突破',
      '突破後沒有立即收回區間',
      '價格回踩原結構位置',
      '回踩時出現拒絕或低週期轉向',
      '進場方向與高週期趨勢一致',
    ],
    avoidConditions: [
      '只有影線刺穿，沒有實體突破',
      '突破後直接遠離結構',
      '回踩深度破壞原突破邏輯',
      '突破發生在重大新聞瞬間',
    ],
    totalTrades: 12,
    wins: 8,
    averageR: 2.5,
    rating: 4,
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
  },
  {
    id: 'playbook-gap',
    name: '夾縫進場',
    shortName: '夾縫',
    description:
      '利用短線結構之間留下的狹窄空間與流動性反應，等待價格重新測試後進場。',
    direction: 'both',
    status: 'testing',
    timeframe: '15M → 5M → 1M',
    marketCondition: '短線動能延續',
    entryConditions: [
      '高週期方向明確',
      '短線形成快速位移',
      '夾縫區域尚未被完全回補',
      '價格回測時出現拒絕',
      '低週期重新順著原方向轉強',
    ],
    avoidConditions: [
      '高週期方向混亂',
      '夾縫已被多次測試',
      '回補後沒有出現拒絕',
      '進場位置距離下一阻力過近',
    ],
    totalTrades: 8,
    wins: 5,
    averageR: 1.9,
    rating: 3,
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
  },
]

const readStoredPlaybooks = (): PlaybookRecord[] | null => {
  if (typeof window === 'undefined') {
    return null
  }

  const rawValue = window.localStorage.getItem(STORAGE_KEY)

  if (!rawValue) {
    return null
  }

  try {
    const parsedValue = JSON.parse(rawValue) as PlaybookRecord[]

    return Array.isArray(parsedValue)
      ? parsedValue
      : null
  } catch {
    return null
  }
}

export const usePlaybookStore = defineStore(
  'playbooks',
  () => {
    const storedPlaybooks = readStoredPlaybooks()

    const playbooks = ref<PlaybookRecord[]>(
      storedPlaybooks ?? createDefaultPlaybooks(),
    )

    const sortedPlaybooks = computed(() =>
      [...playbooks.value].sort((a, b) => {
        const statusOrder = {
          active: 0,
          testing: 1,
          paused: 2,
        }

        const statusDifference =
          statusOrder[a.status] - statusOrder[b.status]

        if (statusDifference !== 0) {
          return statusDifference
        }

        return a.name.localeCompare(b.name, 'zh-TW')
      }),
    )

    const statistics = computed<PlaybookStatistics>(() => {
      const totalPlaybooks = playbooks.value.length

      const activePlaybooks = playbooks.value.filter(
        playbook => playbook.status === 'active',
      ).length

      const testingPlaybooks = playbooks.value.filter(
        playbook => playbook.status === 'testing',
      ).length

      const pausedPlaybooks = playbooks.value.filter(
        playbook => playbook.status === 'paused',
      ).length

      const totalTrades = playbooks.value.reduce(
        (total, playbook) =>
          total + playbook.totalTrades,
        0,
      )

      const totalWins = playbooks.value.reduce(
        (total, playbook) =>
          total + playbook.wins,
        0,
      )

      const weightedRTotal = playbooks.value.reduce(
        (total, playbook) =>
          total +
          playbook.averageR * playbook.totalTrades,
        0,
      )

      return {
        totalPlaybooks,
        activePlaybooks,
        testingPlaybooks,
        pausedPlaybooks,
        totalTrades,
        totalWins,
        overallWinRate:
          totalTrades > 0
            ? Math.round(
                (totalWins / totalTrades) * 100,
              )
            : 0,
        averageR:
          totalTrades > 0
            ? Number(
                (
                  weightedRTotal /
                  totalTrades
                ).toFixed(2),
              )
            : 0,
      }
    })

    const save = (): void => {
      if (typeof window === 'undefined') {
        return
      }

      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(playbooks.value),
      )
    }

    const getPlaybookById = (
      playbookId: string,
    ): PlaybookRecord | null => {
      return (
        playbooks.value.find(
          playbook => playbook.id === playbookId,
        ) ?? null
      )
    }

    const addPlaybook = (
      input: NewPlaybookInput,
    ): PlaybookRecord => {
      const now = new Date().toISOString()

      const playbook: PlaybookRecord = {
        id: crypto.randomUUID(),
        name: input.name.trim(),
        shortName: input.shortName.trim(),
        description: input.description.trim(),
        direction: input.direction,
        status: input.status,
        timeframe: input.timeframe.trim(),
        marketCondition:
          input.marketCondition.trim(),
        entryConditions: input.entryConditions
          .map(condition => condition.trim())
          .filter(Boolean),
        avoidConditions: input.avoidConditions
          .map(condition => condition.trim())
          .filter(Boolean),
        totalTrades: 0,
        wins: 0,
        averageR: 0,
        rating: Math.max(
          1,
          Math.min(input.rating, 5),
        ),
        createdAt: now,
        updatedAt: now,
      }

      playbooks.value.unshift(playbook)

      return playbook
    }

    const updatePlaybook = (
      playbookId: string,
      updates: Partial<PlaybookRecord>,
    ): void => {
      const playbook = playbooks.value.find(
        item => item.id === playbookId,
      )

      if (!playbook) {
        return
      }

      Object.assign(playbook, {
        ...updates,
        updatedAt: new Date().toISOString(),
      })
    }

    const removePlaybook = (
      playbookId: string,
    ): void => {
      queueCloudDeletion('playbooks', playbookId)
      playbooks.value = playbooks.value.filter(
        playbook => playbook.id !== playbookId,
      )
    }

    const setPlaybookStatus = (
      playbookId: string,
      status: PlaybookRecord['status'],
    ): void => {
      updatePlaybook(playbookId, {
        status,
      })
    }

    const updatePerformance = (
      playbookId: string,
      totalTrades: number,
      wins: number,
      averageR: number,
    ): void => {
      updatePlaybook(playbookId, {
        totalTrades: Math.max(0, totalTrades),
        wins: Math.max(
          0,
          Math.min(wins, totalTrades),
        ),
        averageR: Number(
          averageR.toFixed(2),
        ),
      })
    }

    const resetPlaybooks = (): void => {
      playbooks.value = createDefaultPlaybooks()
    }

    watch(
      playbooks,
      save,
      {
        deep: true,
      },
    )

    return {
      playbooks,
      sortedPlaybooks,
      statistics,
      getPlaybookById,
      addPlaybook,
      updatePlaybook,
      removePlaybook,
      setPlaybookStatus,
      updatePerformance,
      resetPlaybooks,
    }
  },
)
