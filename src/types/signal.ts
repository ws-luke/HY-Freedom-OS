export type SignalDirection = 'buy' | 'sell' | 'both'
export type SignalStatus = 'active' | 'testing' | 'paused'

export interface SignalScreenshot {
  name: string
  dataUrl: string
  storagePath?: string | null
}

export interface SignalRecord {
  id: string
  name: string
  description: string
  direction: SignalDirection
  status: SignalStatus
  timeframe: string
  confirmationRules: string[]
  screenshot: SignalScreenshot | null
  createdAt: string
  updatedAt: string
}

export interface SignalInput {
  name: string
  description: string
  direction: SignalDirection
  status: SignalStatus
  timeframe: string
  confirmationRules: string[]
  screenshot: SignalScreenshot | null
}
