const FETCH_TIMEOUT_MS = 10000

export async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    })
    return response
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Pyyntö aikakatkaistiin')
    }
    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}
