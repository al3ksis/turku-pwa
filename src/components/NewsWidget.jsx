import { useState, useEffect } from 'react'
import { fetchWithTimeout } from '../utils/fetch'
import './NewsWidget.css'

// Varsinais-Suomi RSS
const YLE_RSS = 'https://yle.fi/rss/t/18-198259/fi'
const RSS_URL = `/.netlify/functions/proxy?url=${encodeURIComponent(YLE_RSS)}`
function parseRSS(xmlText) {
  const parser = new DOMParser()
  const xml = parser.parseFromString(xmlText, 'text/xml')
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 7)
  cutoff.setHours(0, 0, 0, 0)

  return Array.from(xml.querySelectorAll('item')).flatMap(item => {
    const pubDateStr = item.querySelector('pubDate')?.textContent || ''
    const pubDate = pubDateStr ? new Date(pubDateStr) : null
    if (!pubDate || pubDate < cutoff) return []
    return [{ title: item.querySelector('title')?.textContent || '', url: item.querySelector('link')?.textContent || '', pubDate }]
  })
}

function formatNewsDate(date) {
  if (!date || isNaN(date)) return 'Yle'
  const d = date.getDate()
  const m = date.getMonth() + 1
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  return `${d}.${m}. klo ${hh}:${mm}`
}

export default function NewsWidget() {
  const [news, setNews] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  async function fetchNews() {
    try {
      setError(null)
      const res = await fetchWithTimeout(RSS_URL)
      if (!res.ok) throw new Error('Uutisten haku epäonnistui')
      const text = await res.text()
      const items = parseRSS(text)
      setNews(items)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNews()

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        fetchNews()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  if (loading) {
    return (
      <div className="news-widget card">
        <div className="news-header">
          <img src="/yle-logo.svg" alt="Yle" className="news-logo" />
          <h2>Uutiset</h2>
        </div>
        <div className="news-loading">
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton-row" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="news-widget card">
        <div className="news-header">
          <img src="/yle-logo.svg" alt="Yle" className="news-logo" />
          <h2>Uutiset</h2>
        </div>
        <div className="news-error">
          <p>{error}</p>
          <button className="btn-primary" onClick={fetchNews}>Yritä uudelleen</button>
        </div>
      </div>
    )
  }

  return (
    <div className="news-widget card">
      <div className="news-header">
        <img src="/yle-logo.svg" alt="Yle" className="news-logo" />
        <h2>Uutiset</h2>
      </div>
      <div className="news-list">
        {news?.map((item, i) => (
          <a
            key={i}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="news-row"
          >
            <span className="news-title">{item.title}</span>
            <span className="news-source">{formatNewsDate(item.pubDate)}</span>
          </a>
        ))}
      </div>
    </div>
  )
}
