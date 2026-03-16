import { useState, useEffect } from 'react'
import { fetchWithTimeout } from '../utils/fetch'
import './NewsWidget.css'

// Varsinais-Suomi RSS
const YLE_RSS = 'https://yle.fi/rss/t/18-198259/fi'
const RSS_URL = `/.netlify/functions/proxy?url=${encodeURIComponent(YLE_RSS)}`
const MAX_NEWS_SHOWN = 4

function parseRSS(xmlText) {
  const parser = new DOMParser()
  const xml = parser.parseFromString(xmlText, 'text/xml')
  const items = xml.querySelectorAll('item')

  return Array.from(items).slice(0, MAX_NEWS_SHOWN).map(item => ({
    title: item.querySelector('title')?.textContent || '',
    url: item.querySelector('link')?.textContent || '',
    source: 'Yle'
  }))
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
            <span className="news-source">{item.source}</span>
          </a>
        ))}
      </div>
    </div>
  )
}
