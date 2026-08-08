export interface TradeReviewForm {
  followedPlan: boolean | null
  followedPlaybook: boolean | null
  respectedRisk: boolean | null
  waitedForConfirmation: boolean | null
  avoidedNewsRisk: boolean | null
  emotionalControl: number
  executionScore: number
  strengths: string
  mistakes: string
  improvement: string
  nextTradeRule: string
  summary: string
}

export interface TradeReviewResult
  extends TradeReviewForm {
  tradeId: string
  totalScore: number
  completedAt: string
}

export interface StoredTradeReview
  extends TradeReviewResult {
  id: string
  createdAt: string
  updatedAt: string
}
