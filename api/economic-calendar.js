const UPSTREAM_ENDPOINT =
  'https://economic-calendar.tradingview.com/events'
const MAX_RANGE_MS = 10 * 24 * 60 * 60 * 1000

const isValidIsoDate = value => {
  if (typeof value !== 'string' || !value) return false
  return Number.isFinite(new Date(value).getTime())
}

const getQueryValue = value =>
  Array.isArray(value) ? value[0] : value

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET')
    return response.status(405).json({
      status: 'error',
      message: 'Method not allowed',
    })
  }

  const from = getQueryValue(request.query?.from)
  const to = getQueryValue(request.query?.to)

  if (!isValidIsoDate(from) || !isValidIsoDate(to)) {
    return response.status(400).json({
      status: 'error',
      message: 'Invalid calendar date range',
    })
  }

  const fromTime = new Date(from).getTime()
  const toTime = new Date(to).getTime()

  if (
    toTime < fromTime ||
    toTime - fromTime > MAX_RANGE_MS
  ) {
    return response.status(400).json({
      status: 'error',
      message: 'Calendar range exceeds 10 days',
    })
  }

  const params = new URLSearchParams({
    from: new Date(fromTime).toISOString(),
    to: new Date(toTime).toISOString(),
    countries: 'US',
  })

  try {
    const upstreamResponse = await fetch(
      `${UPSTREAM_ENDPOINT}?${params.toString()}`,
      {
        headers: {
          Accept: 'application/json',
          Origin: 'https://www.tradingview.com',
          Referer: 'https://www.tradingview.com/',
          'User-Agent':
            'Mozilla/5.0 (compatible; HY-Freedom-OS/1.0)',
        },
      },
    )

    if (!upstreamResponse.ok) {
      throw new Error(
        `Upstream response ${upstreamResponse.status}`,
      )
    }

    const payload = await upstreamResponse.json()

    response.setHeader(
      'Cache-Control',
      's-maxage=30, stale-while-revalidate=60',
    )
    return response.status(200).json(payload)
  }
  catch (error) {
    return response.status(502).json({
      status: 'error',
      message:
        error instanceof Error
          ? error.message
          : 'Economic calendar upstream unavailable',
    })
  }
}
