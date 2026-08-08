import { mockAccounts } from '@/mock'
import type { TradingAccount } from '@/types'

export const accountService = {
  getAll(): TradingAccount[] {
    return structuredClone(mockAccounts)
  },
}
