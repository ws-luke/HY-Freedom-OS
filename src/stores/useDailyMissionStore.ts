import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { queueCloudDeletion } from '@/services/cloud/cloud-deletion.service'

import type {
  DailyMission,
  StoredMissionState,
} from '@/types/mission'

const STORAGE_KEY = 'hy-freedom-os:daily-missions'

const getLocalDateKey = (): string => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

const createDefaultMissions = (): DailyMission[] => [
  {
    id: 'draw-h4',
    title: '畫 4H 趨勢與主要支撐壓力',
    completed: false,
    order: 1,
  },
  {
    id: 'draw-h1',
    title: '確認 1H 結構與關鍵區域',
    completed: false,
    order: 2,
  },
  {
    id: 'draw-m15',
    title: '更新 15M 進場觀察區',
    completed: false,
    order: 3,
  },
  {
    id: 'economic-events',
    title: '確認今日重要經濟數據',
    completed: false,
    order: 4,
  },
  {
    id: 'complete-plan',
    title: '完成今日盤前規劃',
    completed: false,
    order: 5,
  },
  {
    id: 'review-yesterday',
    title: '完成昨日交易復盤',
    completed: false,
    order: 6,
  },
]

const readStoredState = (): StoredMissionState | null => {
  if (typeof window === 'undefined') {
    return null
  }

  const rawValue = window.localStorage.getItem(STORAGE_KEY)

  if (!rawValue) {
    return null
  }

  try {
    const parsedValue = JSON.parse(
      rawValue,
    ) as StoredMissionState

    if (
      typeof parsedValue.date !== 'string' ||
      !Array.isArray(parsedValue.missions)
    ) {
      return null
    }

    return parsedValue
  } catch {
    return null
  }
}

export const useDailyMissionStore = defineStore(
  'daily-mission',
  () => {
    const today = ref(getLocalDateKey())
    const storedState = readStoredState()

    const missions = ref<DailyMission[]>(
      storedState?.date === today.value
        ? storedState.missions
        : createDefaultMissions(),
    )

    const sortedMissions = computed(() =>
      [...missions.value].sort(
        (a, b) => a.order - b.order,
      ),
    )

    const completedCount = computed(
      () =>
        missions.value.filter(
          mission => mission.completed,
        ).length,
    )

    const totalCount = computed(
      () => missions.value.length,
    )

    const progressPercent = computed(() => {
      if (totalCount.value === 0) {
        return 0
      }

      return Math.round(
        (completedCount.value / totalCount.value) *
          100,
      )
    })

    const allCompleted = computed(
      () =>
        totalCount.value > 0 &&
        completedCount.value === totalCount.value,
    )

    const save = (): void => {
      if (typeof window === 'undefined') {
        return
      }

      const state: StoredMissionState = {
        date: today.value,
        missions: missions.value,
        updatedAt: new Date().toISOString(),
      }

      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(state),
      )
    }

    const toggleMission = (
      missionId: string,
    ): void => {
      const mission = missions.value.find(
        item => item.id === missionId,
      )

      if (mission) {
        mission.completed = !mission.completed
      }
    }

    const addMission = (title: string): void => {
      const normalizedTitle = title.trim()

      if (!normalizedTitle) {
        return
      }

      missions.value.push({
        id: crypto.randomUUID(),
        title: normalizedTitle,
        completed: false,
        order: missions.value.length + 1,
      })
    }

    const updateMission = (
      missionId: string,
      title: string,
    ): void => {
      const mission = missions.value.find(
        item => item.id === missionId,
      )

      const normalizedTitle = title.trim()

      if (!mission || !normalizedTitle) {
        return
      }

      mission.title = normalizedTitle
    }

    const removeMission = (
      missionId: string,
    ): void => {
      queueCloudDeletion('daily_missions', missionId)
      missions.value = missions.value
        .filter(
          mission => mission.id !== missionId,
        )
        .map((mission, index) => ({
          ...mission,
          order: index + 1,
        }))
    }

    const resetToday = (): void => {
      today.value = getLocalDateKey()
      missions.value = createDefaultMissions()
    }

    const ensureCurrentDay = (): void => {
      const currentDate = getLocalDateKey()

      if (currentDate !== today.value) {
        today.value = currentDate
        missions.value = createDefaultMissions()
      }
    }

    watch(
      missions,
      save,
      {
        deep: true,
      },
    )

    return {
      today,
      missions,
      sortedMissions,
      completedCount,
      totalCount,
      progressPercent,
      allCompleted,
      toggleMission,
      addMission,
      updateMission,
      removeMission,
      resetToday,
      ensureCurrentDay,
    }
  },
)
