export function onRequest(context) {
  const method = context.request.method
  if (method !== 'GET' && method !== 'HEAD') {
    return new Response(null, {
      status: 405,
      headers: { Allow: 'GET, HEAD', 'Cache-Control': 'no-store' },
    })
  }

  const body = JSON.stringify({
    status: 'ok',
    service: 'freedom-os',
    runtime: 'cloudflare-pages',
  })

  return new Response(method === 'HEAD' ? null : body, {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
