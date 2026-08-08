import type { TradingAccount } from '@/types'

export const mockAccounts: TradingAccount[] = [
  {
    id: 'ftmo-100k',
    name: 'FTMO 100K',
    type: 'funded',
    status: 'healthy',
    currency: 'USD',
    balance: 100000,
    equity: 100820,
    dailyProfitLoss: 420,
    maxDrawdownPercent: 10,
    profitTargetPercent: 10,
    currentProfitPercent: 0.82,
  },
  {
    id: 'live-xau',
    name: 'XAU Live',
    type: 'live',
    status: 'healthy',
    currency: 'USD',
    balance: 12540,
    equity: 12890,
    dailyProfitLoss: 180,
  },
  {
    id: 'demo-practice',
    name: 'Demo Practice',
    type: 'demo',
    status: 'inactive',
    currency: 'USD',
    balance: 50000,
    equity: 50000,
    dailyProfitLoss: 0,
  },
]
