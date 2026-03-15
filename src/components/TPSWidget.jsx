import { useState, useEffect } from 'react'
import './TPSWidget.css'

const TPS_ICS = 'https://hc.tps.fi/fi-fi/?action=getContent&type=exportcalendar&format=ics&levelId=64&season=2026'
const ICS_URL = `/.netlify/functions/proxy?url=${encodeURIComponent(TPS_ICS)}`

function parseICS(icsText) {
  const events = []
  const lines = icsText.split('\n')
  let event = null

  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed === 'BEGIN:VEVENT') {
      event = {}
    } else if (trimmed === 'END:VEVENT' && event) {
      if (event.start && event.summary) {
        events.push(event)
      }
      event = null
    } else if (event) {
      if (trimmed.startsWith('DTSTART:')) {
        const dateStr = trimmed.slice(8)
        // Parse format: 20250815T153000Z
        const year = dateStr.slice(0, 4)
        const month = dateStr.slice(4, 6)
        const day = dateStr.slice(6, 8)
        const hour = dateStr.slice(9, 11)
        const min = dateStr.slice(11, 13)
        event.start = new Date(Date.UTC(year, month - 1, day, hour, min))
      } else if (trimmed.startsWith('SUMMARY:')) {
        event.summary = trimmed.slice(8)
      }
    }
  }

  return events
}

function parseMatch(summary) {
  // Format: "TPS-Ässät" (home) or "Ilves-TPS" (away)
  const parts = summary.split('-')
  if (parts.length < 2) return { opponent: summary, isHome: true }

  const first = parts[0].trim()
  const second = parts.slice(1).join('-').trim()

  if (first === 'TPS') {
    return { opponent: second, isHome: true }
  } else {
    return { opponent: first, isHome: false }
  }
}

export default function TPSWidget() {
  const [games, setGames] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  async function fetchGames() {
    try {
      setError(null)
      const res = await fetch(ICS_URL)
      if (!res.ok) throw new Error('Haku epäonnistui')
      const text = await res.text()
      const events = parseICS(text)

      // Filter future games and sort
      const now = new Date()
      const upcoming = events
        .filter(e => e.start > now)
        .sort((a, b) => a.start - b.start)
        .slice(0, 3)

      setGames(upcoming)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchGames()
  }, [])

  function formatDate(date) {
    const days = ['Su', 'Ma', 'Ti', 'Ke', 'To', 'Pe', 'La']
    const day = days[date.getDay()]
    const d = date.getDate()
    const m = date.getMonth() + 1
    const hours = date.getHours().toString().padStart(2, '0')
    const mins = date.getMinutes().toString().padStart(2, '0')
    return { weekday: day, date: `${d}.${m}.`, time: `${hours}:${mins}` }
  }

  if (loading) {
    return (
      <div className="tps-widget card">
        <div className="tps-header">
          <img src="/tps-logo.svg" alt="TPS" className="tps-logo" />
          <h2>HC TPS</h2>
        </div>
        <div className="tps-loading">
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton-row" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="tps-widget card">
        <div className="tps-header">
          <img src="/tps-logo.svg" alt="TPS" className="tps-logo" />
          <h2>HC TPS</h2>
        </div>
        <div className="tps-error">
          <p>{error}</p>
          <button className="btn-primary" onClick={fetchGames}>Yritä uudelleen</button>
        </div>
      </div>
    )
  }

  if (!games || games.length === 0) {
    return (
      <div className="tps-widget card">
        <div className="tps-header">
          <img src="/tps-logo.svg" alt="TPS" className="tps-logo" />
          <h2>HC TPS</h2>
        </div>
        <p className="no-games">Ei tulevia otteluita</p>
        <div className="tps-links">
          <a href="https://hc.tps.fi/tulevat-ottelut" target="_blank" rel="noopener noreferrer" className="tps-link">
            Otteluohjelma →
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="tps-widget card">
      <div className="tps-header">
        <img src="/tps-logo.svg" alt="TPS" className="tps-logo" />
        <h2>HC TPS</h2>
      </div>
      <div className="games">
        {games.map((game, i) => {
          const { weekday, date, time } = formatDate(game.start)
          const { opponent, isHome } = parseMatch(game.summary)

          return (
            <div key={i} className="game-row">
              <div className="game-date">
                <span className="weekday">{weekday}</span>
                <span className="date">{date}</span>
              </div>
              <div className="game-info">
                <span className="opponent">{opponent}</span>
                <span className={`location ${isHome ? 'home' : 'away'}`}>
                  {isHome ? 'Koti' : 'Vieras'}
                </span>
              </div>
              <span className="game-time">{time}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
