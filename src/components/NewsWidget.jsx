import { useState, useEffect } from 'react'
import './NewsWidget.css'

// Turku concept ID: 18-176134
const YLE_RSS = 'https://feeds.yle.fi/uutiset/v1/recent.rss?publisherIds=YLE_UUTISET&concepts=18-176134'
const RSS_URL = `/.netlify/functions/proxy?url=${encodeURIComponent(YLE_RSS)}`

function parseRSS(xmlText) {
  const parser = new DOMParser()
  const xml = parser.parseFromString(xmlText, 'text/xml')
  const items = xml.querySelectorAll('item')

  return Array.from(items).slice(0, 4).map(item => ({
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
      const res = await fetch(RSS_URL)
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
