export interface DailyMission {
  id: string
  title: string
  completed: boolean
  order: number
}

export interface StoredMissionState {
  date: string
  missions: DailyMission[]
  updatedAt?: string
}
