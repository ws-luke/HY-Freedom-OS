import type {
  EconomicCalendarData,
  EconomicEvent,
  EconomicImpact,
} from '@/types/economic-calendar'

const API_ENDPOINT = '/api/economic-calendar'
const TIMEZONE = 'Asia/Taipei' as const
const REQUEST_TIMEOUT_MS = 15_000

interface TradingViewEvent {
  id?: string | number
  date?: string
  country?: string
  currency?: string
  title?: string
  indicator?: string
  ticker?: string
  comment?: string
  category?: string
  source?: string
  source_url?: string
  actual?: number | string | null
  previous?: number | string | null
  forecast?: number | string | null
  actualRaw?: number | string | null
  previousRaw?: number | string | null
  forecastRaw?: number | string | null
  unit?: string | null
  importance?: number
}

interface TradingViewResponse {
  status?: string
  result?: TradingViewEvent[]
}

const majorGoldKeywords = [
  'federal reserve interest rate',
  'fed interest rate',
  'fomc',
  'non farm payroll',
  'nonfarm payroll',
  'consumer price',
  'cpi',
  'core pce',
  'pce price',
  'powell',
  'gross domestic product',
  'gdp growth',
  'unemployment rate',
]

const titleTranslations: Array<[
  RegExp,
  string,
]> = [
  [/^Non Farm Payrolls$/i, '非農就業人數 NFP'],
  [/^ADP Employment Change$/i, 'ADP 就業人數'],
  [/^Unemployment Rate$/i, '失業率'],
  [/^(Initial )?Jobless Claims$/i, '初領失業救濟金人數'],
  [/^JOLTs Job Openings$/i, 'JOLTS 職缺數'],
  [/^ISM Manufacturing PMI$/i, 'ISM 製造業 PMI'],
  [/^ISM Services PMI$/i, 'ISM 服務業 PMI'],
  [/^Inflation Rate YoY$/i, 'CPI 年增率'],
  [/^Inflation Rate MoM$/i, 'CPI 月增率'],
  [/^Core Inflation Rate YoY$/i, '核心 CPI 年增率'],
  [/^Core Inflation Rate MoM$/i, '核心 CPI 月增率'],
  [/^Producer Price Inflation YoY$/i, 'PPI 年增率'],
  [/^Producer Price Inflation MoM$/i, 'PPI 月增率'],
  [/^Core PCE Price Index YoY$/i, '核心 PCE 年增率'],
  [/^Core PCE Price Index MoM$/i, '核心 PCE 月增率'],
  [/^Retail Sales MoM$/i, '零售銷售月增率'],
  [/^GDP Growth Rate$/i, 'GDP 成長率'],
  [/^Consumer Confidence$/i, '消費者信心指數'],
  [/^Federal Reserve Interest Rate Decision$/i, 'Fed 利率決議'],
  [/^FOMC Minutes$/i, 'FOMC 會議紀要'],
  [/^Fed Chair Powell Speaks$/i, 'Fed 主席 Powell 談話'],
]

const getTaipeiParts = (
  date: Date,
): Record<string, string> =>
  Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(date)
      .filter(part => part.type !== 'literal')
      .map(part => [part.type, part.value]),
  )

const translateTitle = (title: string): string => {
  const translation = titleTranslations.find(
    ([pattern]) => pattern.test(title),
  )

  return translation?.[1] ?? title
}

const normalizeImpact = (
  importance: number | undefined,
): EconomicImpact => {
  if ((importance ?? -1) >= 1) return 5
  if (importance === 0) return 3
  return 1
}

const inferUnit = (event: TradingViewEvent): string => {
  if (event.unit) return event.unit

  const ticker = event.ticker?.toUpperCase() ?? ''
  const title = event.title?.toLowerCase() ?? ''

  if (ticker.endsWith('NFP') || title.includes('jobless claims')) {
    return 'K'
  }

  if (title.includes('jolts job openings')) return 'M'

  return ''
}

const formatValue = (
  value: number | string | null | undefined,
  unit: string,
): string => {
  if (value === null || value === undefined || value === '') {
    return ''
  }

  const displayValue =
    typeof value === 'number'
      ? new Intl.NumberFormat('en-US', {
          maximumFractionDigits: 4,
        }).format(value)
      : String(value).trim()

  if (!displayValue || !unit) return displayValue
  if (displayValue.endsWith(unit)) return displayValue

  return `${displayValue}${unit}`
}

const isGoldRelevant = (
  event: TradingViewEvent,
  impact: EconomicImpact,
): boolean => {
  if (event.currency !== 'USD') return false
  if (impact >= 3) return true

  const searchable = `${event.title ?? ''} ${event.indicator ?? ''}`
    .toLowerCase()

  return majorGoldKeywords.some(keyword =>
    searchable.includes(keyword),
  )
}

const normalizeEvent = (
  event: TradingViewEvent,
): EconomicEvent | null => {
  const scheduledAt = event.date?.trim() ?? ''
  const date = new Date(scheduledAt)

  if (!scheduledAt || Number.isNaN(date.getTime())) {
    return null
  }

  const id = String(event.id ?? '').trim()
  const originalTitle = event.title?.trim() ?? ''

  if (!id || !originalTitle) return null

  const taipeiParts = getTaipeiParts(date)
  const localDate = `${taipeiParts.year}-${taipeiParts.month}-${taipeiParts.day}`
  const time = `${taipeiParts.hour}:${taipeiParts.minute}`
  const impact = normalizeImpact(event.importance)
  const unit = inferUnit(event)

  return {
    id,
    scheduledAt: date.toISOString(),
    localDate,
    time,
    country: event.country?.trim() || 'US',
    currency: event.currency?.trim() || 'USD',
    title: translateTitle(originalTitle),
    originalTitle,
    indicator: event.indicator?.trim() || originalTitle,
    category: event.category?.trim() || 'other',
    impact,
    previous: formatValue(
      event.previous ?? event.previousRaw,
      unit,
    ),
    forecast: formatValue(
      event.forecast ?? event.forecastRaw,
      unit,
    ),
    actual: formatValue(
      event.actual ?? event.actualRaw,
      unit,
    ),
    unit,
    source: event.source?.trim() || 'TradingView Economic Calendar',
    sourceUrl: event.source_url?.trim() || '',
    description: event.comment?.trim() || '',
    ticker: event.ticker?.trim() || '',
    isGoldRelevant: isGoldRelevant(event, impact),
  }
}

const getRequestRange = (): {
  from: string
  to: string
} => {
  const now = new Date()
  const from = new Date(now)
  const to = new Date(now)

  from.setUTCDate(from.getUTCDate() - 1)
  from.setUTCHours(0, 0, 0, 0)
  to.setUTCDate(to.getUTCDate() + 8)
  to.setUTCHours(23, 59, 59, 999)

  return {
    from: from.toISOString(),
    to: to.toISOString(),
  }
}

class EconomicCalendarService {
  async getCalendar(): Promise<EconomicCalendarData> {
    const controller = new AbortController()
    const timeout = window.setTimeout(
      () => controller.abort(),
      REQUEST_TIMEOUT_MS,
    )

    try {
      const range = getRequestRange()
      const params = new URLSearchParams({
        from: range.from,
        to: range.to,
        countries: 'US',
      })
      const response = await fetch(
        `${API_ENDPOINT}?${params.toString()}`,
        {
          headers: {
            Accept: 'application/json',
          },
          cache: 'no-store',
          signal: controller.signal,
        },
      )

      if (!response.ok) {
        throw new Error(
          `經濟日曆來源回應 ${response.status}`,
        )
      }

      const payload = await response.json() as TradingViewResponse

      if (
        payload.status !== 'ok' ||
        !Array.isArray(payload.result)
      ) {
        throw new Error('經濟日曆資料格式不正確')
      }

      const events = payload.result
        .map(normalizeEvent)
        .filter(
          (event): event is EconomicEvent => event !== null,
        )
        .sort((a, b) =>
          a.scheduledAt.localeCompare(b.scheduledAt),
        )

      if (events.length === 0) {
        throw new Error('經濟日曆來源沒有回傳事件')
      }

      return {
        provider: 'TradingView',
        timezone: TIMEZONE,
        fetchedAt: new Date().toISOString(),
        events,
      }
    }
    catch (error) {
      if (
        error instanceof DOMException &&
        error.name === 'AbortError'
      ) {
        throw new Error('經濟日曆連線逾時')
      }

      throw error
    }
    finally {
      window.clearTimeout(timeout)
    }
  }
}

export default new EconomicCalendarService()
