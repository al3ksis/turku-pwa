export default async (req) => {
  const url = new URL(req.url)
  const target = url.searchParams.get('url')

  if (!target) {
    return new Response('Missing url parameter', { status: 400 })
  }

  // Only allow specific domains
  const allowed = ['hc.tps.fi', 'fc.tps.fi', 'feeds.yle.fi', 'yle.fi']
  const targetUrl = new URL(target)

  if (!allowed.includes(targetUrl.hostname)) {
    return new Response('Domain not allowed', { status: 403 })
  }

  try {
    const response = await fetch(target)
    const body = await response.text()

    return new Response(body, {
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'text/plain',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=60',
        'Netlify-CDN-Cache-Control': 'public, s-maxage=600, stale-while-revalidate=86400'
      }
    })
  } catch (error) {
    return new Response('Fetch failed: ' + error.message, { status: 500 })
  }
}
