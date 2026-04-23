import { useState, useEffect } from 'react'
import { fetchWithTimeout } from '../utils/fetch'
import { PageHeader } from './PageHeader'
import './PageHome.css'

// --- API URLs ---

const TURKU_LAT = 60.4518
const TURKU_LON = 22.2666

const WEATHER_URL = `https://api.open-meteo.com/v1/forecast?latitude=${TURKU_LAT}&longitude=${TURKU_LON}&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m&hourly=temperature_2m,weather_code,precipitation_probability&daily=sunrise,sunset&wind_speed_unit=ms&timezone=Europe/Helsinki&forecast_days=2`

const AIR_QUALITY_URL = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${TURKU_LAT}&longitude=${TURKU_LON}&current=uv_index&hourly=birch_pollen,grass_pollen,alder_pollen&timezone=Europe/Helsinki&forecast_days=1`

const TPS_ICS = 'https://hc.tps.fi/fi-fi/?action=getContent&type=exportcalendar&format=ics&levelId=64&season=2026'
const TPS_ICS_URL = `/.netlify/functions/proxy?url=${encodeURIComponent(TPS_ICS)}`

const YLE_RSS = 'https://yle.fi/rss/t/18-198259/fi'
const YLE_RSS_URL = `/.netlify/functions/proxy?url=${encodeURIComponent(YLE_RSS)}`

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
  const sunriseTime = new Date(sunrise)
  const sunsetTime = new Date(sunset)
  const durationMs = sunsetTime - sunriseTime
  const hours = Math.floor(durationMs / (1000 * 60 * 60))
  const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60))
  return { hours, minutes }
}

function getDaylightRemaining(sunset) {
  const diffMs = new Date(sunset) - new Date()
  if (diffMs <= 0) return null
  return {
    hours: Math.floor(diffMs / (1000 * 60 * 60)),
    minutes: Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60)),
  }
}

function getSunProgress(sunrise, sunset) {
  const now = new Date()
  const sunriseTime = new Date(sunrise)
  const sunsetTime = new Date(sunset)

  if (now < sunriseTime) return 0
  if (now > sunsetTime) return 1

  const totalDaylight = sunsetTime - sunriseTime
  const elapsed = now - sunriseTime
  return elapsed / totalDaylight
}

function formatTimeStr(isoString) {
  return new Date(isoString).toLocaleTimeString('fi-FI', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

function getTodaySubtitle() {
  const weekdays = ['Su', 'Ma', 'Ti', 'Ke', 'To', 'Pe', 'La']
  const now = new Date()
  const day = weekdays[now.getDay()]
  const d = now.getDate()
  const m = now.getMonth() + 1
  return `${day} ${d}.${m}. · Turku`
}

// --- SunArc component (V3 construction) ---

function SunArc({ sunrise, sunset }) {
  const progress = getSunProgress(sunrise, sunset)
  const width = 300
  const height = 110
  const pad = 20
  const ay = height - 20
  const cx = width / 2
  const cy = 10

  // Quadratic bezier: start=(pad, ay), control=(cx, cy), end=(width-pad, ay)
  const sx = pad
  const ex = width - pad

  // Sun position on arc
  const t = progress
  const sunX = (1 - t) * (1 - t) * sx + 2 * (1 - t) * t * cx + t * t * ex
  const sunY = (1 - t) * (1 - t) * ay + 2 * (1 - t) * t * cy + t * t * ay

  const arcPath = `M ${sx} ${ay} Q ${cx} ${cy} ${ex} ${ay}`

  // Approximate arc length for stroke-dasharray (slightly longer than chord)
  const arcLen = 320

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      style={{ display: 'block' }}
      aria-hidden="true"
    >
      {/* Full dashed arc (future part) */}
      <path
        d={arcPath}
        fill="none"
        stroke="var(--text-muted)"
        strokeWidth="2"
        strokeDasharray="4 4"
        opacity="0.4"
      />

      {/* Solid orange arc (elapsed part) */}
      {progress > 0 && (
        <path
          d={arcPath}
          fill="none"
          stroke="var(--accent-orange)"
          strokeWidth="2"
          strokeDasharray={`${progress * arcLen} ${arcLen}`}
        />
      )}

      {/* Sunrise dot */}
      <circle cx={sx} cy={ay} r="4" fill="var(--accent-orange)" />

      {/* Sunset dot */}
      <circle cx={ex} cy={ay} r="4" fill="var(--text-muted)" opacity="0.6" />

      {/* Current sun position label + circle */}
      {progress > 0 && progress < 1 && (
        <>
          <text
            x={sunX}
            y={sunY - 14}
            textAnchor="middle"
            fill="var(--text-muted)"
            fontSize="10"
            fontWeight="600"
            letterSpacing="0.4"
          >
            nyt
          </text>
          <circle cx={sunX} cy={sunY} r="8" fill="var(--accent-orange)" />
        </>
      )}
    </svg>
  )
}

// --- HourlyStrip component ---

function HourlyStrip({ forecast }) {
  return (
    <div className="hourly-strip">
      {forecast.map((h) => {
        const showPrecip = h.precip > 20
        return (
          <div key={h.hour} className="hourly-cell">
            <span className="hourly-hour">{h.hour}:00</span>
            <span className="hourly-emoji">{getWeather(h.weatherCode).icon}</span>
            <span className="hourly-temp">{h.temp}°</span>
            <span className={showPrecip ? 'hourly-precip hourly-precip-rain' : 'hourly-precip hourly-precip-none'}>
              {h.precip > 0 ? `${h.precip}%` : '—'}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// --- AirQualityPanel component ---

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
          <div
            key={i}
            className="uv-segment"
            style={{ flex: segWidth, background: 'var(--border)' }}
          >
            <div
              className="uv-segment-fill"
              style={{ background: seg.color, transform: `scaleX(${fillRatio})`, transformOrigin: 'left' }}
            />
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
      {/* UV card */}
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

      {/* Pollen card */}
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
      })
    }
  }

  return forecast
}

function getDailyMaxPollen(hourlyData) {
  if (!hourlyData) return { birch: 0, grass: 0, alder: 0 }

  const birch = hourlyData.birch_pollen ? Math.max(...hourlyData.birch_pollen) : 0
  const grass = hourlyData.grass_pollen ? Math.max(...hourlyData.grass_pollen) : 0
  const alder = hourlyData.alder_pollen ? Math.max(...hourlyData.alder_pollen) : 0

  return { birch, grass, alder }
}

function parseNewsWithDates(xmlText) {
  const parser = new DOMParser()
  const xml = parser.parseFromString(xmlText, 'text/xml')
  const items = xml.querySelectorAll('item')

  return Array.from(items).slice(0, 6).map(item => {
    const pubDateStr = item.querySelector('pubDate')?.textContent || ''
    const pubDate = pubDateStr ? new Date(pubDateStr) : null
    return {
      title: item.querySelector('title')?.textContent || '',
      url: item.querySelector('link')?.textContent || '',
      pubDate,
    }
  })
}

function parseTPSNextGame(icsText) {
  const lines = icsText.split('\n')
  let event = null
  let nextGame = null
  const now = new Date()

  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed === 'BEGIN:VEVENT') {
      event = {}
    } else if (trimmed === 'END:VEVENT' && event) {
      if (event.start && event.summary && event.start > now) {
        if (!nextGame || event.start < nextGame.start) {
          nextGame = event
        }
      }
      event = null
    } else if (event) {
      if (trimmed.startsWith('DTSTART:')) {
        const dateStr = trimmed.slice(8)
        const year = parseInt(dateStr.slice(0, 4))
        const month = parseInt(dateStr.slice(4, 6))
        const day = parseInt(dateStr.slice(6, 8))
        const hour = parseInt(dateStr.slice(9, 11))
        const min = parseInt(dateStr.slice(11, 13))
        event.start = new Date(Date.UTC(year, month - 1, day, hour, min))
      } else if (trimmed.startsWith('SUMMARY:')) {
        event.summary = trimmed.slice(8)
      } else if (trimmed.startsWith('LOCATION:')) {
        event.location = trimmed.slice(9)
      }
    }
  }

  return nextGame || null
}

function formatRelativeTime(date) {
  if (!date) return ''
  const diffMs = Date.now() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 60) return `${diffMin} min sitten`
  const diffH = Math.floor(diffMin / 60)
  return `${diffH} t sitten`
}

// --- Feed assembly ---

function buildFeedItems(weather, airQuality, news, tpsGame, busData) {
  const items = []
  const now = new Date()
  const todayStr = now.toDateString()

  // UV alert
  const uv = airQuality?.current?.uv_index
  if (uv != null && uv >= 6) {
    const level = getUvLevel(uv)
    items.push({
      kind: 'uv',
      time: '13:00',
      sortTime: 780,
      i: '☀️',
      tag: 'UV-varoitus',
      title: `UV-indeksi ${Math.round(uv)} · ${level.text}`,
      sub: 'Käytä aurinkovoidetta ja päähinettä klo 11–15',
      accent: level.color,
    })
  }

  // Pollen alerts (species with runsaasti, i.e. >= 100)
  const dailyPollen = getDailyMaxPollen(airQuality?.hourly)
  const pollenAlerts = [
    { genitiveSpecies: 'Koivun', value: dailyPollen.birch },
    { genitiveSpecies: 'Heinän', value: dailyPollen.grass },
    { genitiveSpecies: 'Lepän',  value: dailyPollen.alder },
  ].filter(p => p.value >= 100)

  for (const p of pollenAlerts) {
    items.push({
      kind: 'pollen',
      time: '14:00',
      sortTime: 840,
      i: '🌾',
      tag: 'Siitepöly',
      title: `${p.genitiveSpecies} siitepölyä runsaasti`,
      sub: 'Oireet pahimmillaan iltapäivällä',
      accent: 'var(--accent-red)',
    })
  }

  // Bus departures (one per saved stop, sorted by soonest)
  if (busData && busData.length > 0) {
    const sorted = [...busData].sort((a, b) => a.departure.mins - b.departure.mins)
    sorted.forEach(({ stopName, departure: dep }) => {
      items.push({
        kind: 'bus',
        time: dep.time,
        sortTime: dep.sortMinutes,
        i: '🚌',
        tag: 'Föli',
        title: `Linja ${dep.line} → ${dep.dest}`,
        sub: `${stopName} · ${dep.mins} min`,
        accent: dep.mins <= 5 ? 'var(--accent-green)' : undefined,
        go: 'bus',
      })
    })
  }

  // News (up to 3)
  if (news) {
    const latest = news[0]
    if (latest) {
      const d = latest.pubDate
      const timeStr = d
        ? `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
        : ''
      items.push({
        kind: 'news',
        time: timeStr,
        sortTime: 99997,
        i: '📰',
        tag: 'Yle Turku',
        title: latest.title,
        sub: d ? formatRelativeTime(d) : '',
        go: 'news',
      })
    }
  }

  // TPS next game
  if (tpsGame) {
    const gameDate = tpsGame.start
    const isToday = gameDate.toDateString() === todayStr
    const hours = String(gameDate.getHours()).padStart(2, '0')
    const mins = String(gameDate.getMinutes()).padStart(2, '0')
    const timeHHMM = `${hours}:${mins}`

    let timeDisplay
    let sortTime
    if (isToday) {
      timeDisplay = timeHHMM
      sortTime = gameDate.getHours() * 60 + gameDate.getMinutes()
    } else {
      const weekdays = ['Su', 'Ma', 'Ti', 'Ke', 'To', 'Pe', 'La']
      const wd = weekdays[gameDate.getDay()]
      timeDisplay = `${wd} ${timeHHMM}`
      sortTime = 99999
    }

    // Parse match label
    const summary = tpsGame.summary || ''
    const parts = summary.split('-')
    let matchLabel = summary
    if (parts.length >= 2) {
      const home = parts[0].trim()
      const away = parts.slice(1).join('-').trim()
      if (home === 'TPS') {
        matchLabel = `TPS – ${away}`
      } else {
        matchLabel = `${home} – TPS`
      }
    }

    items.push({
      kind: 'tps',
      time: timeDisplay,
      sortTime,
      i: '🏒',
      tag: 'HC TPS',
      title: matchLabel,
      sub: tpsGame.location || 'Veritas Areena',
      accent: 'var(--accent-yellow)',
      go: 'tps',
    })
  }

  // Sort by sortTime ascending
  items.sort((a, b) => a.sortTime - b.sortTime)

  return items
}

// --- FeedItem component ---

function FeedItem({ item, onNavigate }) {
  const dotColor = item.accent || 'var(--text-muted)'
  const borderLeft = item.accent ? `3px solid ${item.accent}` : undefined

  function handleActivate() {
    if (item.go) onNavigate(item.go)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleActivate()
    }
  }

  return (
    <div className="feed-item">
      <div className="feed-item-time">{item.time}</div>
      <div className="feed-item-dot" style={{ background: dotColor }} />
      <div
        className={`feed-item-content${item.go ? ' navigable' : ''}`}
        style={{ borderLeft }}
        role={item.go ? 'button' : undefined}
        tabIndex={item.go ? 0 : undefined}
        aria-label={item.go ? item.title : undefined}
        onClick={item.go ? handleActivate : undefined}
        onKeyDown={item.go ? handleKeyDown : undefined}
      >
        <div className="feed-meta">{item.i} {item.tag}</div>
        <div className="feed-title">{item.title}</div>
        {item.sub && <div className="feed-sub">{item.sub}</div>}
      </div>
    </div>
  )
}

// --- Data fetching ---

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
      trip {
        route {
          shortName
        }
      }
    }
  }
}
`

async function fetchBus() {
  try {
    const saved = localStorage.getItem('busStops')
    if (!saved) return null
    const stops = JSON.parse(saved)
    if (!stops || stops.length === 0) return null

    const apiKey = import.meta.env.VITE_DIGITRANSIT_API_KEY || ''
    const now = Date.now()

    const results = await Promise.all(stops.map(async stopId => {
      try {
        const res = await fetchWithTimeout(DIGITRANSIT_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'digitransit-subscription-key': apiKey,
          },
          body: JSON.stringify({ query: BUS_QUERY, variables: { stopId, numberOfDepartures: 5 } }),
        })
        const json = await res.json()
        if (!json.data?.stop) return null

        const stop = json.data.stop
        const nextDep = stop.stoptimesWithoutPatterns
          .map(dep => {
            const depSeconds = dep.realtime ? dep.realtimeDeparture : dep.scheduledDeparture
            const departureMs = (dep.serviceDay + depSeconds) * 1000
            const mins = Math.floor((departureMs - now) / 60000)
            const depDate = new Date(departureMs)
            const time = `${String(depDate.getHours()).padStart(2, '0')}:${String(depDate.getMinutes()).padStart(2, '0')}`
            return { line: dep.trip.route.shortName, dest: dep.headsign, mins, time, sortMinutes: depDate.getHours() * 60 + depDate.getMinutes() }
          })
          .find(d => d.mins >= 0)

        if (!nextDep) return null
        const customNames = JSON.parse(localStorage.getItem('busStopNames') || '{}')
        const stopName = customNames[stopId] || stop.name
        return { stopName, departure: nextDep }
      } catch {
        return null
      }
    }))

    const valid = results.filter(Boolean)
    return valid.length > 0 ? valid : null
  } catch {
    return null
  }
}

// --- PageHome component ---

export default function PageHome({ onNavigate }) {
  const [weather, setWeather] = useState(null)
  const [airQuality, setAirQuality] = useState(null)
  const [news, setNews] = useState(null)
  const [tpsGame, setTpsGame] = useState(null)
  const [busData, setBusData] = useState(null)
  const [weatherExpanded, setWeatherExpanded] = useState(false)

  async function doFetchWeather() {
    try {
      const [weatherRes, airRes] = await Promise.all([
        fetchWithTimeout(WEATHER_URL),
        fetchWithTimeout(AIR_QUALITY_URL),
      ])
      if (weatherRes.ok) {
        setWeather(await weatherRes.json())
      }
      if (airRes.ok) {
        setAirQuality(await airRes.json())
      }
    } catch {
      // silent failure - show what we have
    }
  }

  async function doFetchNews() {
    try {
      const res = await fetchWithTimeout(YLE_RSS_URL)
      if (!res.ok) return
      const text = await res.text()
      setNews(parseNewsWithDates(text))
    } catch {
      // silent failure
    }
  }

  async function doFetchTPS() {
    try {
      const res = await fetchWithTimeout(TPS_ICS_URL)
      if (!res.ok) return
      const text = await res.text()
      setTpsGame(parseTPSNextGame(text))
    } catch {
      // silent failure
    }
  }

  async function doFetchBus() {
    const data = await fetchBus()
    setBusData(data)
  }

  useEffect(() => {
    doFetchWeather()
    doFetchNews()
    doFetchTPS()
    doFetchBus()
  }, [])

  // Derived weather data
  const current = weather?.current
  const weatherInfo = current ? getWeather(current.weather_code) : null
  const sunrise = weather?.daily?.sunrise?.[0]
  const sunset = weather?.daily?.sunset?.[0]
  const hourlyForecast = weather ? getHourlyForecast(weather.hourly) : []
  const dailyPollen = getDailyMaxPollen(airQuality?.hourly)
  const uv = airQuality?.current?.uv_index

  // Sun strip state
  const sunProgress = sunrise && sunset ? getSunProgress(sunrise, sunset) : null
  const daylight = sunrise && sunset ? getDaylightDuration(sunrise, sunset) : null

  function getSunStripLabel() {
    if (sunProgress === null) return null
    if (sunProgress === 0) return 'NOUSI'
    if (sunProgress >= 1) return 'PÄIVÄNVALOA'
    return 'LASKEE'
  }

  const feedItems = buildFeedItems(weather, airQuality, news, tpsGame, busData)

  return (
    <div className="page-home">
      <PageHeader title="Tänään" subtitle={getTodaySubtitle()} />

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
              <span className="weather-emoji" aria-hidden="true">{weatherInfo.icon}</span>
              <div style={{ flex: 1 }}>
                <div className="weather-temp">{Math.round(current.temperature_2m)}°</div>
                <div className="weather-condition">
                  {current.apparent_temperature != null
                    ? `${weatherInfo.text} · tuntuu ${Math.round(current.apparent_temperature)}°`
                    : weatherInfo.text}
                </div>
              </div>
              <svg aria-hidden="true" width="12" height="8" viewBox="0 0 12 8" className="weather-chevron" style={{ transform: weatherExpanded ? 'rotate(180deg)' : 'rotate(0)' }}>
                <path d="M1 1l5 5 5-5" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          ) : (
            <div className="weather-current">
              <div className="skeleton-row" style={{ width: 40, height: 40, borderRadius: 8 }} />
              <div>
                <div className="skeleton-row" style={{ width: 60, height: 28, borderRadius: 6 }} />
                <div className="skeleton-row" style={{ width: 100, height: 16, borderRadius: 4, marginTop: 6 }} />
              </div>
            </div>
          )}
        </div>

        {/* Sun arc + strip */}
        {sunrise && sunset && (
          <>
            <SunArc sunrise={sunrise} sunset={sunset} />
            <div className="weather-sun-strip">
              <div className="sun-cell">
                <div className="sun-label">NOUSI</div>
                <div className="sun-value">{formatTimeStr(sunrise)}</div>
              </div>
              <div className="sun-cell sun-cell-center">
                {(() => {
                  const remaining = sunset ? getDaylightRemaining(sunset) : null
                  return remaining
                    ? <>
                        <div className="sun-label">JÄLJELLÄ</div>
                        <div className="sun-value">{remaining.hours}t {remaining.minutes}min</div>
                      </>
                    : <>
                        <div className="sun-label">PÄIVÄNVALOA</div>
                        <div className="sun-value">{daylight ? `${daylight.hours}t ${daylight.minutes}min` : '—'}</div>
                      </>
                })()}
              </div>
              <div className="sun-cell sun-cell-right">
                <div className="sun-label">LASKEE</div>
                <div className="sun-value sun-value-orange">{formatTimeStr(sunset)}</div>
              </div>
            </div>
          </>
        )}

        {/* Expanded section */}
        {weatherExpanded && (
          <div className="weather-expanded">
            {hourlyForecast.length > 0 && (
              <>
                <div className="section-label">LOPPUPÄIVÄN ENNUSTE</div>
                <HourlyStrip forecast={hourlyForecast} />
              </>
            )}

            <div className="air-quality-section">
              <div className="section-label">ILMANLAATU TÄNÄÄN</div>
              <AirQualityPanel
                uv={uv}
                pollen={dailyPollen}
              />
            </div>
          </div>
        )}
      </div>

      {/* Timeline feed */}
      <div className="timeline">
        <div className="timeline-rule" />
        {feedItems.map((item, idx) => (
          <FeedItem key={idx} item={item} onNavigate={onNavigate} />
        ))}
      </div>
    </div>
  )
}
