import { useState, useEffect } from 'react'
import { fetchWithTimeout } from '../utils/fetch'
import { PageHeader } from './PageHeader'
import { FeatureMatchCard } from './MatchCard'
import quotes from '../../quotes.json'
import './PageHome.css'

// --- API URLs ---

const TURKU_LAT = 60.4518
const TURKU_LON = 22.2666

const WEATHER_URL = `https://api.open-meteo.com/v1/forecast?latitude=${TURKU_LAT}&longitude=${TURKU_LON}&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m&hourly=temperature_2m,weather_code,precipitation_probability,wind_speed_10m&daily=sunrise,sunset&wind_speed_unit=ms&timezone=Europe/Helsinki&forecast_days=2`

const AIR_QUALITY_URL = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${TURKU_LAT}&longitude=${TURKU_LON}&current=uv_index&hourly=birch_pollen,grass_pollen,alder_pollen&timezone=Europe/Helsinki&forecast_days=1`

const TPS_ICS = 'https://hc.tps.fi/fi-fi/?action=getContent&type=exportcalendar&format=ics&levelId=64&season=2026'
const TPS_ICS_URL = `/.netlify/functions/proxy?url=${encodeURIComponent(TPS_ICS)}`

const YLE_RSS = 'https://yle.fi/rss/t/18-198259/fi'
const YLE_RSS_URL = `/.netlify/functions/proxy?url=${encodeURIComponent(YLE_RSS)}`

const FC_TPS_PAGE = 'https://fc.tps.fi/ottelut/miesten-edustus/'
const FC_TPS_URL = `/.netlify/functions/proxy?url=${encodeURIComponent(FC_TPS_PAGE)}`

const FC_INTER_PAGE = 'https://fcinter.fi/ottelut/edustus'
const FC_INTER_URL = `/.netlify/functions/proxy?url=${encodeURIComponent(FC_INTER_PAGE)}`

const FC_NAISET_PAGE = 'https://fc.tps.fi/ottelut/naisten-edustus/'
const FC_NAISET_URL = `/.netlify/functions/proxy?url=${encodeURIComponent(FC_NAISET_PAGE)}`

const DIGITRANSIT_URL = 'https://api.digitransit.fi/routing/v2/waltti/gtfs/v1'

// --- Weather codes ---

const weatherCodes = {
  0: { icon: '☀️', text: 'Selkeää' },
  1: { icon: '🌤️', text: 'Poutaa' },
  2: { icon: '⛅', text: 'Puolipilvistä' },
  3: { icon: '☁️', text: 'Pilvistä' },
  45: { icon: '🌫️', text: 'Sumua' },
  48: { icon: '🌫️', text: 'Sumua' },
  51: { icon: '🌧️', text: 'Tihkusadetta' },
  53: { icon: '🌧️', text: 'Tihkusadetta' },
  55: { icon: '🌧️', text: 'Tihkusadetta' },
  61: { icon: '🌧️', text: 'Sadetta' },
  63: { icon: '🌧️', text: 'Sadetta' },
  65: { icon: '🌧️', text: 'Kovaa sadetta' },
  71: { icon: '🌨️', text: 'Lumisadetta' },
  73: { icon: '🌨️', text: 'Lumisadetta' },
  75: { icon: '🌨️', text: 'Kovaa lumisadetta' },
  77: { icon: '🌨️', text: 'Lumirakeita' },
  80: { icon: '🌦️', text: 'Sadekuuroja' },
  81: { icon: '🌦️', text: 'Sadekuuroja' },
  82: { icon: '🌦️', text: 'Kovia kuuroja' },
  85: { icon: '🌨️', text: 'Lumikuuroja' },
  86: { icon: '🌨️', text: 'Lumikuuroja' },
  95: { icon: '⛈️', text: 'Ukkosta' },
  96: { icon: '⛈️', text: 'Ukkosta' },
  99: { icon: '⛈️', text: 'Ukkosta' },
}

// --- Pure helper functions ---

function getWeather(code) {
  return weatherCodes[code] || { icon: '❓', text: 'Tuntematon' }
}

function getUvLevel(uv) {
  if (uv < 3) return { text: 'Matala', color: 'var(--accent-green)' }
  if (uv < 6) return { text: 'Kohtalainen', color: 'var(--accent-yellow)' }
  if (uv < 8) return { text: 'Korkea', color: 'var(--accent-orange)' }
  return { text: 'Erittäin korkea', color: 'var(--accent-red)' }
}

function getPollenLevel(value) {
  if (!value || value < 0.5) return null
  if (value < 10) return { text: 'vähän', color: 'var(--accent-yellow)' }
  if (value < 100) return { text: 'kohtalaista', color: 'var(--accent-orange)' }
  return { text: 'runsaasti', color: 'var(--accent-red)' }
}

function getDaylightDuration(sunrise, sunset) {
  const durationMs = new Date(sunset) - new Date(sunrise)
  return {
    hours: Math.floor(durationMs / 3600000),
    minutes: Math.floor((durationMs % 3600000) / 60000),
  }
}

function getDaylightRemaining(sunset) {
  const diffMs = new Date(sunset) - new Date()
  if (diffMs <= 0) return null
  return {
    hours: Math.floor(diffMs / 3600000),
    minutes: Math.floor((diffMs % 3600000) / 60000),
  }
}

function getSunProgress(sunrise, sunset) {
  const now = new Date()
  const sunriseTime = new Date(sunrise)
  const sunsetTime = new Date(sunset)
  if (now < sunriseTime) return 0
  if (now > sunsetTime) return 1
  return (now - sunriseTime) / (sunsetTime - sunriseTime)
}

function formatTimeStr(isoString) {
  return new Date(isoString).toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit' })
}

function getDailyQuote() {
  if (!quotes.length) return ''
  const dayCount = Math.floor(Date.now() / 86400000)
  return quotes[dayCount % quotes.length]
}

const SHORT_WEEKDAYS = ['SU', 'MA', 'TI', 'KE', 'TO', 'PE', 'LA']

function formatShortDate(date = new Date()) {
  return `${SHORT_WEEKDAYS[date.getDay()]} ${date.getDate()}.${date.getMonth() + 1}.`
}

function getDaylightSubtitle(sunrise, sunset, tomorrowSunrise) {
  const now = new Date()
  const sunriseTime = new Date(sunrise)
  const sunsetTime = new Date(sunset)

  const fmt = (ms) => {
    const h = Math.floor(ms / 3600000)
    const m = Math.floor((ms % 3600000) / 60000)
    return h > 0 ? `${h} t ${m} min` : `${m} min`
  }

  if (now < sunriseTime) {
    return `Aurinko nousee ${fmt(sunriseTime - now)} päästä`
  } else if (now < sunsetTime) {
    return `Aurinko laskee ${fmt(sunsetTime - now)} päästä`
  } else if (tomorrowSunrise) {
    return `Aurinko nousee ${fmt(new Date(tomorrowSunrise) - now)} päästä`
  }
  return null
}

function getCurrentDatetime() {
  const weekdays = ['su', 'ma', 'ti', 'ke', 'to', 'pe', 'la']
  const now = new Date()
  const d = now.getDate()
  const m = now.getMonth() + 1
  const h = String(now.getHours()).padStart(2, '0')
  const min = String(now.getMinutes()).padStart(2, '0')
  return { date: `${weekdays[now.getDay()]} ${d}.${m}.`, time: `${h}:${min}` }
}

function formatTpsGame(summary) {
  const parts = summary.split('-')
  if (parts.length < 2) return { vsText: summary, isHome: true }
  const home = parts[0].trim()
  const away = parts.slice(1).join('-').trim()
  return home === 'TPS'
    ? { vsText: `vs. ${away}`, isHome: true }
    : { vsText: `@ ${home}`, isHome: false }
}

function formatRelativeTime(date) {
  if (!date) return ''
  const diffMin = Math.floor((Date.now() - date.getTime()) / 60000)
  if (diffMin < 60) return `${diffMin} min sitten`
  return `${Math.floor(diffMin / 60)} t sitten`
}

// --- Sub-components ---

const FC_LEAGUE = {
  label: 'VEIKKAUSLIIGA',
  borderColor: '#e6007e',
  badgeBg: 'rgba(212, 160, 23, 0.18)',
  badgeText: '#d4a017',
}

const HC_LEAGUE = {
  label: 'LIIGA',
  borderColor: '#1e88e5',
  badgeBg: 'rgba(30, 136, 229, 0.18)',
  badgeText: '#5dabe5',
}

const INTER_LEAGUE = {
  label: 'VEIKKAUSLIIGA',
  borderColor: '#e6007e',
  badgeBg: 'rgba(212, 160, 23, 0.18)',
  badgeText: '#d4a017',
}

const NAISET_LEAGUE = {
  label: 'KANSALLINEN YKKÖNEN',
  borderColor: '#372A95',
  badgeBg: 'rgba(55, 42, 149, 0.22)',
  badgeText: '#b3a8f5',
}

function NextHomeMatchCard({ game, league, teamName, teamShortName = 'TPS' }) {
  return (
    <FeatureMatchCard
      teamName={teamName}
      teamShortName={teamShortName}
      opponent={game.opponent}
      isHome={true}
      date={game.date}
      leagueLabel={league.label}
      leagueColors={{ bg: league.badgeBg, text: league.badgeText }}
      borderColor={league.borderColor}
      venueLabel="Koti"
    />
  )
}

function SunArc({ sunrise, sunset }) {
  const progress = getSunProgress(sunrise, sunset)
  const width = 300
  const height = 110
  const pad = 20
  const ay = height - 20
  const cx = width / 2
  const cy = 10
  const sx = pad
  const ex = width - pad
  const t = progress
  const sunX = (1 - t) * (1 - t) * sx + 2 * (1 - t) * t * cx + t * t * ex
  const sunY = (1 - t) * (1 - t) * ay + 2 * (1 - t) * t * cy + t * t * ay
  const arcPath = `M ${sx} ${ay} Q ${cx} ${cy} ${ex} ${ay}`
  const arcLen = 320

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" style={{ display: 'block' }} aria-hidden="true">
      <path d={arcPath} fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeDasharray="4 4" opacity="0.4" />
      {progress > 0 && (
        <path d={arcPath} fill="none" stroke="var(--accent-orange)" strokeWidth="2" strokeDasharray={`${progress * arcLen} ${arcLen}`} />
      )}
      <circle cx={sx} cy={ay} r="4" fill="var(--accent-orange)" />
      <circle cx={ex} cy={ay} r="4" fill="var(--text-muted)" opacity="0.6" />
      {progress > 0 && progress < 1 && (
        <>
          <text x={sunX} y={sunY - 14} textAnchor="middle" fill="var(--text-muted)" fontSize="10" fontWeight="600" letterSpacing="0.4">nyt</text>
          <circle cx={sunX} cy={sunY} r="8" fill="var(--accent-orange)" />
        </>
      )}
    </svg>
  )
}

function HourlyStrip({ forecast }) {
  return (
    <div className="hourly-strip">
      {forecast.map((h) => (
        <div key={h.hour} className="hourly-cell">
          <span className="hourly-hour">{h.hour}:00</span>
          <span className="hourly-emoji">{getWeather(h.weatherCode).icon}</span>
          <span className="hourly-temp">{h.temp}°</span>
          <span className={h.precip > 20 ? 'hourly-precip hourly-precip-rain' : 'hourly-precip hourly-precip-none'}>
            {h.precip > 0 ? `${h.precip}%` : '—'}
          </span>
          <span className="hourly-wind">{h.wind != null ? `${h.wind} m/s` : '—'}</span>
        </div>
      ))}
    </div>
  )
}

const UV_SEGMENTS = [
  { max: 3,  color: 'var(--accent-green)' },
  { max: 6,  color: 'var(--accent-yellow)' },
  { max: 8,  color: 'var(--accent-orange)' },
  { max: 11, color: 'var(--accent-red)' },
]

function UvMeter({ uv }) {
  return (
    <div className="uv-meter">
      {UV_SEGMENTS.map((seg, i) => {
        const prevMax = i === 0 ? 0 : UV_SEGMENTS[i - 1].max
        const segWidth = seg.max - prevMax
        const fillRatio = Math.min(1, Math.max(0, (uv - prevMax) / segWidth))
        return (
          <div key={i} className="uv-segment" style={{ flex: segWidth, background: 'var(--border)' }}>
            <div className="uv-segment-fill" style={{ background: seg.color, transform: `scaleX(${fillRatio})`, transformOrigin: 'left' }} />
          </div>
        )
      })}
    </div>
  )
}

function AirQualityPanel({ uv, pollen }) {
  const uvLevel = uv != null ? getUvLevel(uv) : null
  const pollenRows = [
    { name: 'Koivu', level: getPollenLevel(pollen?.birch) },
    { name: 'Heinä', level: getPollenLevel(pollen?.grass) },
    { name: 'Leppä', level: getPollenLevel(pollen?.alder) },
  ]
  const anyPollen = pollenRows.some(r => r.level !== null)

  return (
    <div className="air-quality-grid">
      <div className="aq-card">
        <div className="aq-label">UV-indeksi</div>
        {uvLevel ? (
          <>
            <div className="uv-value-row">
              <span className="uv-value" style={{ color: uvLevel.color }}>{Math.round(uv)}</span>
              <span className="uv-text">{uvLevel.text}</span>
            </div>
            <UvMeter uv={uv} />
          </>
        ) : (
          <span className="pollen-none">—</span>
        )}
      </div>
      <div className="aq-card">
        <div className="aq-label">Siitepöly</div>
        {anyPollen ? (
          <div className="pollen-rows">
            {pollenRows.map(({ name, level }) => (
              <div key={name} className="pollen-row">
                <span className="pollen-name">{name}</span>
                {level ? (
                  <span className="pollen-value">
                    <span className="pollen-dot" style={{ background: level.color }} />
                    <span className="pollen-level-text" style={{ color: level.color }}>{level.text}</span>
                  </span>
                ) : (
                  <span className="pollen-dash">—</span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <span className="pollen-none">Ei merkittävää</span>
        )}
      </div>
    </div>
  )
}

// --- Data helpers ---

function getHourlyForecast(hourlyData) {
  if (!hourlyData) return []
  const now = new Date()
  const today = now.toDateString()
  const forecast = []
  for (let i = 0; i < hourlyData.time.length; i++) {
    const time = new Date(hourlyData.time[i])
    if (time >= now && time.toDateString() === today) {
      forecast.push({
        hour: time.getHours(),
        temp: Math.round(hourlyData.temperature_2m[i]),
        weatherCode: hourlyData.weather_code[i],
        precip: hourlyData.precipitation_probability[i] ?? 0,
        wind: hourlyData.wind_speed_10m?.[i] != null ? Math.round(hourlyData.wind_speed_10m[i]) : null,
      })
    }
  }
  return forecast
}

function getDailyMaxPollen(hourlyData) {
  if (!hourlyData) return { birch: 0, grass: 0, alder: 0 }
  return {
    birch: hourlyData.birch_pollen ? Math.max(...hourlyData.birch_pollen) : 0,
    grass: hourlyData.grass_pollen ? Math.max(...hourlyData.grass_pollen) : 0,
    alder: hourlyData.alder_pollen ? Math.max(...hourlyData.alder_pollen) : 0,
  }
}

function parseNewsWithDates(xmlText) {
  const parser = new DOMParser()
  const xml = parser.parseFromString(xmlText, 'text/xml')
  return Array.from(xml.querySelectorAll('item')).map(item => {
    const pubDateStr = item.querySelector('pubDate')?.textContent || ''
    return {
      title: item.querySelector('title')?.textContent || '',
      url: item.querySelector('link')?.textContent || '',
      pubDate: pubDateStr ? new Date(pubDateStr) : null,
    }
  })
}

function parseHcNextHomeGame(icsText) {
  const lines = icsText.split('\n')
  let event = null
  let nextHome = null
  const now = new Date()

  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed === 'BEGIN:VEVENT') {
      event = {}
    } else if (trimmed === 'END:VEVENT' && event) {
      if (event.start && event.summary && event.start > now) {
        const isHome = event.summary.trim().startsWith('TPS')
        if (isHome && (!nextHome || event.start < nextHome.start)) nextHome = event
      }
      event = null
    } else if (event) {
      if (trimmed.startsWith('DTSTART:')) {
        const s = trimmed.slice(8)
        event.start = new Date(Date.UTC(+s.slice(0,4), +s.slice(4,6)-1, +s.slice(6,8), +s.slice(9,11), +s.slice(11,13)))
      } else if (trimmed.startsWith('SUMMARY:')) {
        event.summary = trimmed.slice(8)
      } else if (trimmed.startsWith('LOCATION:')) {
        event.location = trimmed.slice(9)
      }
    }
  }
  if (!nextHome) return null
  const parts = nextHome.summary.split('-')
  const opponent = parts.slice(1).join('-').trim()
  return { date: nextHome.start, opponent, venue: nextHome.location || 'Veritas Areena' }
}

function parseFcNextHomeGame(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const now = new Date()
  const DATE_RE = /(\d{2})\.(\d{2})\.(\d{4})\s+(\d{1,2})\.(\d{2})/

  for (const row of doc.querySelectorAll('tr')) {
    const cells = Array.from(row.querySelectorAll('td'))
    if (cells.length < 2) continue
    let gameDate = null, homeTeam = null, awayTeam = null, venue = null

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
    if (!homeTeam.toUpperCase().includes('TPS')) continue
    return { date: gameDate, opponent: awayTeam, venue: venue || 'Veritas Stadion' }
  }
  return null
}

function parseFcInterNextHomeGame(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const now = new Date()
  const DATE_RE = /(\d{2})\.(\d{2})\.(\d{4}),\s*KLO:\s*(\d{2}):(\d{2})/

  let upcomingList = null
  for (const h of doc.querySelectorAll('h1, h2, h3, h4')) {
    if (h.textContent.trim().toLowerCase().startsWith('tulevat')) {
      let el = h.nextElementSibling
      while (el && el.tagName !== 'UL') el = el.nextElementSibling
      upcomingList = el
      break
    }
  }
  if (!upcomingList) return null

  for (const li of upcomingList.children) {
    if (li.tagName !== 'LI') continue
    const dm = li.textContent.match(DATE_RE)
    if (!dm) continue
    const date = new Date(+dm[3], +dm[2] - 1, +dm[1], +dm[4], +dm[5])
    if (date <= now) continue

    let home = null, away = null
    for (const p of li.querySelectorAll('p')) {
      const spans = p.querySelectorAll(':scope > span')
      if (spans.length !== 3) continue
      const middle = spans[1].textContent.trim().toLowerCase()
      if (middle !== 'vs.' && middle !== 'vs') continue
      home = spans[0].textContent.trim()
      away = spans[2].textContent.trim()
      if (home && away) break
    }
    if (!home || !away) continue
    if (!home.toLowerCase().includes('inter')) continue

    let venue = null
    for (const s of li.querySelectorAll('span')) {
      if (s.children.length > 0) continue
      const t = s.textContent.trim()
      if (!t || t.length > 60) continue
      if (DATE_RE.test(t)) continue
      if (/^vs\.?$/i.test(t) || /^edustus$/i.test(t) || /^lisätiedot$/i.test(t)) continue
      if (t === home || t === away) continue
      venue = t
      break
    }

    return { date, opponent: away, venue: venue || 'Veritas Stadion' }
  }
  return null
}

// --- Bus fetching ---

const BUS_QUERY = `
query GetDepartures($stopId: String!, $numberOfDepartures: Int!) {
  stop(id: $stopId) {
    name
    stoptimesWithoutPatterns(numberOfDepartures: $numberOfDepartures) {
      scheduledDeparture
      realtimeDeparture
      realtime
      serviceDay
      headsign
      trip { route { shortName } }
    }
  }
}
`

const BUS_REFRESH_MS = 30000
const BUS_SOON_MINUTES = 5

function readBusStops() {
  try {
    const saved = localStorage.getItem('busStops')
    return saved ? JSON.parse(saved) : []
  } catch { return [] }
}

function readCustomNames() {
  try {
    return JSON.parse(localStorage.getItem('busStopNames') || '{}')
  } catch { return {} }
}

function readApiNames() {
  try {
    return JSON.parse(localStorage.getItem('busApiNames') || '{}')
  } catch { return {} }
}

function writeApiNames(names) {
  try {
    localStorage.setItem('busApiNames', JSON.stringify(names))
  } catch { /* silent */ }
}

function readHomeHidden() {
  try {
    return JSON.parse(localStorage.getItem('busHomeHidden') || '[]')
  } catch { return [] }
}

function writeHomeHidden(hidden) {
  try {
    localStorage.setItem('busHomeHidden', JSON.stringify(hidden))
  } catch { /* silent */ }
}

function writeBusStops(stops) {
  try {
    localStorage.setItem('busStops', JSON.stringify(stops))
  } catch { /* silent */ }
}

async function fetchNextDeparture(stopId, apiKey) {
  try {
    const res = await fetchWithTimeout(DIGITRANSIT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'digitransit-subscription-key': apiKey },
      body: JSON.stringify({ query: BUS_QUERY, variables: { stopId, numberOfDepartures: 5 } }),
    })
    const json = await res.json()
    const stop = json.data?.stop
    if (!stop) return { apiName: null, departure: null }
    const now = Date.now()
    const departure = stop.stoptimesWithoutPatterns
      .map(dep => {
        const depSeconds = dep.realtime ? dep.realtimeDeparture : dep.scheduledDeparture
        const depMs = (dep.serviceDay + depSeconds) * 1000
        return {
          line: dep.trip.route.shortName,
          mins: Math.floor((depMs - now) / 60000),
          depMs,
        }
      })
      .filter(d => d.mins >= 0)[0] || null
    return { apiName: stop.name, departure }
  } catch {
    return { apiName: null, departure: null }
  }
}

// --- Bus home section + edit modal ---

function BusHomeSection({ stops, departures, hasAnyStops, onEdit }) {
  if (!hasAnyStops) return null
  return (
    <div className="home-section">
      <div className="home-section-heading">
        <div className="home-section-title">Seuraavat bussit</div>
        <button className="home-section-edit" onClick={onEdit}>Muokkaa</button>
      </div>
      {stops.length === 0 ? (
        <div className="bus-home-card bus-home-empty-card">
          Kaikki pysäkit piilotettu — valitse näytettävät Muokkaa-painikkeesta.
        </div>
      ) : (
      <div className="bus-home-card">
        {stops.map((stopId, i) => {
          const item = departures[stopId]
          const dep = item?.departure
          const mins = dep?.depMs != null ? Math.floor((dep.depMs - Date.now()) / 60000) : null
          const upcoming = mins != null && mins >= 0
          const soon = upcoming && mins <= BUS_SOON_MINUTES
          return (
            <div key={stopId} className={`bus-home-row ${i > 0 ? 'with-divider' : ''}`}>
              <img src="/foli-logo.svg" alt="" className="bus-home-logo" />
              <span className="bus-home-stop-name">{item?.stopName || stopId.replace('FOLI:', '')}</span>
              {upcoming ? (
                <>
                  <span className={`bus-home-line ${soon ? 'soon' : ''}`}>{dep.line}</span>
                  <span className={`bus-home-mins ${soon ? 'soon' : ''}`}>
                    {mins === 0 ? 'nyt' : `${mins} min`}
                  </span>
                </>
              ) : item ? (
                <span className="bus-home-empty">Ei lähtöjä</span>
              ) : (
                <span className="skeleton-row bus-home-skeleton" />
              )}
            </div>
          )
        })}
      </div>
      )}
    </div>
  )
}

function BusEditModal({ allStops, customNames, apiNames, initialHidden, onClose, onGotoBusEdit }) {
  const [hidden, setHidden] = useState(initialHidden)

  function toggleHidden(stopId) {
    setHidden(h => h.includes(stopId) ? h.filter(s => s !== stopId) : [...h, stopId])
  }

  function handleDone() {
    onClose({ hidden })
  }

  function handleGoto() {
    onClose({ hidden })
    onGotoBusEdit?.()
  }

  return (
    <div className="bus-edit-backdrop" onClick={handleDone}>
      <div className="bus-edit-sheet" onClick={e => e.stopPropagation()}>
        <div className="bus-edit-grabber" />
        <div className="bus-edit-header">
          <div className="bus-edit-header-text">
            <div className="bus-edit-title">Etusivulla näytettävät</div>
            <div className="bus-edit-sub">Tästä valitset mitkä pysäkit näytetään etusivulla. Järjestystä ja sisältöä hallitaan Bussit-näkymässä.</div>
          </div>
          <button className="bus-edit-done" onClick={handleDone}>Valmis</button>
        </div>
        <div className="bus-edit-list">
          {allStops.map(stopId => {
            const visible = !hidden.includes(stopId)
            const apiId = stopId.replace('FOLI:', '')
            const displayName = customNames[stopId] || apiNames[stopId] || apiId
            return (
              <label key={stopId} className="bus-edit-row">
                <img src="/foli-logo.svg" alt="" className="bus-edit-logo" />
                <div className="bus-edit-name-col">
                  <div className="bus-edit-name">{displayName}</div>
                  <div className="bus-edit-id">Tunnus {apiId}</div>
                </div>
                <button
                  type="button"
                  className={`bus-edit-checkbox ${visible ? 'checked' : ''}`}
                  onClick={() => toggleHidden(stopId)}
                  aria-pressed={visible}
                  aria-label={visible ? 'Piilota etusivulta' : 'Näytä etusivulla'}
                >
                  {visible && (
                    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                      <path d="M3 7l3 3 5-6" stroke="#000" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </button>
              </label>
            )
          })}
          {allStops.length === 0 && (
            <div className="bus-edit-empty">Ei tallennettuja pysäkkejä. Lisää pysäkki Bussit-välilehdellä.</div>
          )}
        </div>
        <button type="button" className="bus-edit-goto" onClick={handleGoto}>
          Hallitse pysäkkejä Bussit-näkymässä →
        </button>
      </div>
    </div>
  )
}

// --- Caches (stale-while-revalidate via localStorage) ---

const TPS_CACHE_KEY = 'tpsHomeGames'
const WEATHER_CACHE_KEY = 'weatherHomeCache'
const NEWS_CACHE_KEY = 'newsHomeCache'
const BUS_CACHE_KEY = 'busDeparturesCache'
const WEATHER_CACHE_TTL_MS = 30 * 60 * 1000

function readCachedTpsGames() {
  try {
    const raw = localStorage.getItem(TPS_CACHE_KEY)
    if (!raw) return { hc: null, fc: null, inter: null, naiset: null }
    const parsed = JSON.parse(raw)
    const now = Date.now()
    const revive = (g) => {
      if (!g) return null
      const date = new Date(g.date)
      // Drop cached game if it's already in the past
      if (isNaN(date) || date.getTime() <= now) return null
      return { ...g, date }
    }
    return { hc: revive(parsed.hc), fc: revive(parsed.fc), inter: revive(parsed.inter), naiset: revive(parsed.naiset) }
  } catch {
    return { hc: null, fc: null, inter: null, naiset: null }
  }
}

function writeCachedTpsGames(hc, fc, inter, naiset) {
  try {
    localStorage.setItem(TPS_CACHE_KEY, JSON.stringify({ hc, fc, inter, naiset }))
  } catch { /* silent */ }
}

function readCachedWeather() {
  try {
    const raw = localStorage.getItem(WEATHER_CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed.fetchedAt || Date.now() - parsed.fetchedAt > WEATHER_CACHE_TTL_MS) return null
    return parsed
  } catch {
    return null
  }
}

function writeCachedWeather(weather, airQuality) {
  try {
    localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify({
      weather, airQuality, fetchedAt: Date.now()
    }))
  } catch { /* silent */ }
}

function readCachedNews() {
  try {
    const raw = localStorage.getItem(NEWS_CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed.map(n => ({ ...n, pubDate: n.pubDate ? new Date(n.pubDate) : null }))
  } catch {
    return null
  }
}

function writeCachedNews(news) {
  try {
    localStorage.setItem(NEWS_CACHE_KEY, JSON.stringify(news))
  } catch { /* silent */ }
}

function readCachedBusDepartures() {
  try {
    const raw = localStorage.getItem(BUS_CACHE_KEY)
    if (!raw) return {}
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

function writeCachedBusDepartures(departures) {
  try {
    localStorage.setItem(BUS_CACHE_KEY, JSON.stringify(departures))
  } catch { /* silent */ }
}

// --- PageHome component ---

export default function PageHome({ onNavigate, onGotoBusEdit }) {
  const [weather, setWeather] = useState(() => readCachedWeather()?.weather ?? null)
  const [airQuality, setAirQuality] = useState(() => readCachedWeather()?.airQuality ?? null)
  const [news, setNews] = useState(() => readCachedNews())
  const [hcHomeGame, setHcHomeGame] = useState(() => readCachedTpsGames().hc)
  const [fcHomeGame, setFcHomeGame] = useState(() => readCachedTpsGames().fc)
  const [interHomeGame, setInterHomeGame] = useState(() => readCachedTpsGames().inter)
  const [naisetHomeGame, setNaisetHomeGame] = useState(() => readCachedTpsGames().naiset)
  const [weatherExpanded, setWeatherExpanded] = useState(false)
  const [busStops, setBusStops] = useState(readBusStops)
  const [busHidden, setBusHidden] = useState(readHomeHidden)
  const [busDepartures, setBusDepartures] = useState(readCachedBusDepartures)
  const [editingBuses, setEditingBuses] = useState(false)
  const visibleBusStops = busStops.filter(s => !busHidden.includes(s))

  async function doFetchBuses() {
    if (!visibleBusStops.length) return
    const apiKey = import.meta.env.VITE_DIGITRANSIT_API_KEY || ''
    const customNames = readCustomNames()
    const results = await Promise.all(
      visibleBusStops.map(async stopId => {
        const { apiName, departure } = await fetchNextDeparture(stopId, apiKey)
        const stopName = customNames[stopId] || apiName || stopId.replace('FOLI:', '')
        return [stopId, { stopName, apiName, departure }]
      })
    )
    const departures = Object.fromEntries(results)
    setBusDepartures(departures)
    writeCachedBusDepartures(departures)

    const cached = readApiNames()
    let changed = false
    for (const [id, { apiName }] of Object.entries(departures)) {
      if (apiName && cached[id] !== apiName) {
        cached[id] = apiName
        changed = true
      }
    }
    if (changed) writeApiNames(cached)
  }

  function handleBusEditClose({ hidden }) {
    if (hidden.join(',') !== busHidden.join(',')) {
      writeHomeHidden(hidden)
      setBusHidden(hidden)
    }
    setEditingBuses(false)
  }

  async function doFetchWeather() {
    try {
      const [weatherRes, airRes] = await Promise.all([
        fetchWithTimeout(WEATHER_URL),
        fetchWithTimeout(AIR_QUALITY_URL),
      ])
      let nextWeather = null, nextAir = null
      if (weatherRes.ok) {
        nextWeather = await weatherRes.json()
        setWeather(nextWeather)
      }
      if (airRes.ok) {
        nextAir = await airRes.json()
        setAirQuality(nextAir)
      }
      if (nextWeather || nextAir) writeCachedWeather(nextWeather, nextAir)
    } catch { /* silent */ }
  }

  async function doFetchNews() {
    try {
      const res = await fetchWithTimeout(YLE_RSS_URL)
      if (res.ok) {
        const parsed = parseNewsWithDates(await res.text())
        setNews(parsed)
        writeCachedNews(parsed)
      }
    } catch { /* silent */ }
  }

  async function doFetchTPS() {
    try {
      const [hcRes, fcRes, interRes, naisetRes] = await Promise.all([
        fetchWithTimeout(TPS_ICS_URL),
        fetchWithTimeout(FC_TPS_URL),
        fetchWithTimeout(FC_INTER_URL),
        fetchWithTimeout(FC_NAISET_URL),
      ])
      let hc = null, fc = null, inter = null, naiset = null
      if (hcRes.ok) {
        hc = parseHcNextHomeGame(await hcRes.text())
        setHcHomeGame(hc)
      }
      if (fcRes.ok) {
        fc = parseFcNextHomeGame(await fcRes.text())
        setFcHomeGame(fc)
      }
      if (interRes.ok) {
        inter = parseFcInterNextHomeGame(await interRes.text())
        setInterHomeGame(inter)
      }
      if (naisetRes.ok) {
        naiset = parseFcNextHomeGame(await naisetRes.text())
        setNaisetHomeGame(naiset)
      }
      writeCachedTpsGames(hc, fc, inter, naiset)
    } catch { /* silent */ }
  }

  useEffect(() => {
    doFetchWeather()
    doFetchNews()
    doFetchTPS()
  }, [])

  useEffect(() => {
    if (editingBuses || !visibleBusStops.length) return
    doFetchBuses()
    const interval = setInterval(() => {
      if (!document.hidden) doFetchBuses()
    }, BUS_REFRESH_MS)
    function onVisibility() {
      if (!document.hidden) doFetchBuses()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [busStops, busHidden, editingBuses])

  // Derived weather data
  const current = weather?.current
  const weatherInfo = current ? getWeather(current.weather_code) : null
  const sunrise = weather?.daily?.sunrise?.[0]
  const sunset = weather?.daily?.sunset?.[0]
  const tomorrowSunrise = weather?.daily?.sunrise?.[1]
  const hourlyForecast = weather ? getHourlyForecast(weather.hourly) : []
  const dailyPollen = getDailyMaxPollen(airQuality?.hourly)
  const uv = airQuality?.current?.uv_index
  const daylight = sunrise && sunset ? getDaylightDuration(sunrise, sunset) : null
  const daylightRemaining = sunset ? getDaylightRemaining(sunset) : null
  const daylightSubtitle = sunrise && sunset ? getDaylightSubtitle(sunrise, sunset, tomorrowSunrise) : null

  const dailyQuote = getDailyQuote()
  const todayShort = formatShortDate()

  return (
    <div className="page-home">
      <PageHeader />

      <section className="quote-section" aria-label="Päivän sanonta">
        <p className="quote-text">
          <span className="quote-mark" aria-hidden="true">“</span>
          {dailyQuote}
        </p>
        <div className="quote-caption">
          <span className="quote-caption-date">{todayShort}</span>
          {daylightSubtitle && (
            <>
              <span className="quote-caption-sep"> · </span>
              <span className="quote-caption-daylight">{daylightSubtitle}</span>
            </>
          )}
        </div>
      </section>

      {/* Weather card */}
      <div className="weather-card">
        <div
          className="weather-toggle"
          role="button"
          tabIndex={0}
          aria-expanded={weatherExpanded}
          onClick={() => setWeatherExpanded(e => !e)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              setWeatherExpanded(prev => !prev)
            }
          }}
        >
          {current && weatherInfo ? (
            <div className="weather-current">
              <div className="weather-emoji-wrap" aria-hidden="true">{weatherInfo.icon}</div>
              <div style={{ flex: 1 }}>
                <div className="weather-temp">{Math.round(current.temperature_2m)}°</div>
                <div className="weather-condition">
                  {[
                    weatherInfo.text,
                    current.apparent_temperature != null && `tuntuu ${Math.round(current.apparent_temperature)}°`,
                    current.wind_speed_10m != null && `tuuli ${Math.round(current.wind_speed_10m)} m/s`,
                  ].filter(Boolean).join(' · ')}
                </div>
              </div>
              <svg aria-hidden="true" width="12" height="8" viewBox="0 0 12 8" className="weather-chevron" style={{ transform: weatherExpanded ? 'rotate(180deg)' : 'rotate(0)' }}>
                <path d="M1 1l5 5 5-5" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          ) : (
            <div className="weather-current">
              <div className="skeleton-row" style={{ width: 48, height: 48, borderRadius: '50%' }} />
              <div>
                <div className="skeleton-row" style={{ width: 60, height: 28, borderRadius: 6 }} />
                <div className="skeleton-row" style={{ width: 100, height: 16, borderRadius: 4, marginTop: 6 }} />
              </div>
            </div>
          )}
        </div>

        {sunrise && sunset && (
          <div className="weather-sun-strip">
            <div className="sun-cell">
              <div className="sun-label">NOUSI</div>
              <div className="sun-value">{formatTimeStr(sunrise)}</div>
            </div>
            <div className="sun-cell sun-cell-center">
              <div className="sun-label">PÄIVÄN PITUUS</div>
              <div className="sun-value">
                {daylight ? `${daylight.hours}t ${daylight.minutes}min` : '—'}
              </div>
            </div>
            <div className="sun-cell sun-cell-right">
              <div className="sun-label">LASKEE</div>
              <div className="sun-value sun-value-orange">{formatTimeStr(sunset)}</div>
            </div>
          </div>
        )}

        {weatherExpanded && (
          <div className="weather-expanded">
            {sunrise && sunset && (
              <SunArc sunrise={sunrise} sunset={sunset} />
            )}
            {hourlyForecast.length > 0 && (
              <>
                <div className="section-label">LOPPUPÄIVÄN ENNUSTE</div>
                <HourlyStrip forecast={hourlyForecast} />
              </>
            )}
            <div className="air-quality-section">
              <div className="section-label">ILMANLAATU TÄNÄÄN</div>
              <AirQualityPanel uv={uv} pollen={dailyPollen} />
            </div>
          </div>
        )}
      </div>

      {/* Bus home section */}
      <BusHomeSection
        stops={visibleBusStops}
        departures={busDepartures}
        hasAnyStops={busStops.length > 0}
        onEdit={() => setEditingBuses(true)}
      />

      {editingBuses && (
        <BusEditModal
          allStops={busStops}
          customNames={readCustomNames()}
          apiNames={readApiNames()}
          initialHidden={busHidden}
          onClose={handleBusEditClose}
          onGotoBusEdit={onGotoBusEdit}
        />
      )}

      {/* Next home match section */}
      {(() => {
        const homeMatches = [
          fcHomeGame && { game: fcHomeGame, league: FC_LEAGUE, teamName: 'FC TPS' },
          hcHomeGame && { game: hcHomeGame, league: HC_LEAGUE, teamName: 'HC TPS' },
          interHomeGame && { game: interHomeGame, league: INTER_LEAGUE, teamName: 'FC Inter', teamShortName: 'Inter' },
          naisetHomeGame && { game: naisetHomeGame, league: NAISET_LEAGUE, teamName: 'FC TPS Naiset' },
        ].filter(Boolean).sort((a, b) => a.game.date - b.game.date)
        if (!homeMatches.length) return null
        return (
          <div className="home-section">
            <div className="home-section-heading">
              <div className="home-section-title">
                {homeMatches.length > 1 ? 'Seuraavat kotiottelut' : 'Seuraava kotiottelu'}
              </div>
            </div>
            <div className="next-match-list">
              {homeMatches.map((m, i) => (
                <NextHomeMatchCard key={i} game={m.game} league={m.league} teamName={m.teamName} teamShortName={m.teamShortName} />
              ))}
            </div>
          </div>
        )
      })()}


      {/* News section */}
      {(() => {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const todayNews = (news || []).filter(n => {
          if (!n.pubDate) return false
          const d = new Date(n.pubDate)
          d.setHours(0, 0, 0, 0)
          return d.getTime() === today.getTime()
        })
        if (!todayNews.length) return null
        return (
          <div className="home-section">
            <div className="home-section-heading">
              <div className="home-section-title">Päivän uutiset</div>
              <div className="home-section-meta">Yle Turku</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {todayNews.map((item, i) => (
                <a key={i} href={item.url} target="_blank" rel="noopener noreferrer" className="news-card">
                  <div className="news-title">{item.title}</div>
                  {item.pubDate && (
                    <div className="news-sub">{formatRelativeTime(item.pubDate)}</div>
                  )}
                </a>
              ))}
            </div>
          </div>
        )
      })()}
    </div>
  )
}
