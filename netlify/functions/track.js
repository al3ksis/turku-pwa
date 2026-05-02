import { getStore } from '@netlify/blobs'

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const today = new Date().toISOString().slice(0, 10)
    const store = getStore('analytics')
    const key = `visits-${today}`
    const current = parseInt((await store.get(key)) || '0', 10)
    await store.set(key, String(current + 1))
    return new Response('', { status: 204 })
  } catch {
    return new Response('', { status: 204 })
  }
}
