import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { evaluateTradingRisk } from '@/services/trading-risk.service'
export interface TradingRiskSettings {
  maxTradesPerDay: number
  maxDailyLoss: number
  maxConsecutiveLosses: number
  maxRiskPerTrade: number
}

export interface TodayTradingSummary {
  trades: number
  wins: number
  losses: number
  breakeven: number
  totalPnL: number
  consecutiveLosses: number
  maxRiskUsed: number
}

const STORAGE_KEY =
  'hy-freedom-os:risk-settings'

const defaultSettings: TradingRiskSettings = {
  maxTradesPerDay: 3,
  maxDailyLoss: -300,
  maxConsecutiveLosses: 2,
  maxRiskPerTrade: 100,
}

export const useTradingRiskStore =
defineStore(
'trading-risk',
() => {

const settings = ref(load())

function load(): TradingRiskSettings {

try {

const raw =
localStorage.getItem(STORAGE_KEY)

if (!raw)
return defaultSettings

return {
...defaultSettings,
...JSON.parse(raw),
}

}
catch {

return defaultSettings

}

}

watch(
settings,
() => {

localStorage.setItem(
STORAGE_KEY,
JSON.stringify(settings.value),
)

},
{
deep: true,
},
)

const todaySummary =
ref<TodayTradingSummary>({
trades:0,
wins:0,
losses:0,
breakeven:0,
totalPnL:0,
consecutiveLosses:0,
maxRiskUsed:0,
})

function updateTodaySummary(
summary:TodayTradingSummary,
){

todaySummary.value=summary

}

const risk = computed(() =>
  evaluateTradingRisk(
    settings.value,
    todaySummary.value,
  ),
)

const tradeLimitReached = computed(
  () => risk.value.tradeLimitReached,
)

const dailyLossReached = computed(
  () => risk.value.dailyLossReached,
)

const consecutiveLossReached =
  computed(
    () =>
      risk.value
        .consecutiveLossReached,
  )

const riskExceeded = computed(
  () => risk.value.riskExceeded,
)

const canTrade = computed(
  () => risk.value.canTrade,
)

const stopReason = computed(
  () => risk.value.stopReason,
)

function updateSettings(
value:
Partial<TradingRiskSettings>,
){

settings.value={
...settings.value,
...value,
}

}

function resetSettings(){

settings.value={
...defaultSettings,
}

}

return{

settings,

todaySummary,

tradeLimitReached,

dailyLossReached,

consecutiveLossReached,

riskExceeded,

canTrade,

stopReason,

updateSettings,

resetSettings,

updateTodaySummary,

risk,

}

})