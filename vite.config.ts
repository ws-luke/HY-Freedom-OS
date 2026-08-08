import { fileURLToPath, URL } from 'node:url'
import type {
  IncomingMessage,
  ServerResponse,
} from 'node:http'

import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { defineConfig, type Plugin } from 'vite'
import vueDevTools from 'vite-plugin-vue-devtools'

const calendarMiddleware = async (
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> => {
  const requestUrl = new URL(
    request.url ?? '',
    'http://localhost',
  )
  const params = new URLSearchParams()
  const from = requestUrl.searchParams.get('from')
  const to = requestUrl.searchParams.get('to')

  if (from) params.set('from', from)
  if (to) params.set('to', to)
  params.set('countries', 'US')

  try {
    const upstreamResponse = await fetch(
      `https://economic-calendar.tradingview.com/events?${params.toString()}`,
      {
        headers: {
          Accept: 'application/json',
          Origin: 'https://www.tradingview.com',
          Referer: 'https://www.tradingview.com/',
          'User-Agent': 'Mozilla/5.0',
        },
      },
    )
    const body = await upstreamResponse.text()

    response.statusCode = upstreamResponse.status
    response.setHeader(
      'Content-Type',
      upstreamResponse.headers.get('content-type') ??
        'application/json',
    )
    response.setHeader('Cache-Control', 'no-store')
    response.end(body)
  }
  catch (error) {
    response.statusCode = 502
    response.setHeader('Content-Type', 'application/json')
    response.end(JSON.stringify({
      status: 'error',
      message:
        error instanceof Error
          ? error.message
          : 'Economic calendar upstream unavailable',
    }))
  }
}

const economicCalendarApi = (): Plugin => ({
  name: 'hy-economic-calendar-api',
  configureServer(server) {
    server.middlewares.use(
      '/api/economic-calendar',
      calendarMiddleware,
    )
  },
  configurePreviewServer(server) {
    server.middlewares.use(
      '/api/economic-calendar',
      calendarMiddleware,
    )
  },
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
    tailwindcss(),
    economicCalendarApi(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
