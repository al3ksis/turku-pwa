import { useState, useEffect } from 'react'
import { fetchWithTimeout } from '../utils/fetch'
import { PageHeader } from './PageHeader'
import './PageTPS.css'

const HC_ICS = 'https://hc.tps.fi/fi-fi/?action=getContent&type=exportcalendar&format=ics&levelId=64&season=2026'
const HC_URL = `/.netlify/functions/proxy?url=${encodeURIComponent(HC_ICS)}`
const FC_PAGE = 'https://fc.tps.fi/ottelut/miesten-edustus/'
const FC_URL = `/.netlify/functions/proxy?url=${encodeURIComponent(FC_PAGE)}`
const FC_TICKETS = 'https://www.lippu.fi/artist/fctps/'

// --- Parsers ---

function parseHcTpsIcs(icsText) {
  const events = []
  const lines = icsText.split('\n')
  let ev = null
  const now = new Date()

  for (const line of lines) {
    const t = line.trim()
    if (t === 'BEGIN:VEVENT') {
      ev = {}
    } else if (t === 'END:VEVENT' && ev) {
      if (ev.start && ev.summary && ev.start > now) events.push(ev)
      ev = null
    } else if (ev) {
      if (t.startsWith('DTSTART:')) {
        const s = t.slice(8)
        ev.start = new Date(Date.UTC(+s.slice(0,4), +s.slice(4,6)-1, +s.slice(6,8), +s.slice(9,11), +s.slice(11,13)))
      } else if (t.startsWith('SUMMARY:')) {
        ev.summary = t.slice(8)
      } else if (t.startsWith('LOCATION:')) {
        ev.location = t.slice(9)
      }
    }
  }
  return events.sort((a, b) => a.start - b.start)
}

function parseHcMatch(summary) {
  const parts = summary.split('-')
  if (parts.length < 2) return { opponent: summary, isHome: true }
  const first = parts[0].trim()
  const rest = parts.slice(1).join('-').trim()
  return first === 'TPS' ? { opponent: rest, isHome: true } : { opponent: first, isHome: false }
}

function parseFcTpsHtml(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const games = []
  const now = new Date()
  const DATE_RE = /(\d{2})\.(\d{2})\.(\d{4})\s+(\d{1,2})\.(\d{2})/

  for (const row of doc.querySelectorAll('tr')) {
    const cells = Array.from(row.querySelectorAll('td'))
    if (cells.length < 2) continue

    let gameDate = null
    let homeTeam = null
    let awayTeam = null
    let venue = null

    for (const cell of cells) {
      const text = cell.textContent.trim()
      const dateMatch = text.match(DATE_RE)
      if (dateMatch) {
        const [, d, mo, y, h, mi] = dateMatch
        gameDate = new Date(+y, +mo - 1, +d, +h, +mi)
        continue
      }
      if (text.includes(' vs ')) {
        const parts = text.split(' vs ')
        homeTeam = parts[0].trim()
        awayTeam = parts[1]?.split('\n')[0].trim() || ''
        continue
      }
      const tl = text.toLowerCase()
      if (!venue && (tl.includes('stadion') || tl.includes('areena') || tl.includes('arena') || tl.includes('kenttä') || tl.includes('puisto') || tl.startsWith('raatti'))) {
        venue = text.split(',')[0].trim()
      }
    }

    if (!gameDate || !homeTeam || gameDate <= now) continue
    if (!homeTeam.toUpperCase().includes('TPS') && !awayTeam.toUpperCase().includes('TPS')) continue

    const isHome = homeTeam.toUpperCase().includes('TPS')
    const opponent = isHome ? awayTeam : homeTeam
    const rowText = row.textContent
    const competition = rowText.includes('Veikkausliiga') ? 'Veikkausliiga' :
                        rowText.includes('Cup') ? 'Cup' : 'FC TPS'

    games.push({ date: gameDate, opponent, isHome, venue: venue || (isHome ? 'Veritas Stadion' : ''), competition })
  }

  return games.sort((a, b) => a.date - b.date)
}

// --- Helpers ---

const WEEKDAYS = ['su', 'ma', 'ti', 'ke', 'to', 'pe', 'la']

function shortDate(date) {
  return `${WEEKDAYS[date.getDay()]} ${date.getDate()}.${date.getMonth() + 1}.`
}

function gameTime(date) {
  return `${String(date.getHours()).padStart(2,'0')}.${String(date.getMinutes()).padStart(2,'0')}`
}

function daysUntil(date) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const gameDay = new Date(date)
  gameDay.setHours(0, 0, 0, 0)
  const d = Math.round((gameDay - today) / 86400000)
  if (d === 0) return 'tänään'
  if (d === 1) return 'huomenna'
  return `${d} pv päästä`
}

const TEAM_ABBR = {
  'TPS':'TPS','HJK':'HJK','Inter':'INT','Ilves':'ILV','KuPS':'KuPS',
  'Gnistan':'GNI','Haka':'HAK','SJK':'SJK','VPS':'VPS','FC Lahti':'FCL',
  'Mariehamn':'IFK','Tappara':'TAP','Kärpät':'KÄR','HIFK':'HIFK',
  'JYP':'JYP','HPK':'HPK','Lukko':'LUK','Ässät':'ÄSS','Pelicans':'PEL',
  'Jukurit':'JUK','Sport':'SPT',
}

const TEAM_CITY = {
  'HJK':'Helsinki','Inter':'Turku','Ilves':'Tampere','KuPS':'Kuopio',
  'SJK':'Seinäjoki','Gnistan':'Helsinki','Haka':'Valkeakoski','VPS':'Vaasa',
  'Mariehamn':'Maarianhamina','FC Lahti':'Lahti','Tappara':'Tampere',
  'Kärpät':'Oulu','HIFK':'Helsinki','JYP':'Jyväskylä','HPK':'Hämeenlinna',
  'Lukko':'Rauma','Ässät':'Pori','Pelicans':'Lahti','Jukurit':'Mikkeli','Sport':'Vaasa',
}

function abbr(name) {
  for (const [k, v] of Object.entries(TEAM_ABBR)) {
    if (name.includes(k)) return v
  }
  return name.replace(/^(FC|IF|IFK|AC|FF|FK)\s+/i, '').slice(0, 3).toUpperCase()
}

function city(name) {
  for (const [k, v] of Object.entries(TEAM_CITY)) {
    if (name.includes(k)) return v
  }
  return ''
}

function fcVenueLabel(isHome, opponent) {
  if (opponent.toLowerCase().includes('inter')) return 'paikallispeli'
  return isHome ? 'koti' : 'vieraspeli'
}

function hcVenueLabel(isHome) {
  return isHome ? 'kotiottellu' : 'vierasottelu'
}

function matchName(opponent, isHome) {
  return isHome ? `TPS – ${opponent}` : `${opponent} – TPS`
}

function matchColor(isHome, opponent) {
  const isDerby = opponent && opponent.toLowerCase().includes('inter')
  if (isDerby) return '#ff4a6a'
  return isHome ? '#4ade80' : '#60a5fa'
}

function matchColorScheme(game) {
  const isDerby = game.opponent && game.opponent.toLowerCase().includes('inter')
  if (isDerby) return { border: '#ff4a6a', badgeBg: 'rgba(255, 74, 106, 0.18)', badgeText: '#ff8095' }
  if (game.isHome) return { border: '#4ade80', badgeBg: 'rgba(74, 222, 128, 0.18)', badgeText: '#4ade80' }
  return { border: '#60a5fa', badgeBg: 'rgba(96, 165, 250, 0.18)', badgeText: '#93c5fd' }
}

function leagueLabel(game) {
  if (game.team === 'hc') return 'LIIGA'
  if (game.competition === 'Cup') return 'CUP'
  return 'VEIKKAUSLIIGA'
}

// --- Sub-components ---

function NextGameCard({ game }) {
  const isHc = game.team === 'hc'
  const gameDate = isHc ? game.start : game.date
  const opponent = game.opponent
  const venueStr = isHc ? (game.location || 'Veritas Areena') : game.venue
  const competition = isHc ? 'SM-LIIGA' : (game.competition || 'VEIKKAUSLIIGA')
  const venueLabel = isHc
    ? hcVenueLabel(game.isHome).toUpperCase()
    : fcVenueLabel(game.isHome, opponent).toUpperCase()
  const teamLabel = isHc ? 'HC TPS' : 'FC TPS'
  const color = matchColor(game.isHome, opponent)

  return (
    <div className="next-game-card" style={{ borderLeft: `3px solid ${color}`, background: `color-mix(in srgb, ${color} 8%, var(--card))` }}>
      <div className="next-game-header">
        <span className="ng-meta">{teamLabel} · {competition.toUpperCase()} · <span style={{ color }}>{venueLabel}</span></span>
      </div>
      <div className="next-game-teams">
        {game.isHome ? (
          <>
            <div className="team-block">
              <div className="team-badge">TPS</div>
              <div className="team-name">{teamLabel}</div>
              <div className="team-city">Turku</div>
            </div>
            <div className="ng-dash">—</div>
            <div className="team-block">
              <div className="team-badge">{abbr(opponent)}</div>
              <div className="team-name">{opponent}</div>
              <div className="team-city">{city(opponent)}</div>
            </div>
          </>
        ) : (
          <>
            <div className="team-block">
              <div className="team-badge">{abbr(opponent)}</div>
              <div className="team-name">{opponent}</div>
              <div className="team-city">{city(opponent)}</div>
            </div>
            <div className="ng-dash">—</div>
            <div className="team-block">
              <div className="team-badge">TPS</div>
              <div className="team-name">{teamLabel}</div>
              <div className="team-city">Turku</div>
            </div>
          </>
        )}
      </div>
      <div className="ng-details">
        <div className="ng-info">
          <div className="ng-datetime">{shortDate(gameDate)} · {gameTime(gameDate)}</div>
          <div className="ng-venue">{venueStr} · {daysUntil(gameDate)}</div>
        </div>
        {!isHc && game.isHome && (
          <a href={FC_TICKETS} target="_blank" rel="noopener noreferrer" className="ticket-btn">
            Liput →
          </a>
        )}
      </div>
    </div>
  )
}

const WEEKDAYS_LONG = ['Sunnuntai', 'Maanantai', 'Tiistai', 'Keskiviikko', 'Torstai', 'Perjantai', 'Lauantai']

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function GameListItem({ game }) {
  const isHc = game.team === 'hc'
  const gameDate = isHc ? game.start : game.date
  const venueStr = isHc ? (game.location || 'Veritas Areena') : game.venue
  const venueLabel = capitalize(isHc ? hcVenueLabel(game.isHome) : fcVenueLabel(game.isHome, game.opponent))
  const colors = matchColorScheme(game)

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const gameDay = new Date(gameDate)
  gameDay.setHours(0, 0, 0, 0)
  const days = Math.round((gameDay - today) / 86400000)
  const dateLabel = days === 0 ? 'Tänään' : days === 1 ? 'Huomenna'
    : `${WEEKDAYS_LONG[gameDate.getDay()]} ${gameDate.getDate()}.${gameDate.getMonth() + 1}.`
  const countdown = days === 0 ? 'tänään' : days === 1 ? 'huomenna' : `${days} pv`
  const timeStr = `${String(gameDate.getHours()).padStart(2,'0')}.${String(gameDate.getMinutes()).padStart(2,'0')}`

  return (
    <div className="next-match-card" style={{ borderLeftColor: colors.border }}>
      <div className="next-match-meta">
        <span className="next-match-badge" style={{ background: colors.badgeBg, color: colors.badgeText }}>
          {leagueLabel(game)}
        </span>
        <span className="next-match-date">{dateLabel}</span>
        <span className="next-match-countdown">{countdown}</span>
      </div>
      <div className="next-match-body">
        <div className="next-match-info">
          <div className="next-match-title">{matchName(game.opponent, game.isHome)}</div>
          <div className="next-match-venue">{venueStr ? `${venueStr} · ${venueLabel}` : venueLabel}</div>
        </div>
        <div className="next-match-time">
          <span className="next-match-time-label">klo</span>
          <span className="next-match-time-value">{timeStr}</span>
        </div>
      </div>
    </div>
  )
}

function SeasonEndedCard() {
  return (
    <div className="season-ended-card">
      <div className="season-ended-header">
        <span className="ng-dot hc" />
        <span>HC TPS · KAUSI PÄÄTTYI</span>
      </div>
      <p className="season-ended-text">
        Liiga-kausi alkaa jälleen syyskuussa. Harjoituspelit elokuussa.
      </p>
    </div>
  )
}

// --- Main ---

export default function PageTPS() {
  const [tab, setTab] = useState('all')
  const [hcGames, setHcGames] = useState(null)
  const [fcGames, setFcGames] = useState(null)
  const [hcLoading, setHcLoading] = useState(true)
  const [fcLoading, setFcLoading] = useState(true)

  useEffect(() => {
    fetchWithTimeout(HC_URL)
      .then(r => r.text())
      .then(text => setHcGames(parseHcTpsIcs(text)))
      .catch(() => setHcGames([]))
      .finally(() => setHcLoading(false))

    fetchWithTimeout(FC_URL)
      .then(r => r.text())
      .then(html => setFcGames(parseFcTpsHtml(html)))
      .catch(() => setFcGames([]))
      .finally(() => setFcLoading(false))
  }, [])

  const hcUpcoming = hcGames || []
  const fcUpcoming = fcGames || []

  const visibleGames = (() => {
    const hc = hcUpcoming.map(g => ({ ...g, team: 'hc', sortDate: g.start }))
    const fc = fcUpcoming.map(g => ({ ...g, team: 'fc', sortDate: g.date }))
    if (tab === 'hc') return hc
    if (tab === 'fc') return fc
    return [...hc, ...fc].sort((a, b) => a.sortDate - b.sortDate)
  })()

  const nextGame = visibleGames[0] || null
  const upcomingGames = visibleGames.slice(1)
  const loading = hcLoading || fcLoading
  const showSeasonEnded = !hcLoading && hcUpcoming.length === 0 && (tab === 'all' || tab === 'hc')

  return (
    <div className="page-tps">
      <PageHeader title="TPS" />

      <div className="tps-tabs">
        <button className={`tps-tab${tab === 'all' ? ' active' : ''}`} onClick={() => setTab('all')}>Kaikki</button>
        <button className={`tps-tab${tab === 'hc' ? ' active' : ''}`} onClick={() => setTab('hc')}>
          <span className="tab-dot hc" />HC TPS
        </button>
        <button className={`tps-tab${tab === 'fc' ? ' active' : ''}`} onClick={() => setTab('fc')}>
          <span className="tab-dot fc" />FC TPS
        </button>
      </div>

      {loading && !nextGame ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
          {[1, 2, 3].map(i => <div key={i} className="skeleton-row" style={{ height: 60 }} />)}
        </div>
      ) : (
        <>
          {nextGame && (
            <>
              <div className="tps-section-label">SEURAAVA OTTELU</div>
              <NextGameCard game={nextGame} />
            </>
          )}

          {upcomingGames.length > 0 && (
            <div className="tps-upcoming">
              <div className="tps-upcoming-header">
                <span className="tps-upcoming-title">Tulevat ottelut</span>
                <span className="tps-upcoming-count">{upcomingGames.length} ottelua</span>
              </div>
              <div className="next-match-list">
                {upcomingGames.map((game, i) => (
                  <GameListItem key={i} game={game} />
                ))}
              </div>
            </div>
          )}

          {showSeasonEnded && <SeasonEndedCard />}
        </>
      )}
    </div>
  )
}
