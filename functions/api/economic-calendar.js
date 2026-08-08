const UPSTREAM_ENDPOINT = 'https://economic-calendar.tradingview.com/events'
const MAX_RANGE_MS = 10 * 24 * 60 * 60 * 1000

const json = (status, payload, extraHeaders = {}) => new Response(
  JSON.stringify(payload),
  {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      ...extraHeaders,
    },
  },
)

const validDate = value => Boolean(value) && Number.isFinite(new Date(value).getTime())

export async function onRequest(context) {
  const { request } = context
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return json(405, { status: 'error', message: 'Method not allowed' }, {
      Allow: 'GET, HEAD',
      'Cache-Control': 'no-store',
    })
  }

  const url = new URL(request.url)
  const from = url.searchParams.get('from')
  const to = url.searchParams.get('to')

  if (!validDate(from) || !validDate(to)) {
    return json(400, { status: 'error', message: 'Invalid calendar date range' }, {
      'Cache-Control': 'no-store',
    })
  }

  const fromTime = new Date(from).getTime()
  const toTime = new Date(to).getTime()
  if (toTime < fromTime || toTime - fromTime > MAX_RANGE_MS) {
    return json(400, { status: 'error', message: 'Calendar range exceeds 10 days' }, {
      'Cache-Control': 'no-store',
    })
  }

  const params = new URLSearchParams({
    from: new Date(fromTime).toISOString(),
    to: new Date(toTime).toISOString(),
    countries: 'US',
  })

  try {
    const upstreamResponse = await fetch(`${UPSTREAM_ENDPOINT}?${params.toString()}`, {
      headers: {
        Accept: 'application/json',
        Origin: 'https://www.tradingview.com',
        Referer: 'https://www.tradingview.com/',
        'User-Agent': 'Mozilla/5.0 (compatible; HY-Freedom-OS/1.0)',
      },
    })

    if (!upstreamResponse.ok) {
      throw new Error(`Upstream response ${upstreamResponse.status}`)
    }

    const body = await upstreamResponse.text()
    return new Response(request.method === 'HEAD' ? null : body, {
      status: 200,
      headers: {
        'Content-Type': upstreamResponse.headers.get('Content-Type') ?? 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=15, s-maxage=30',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
      },
    })
  }
  catch (error) {
    return json(502, {
      status: 'error',
      message: error instanceof Error ? error.message : 'Economic calendar upstream unavailable',
    }, { 'Cache-Control': 'no-store' })
  }
}
