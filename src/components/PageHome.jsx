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

function getGreeting() {
  const h = new Date().getHours()
  if (h < 5) return 'Hyvää yötä'
  if (h < 10) return 'Hyvää huomenta'
  if (h < 17) return 'Hyvää päivää'
  if (h < 22) return 'Hyvää iltaa'
  return 'Hyvää yötä'
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
  return Array.from(xml.querySelectorAll('item')).slice(0, 6).map(item => {
    const pubDateStr = item.querySelector('pubDate')?.textContent || ''
    return {
      title: item.querySelector('title')?.textContent || '',
      url: item.querySelector('link')?.textContent || '',
      pubDate: pubDateStr ? new Date(pubDateStr) : null,
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
        if (!nextGame || event.start < nextGame.start) nextGame = event
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
  return nextGame || null
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

async function fetchBus() {
  try {
    const saved = localStorage.getItem('busStops')
    if (!saved) return null
    const stops = JSON.parse(saved)
    if (!stops?.length) return null

    const apiKey = import.meta.env.VITE_DIGITRANSIT_API_KEY || ''
    const customNames = JSON.parse(localStorage.getItem('busStopNames') || '{}')
    const now = Date.now()

    const results = await Promise.all(stops.map(async stopId => {
      try {
        const res = await fetchWithTimeout(DIGITRANSIT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'digitransit-subscription-key': apiKey },
          body: JSON.stringify({ query: BUS_QUERY, variables: { stopId, numberOfDepartures: 5 } }),
        })
        const json = await res.json()
        if (!json.data?.stop) return []
        const stop = json.data.stop
        const stopName = customNames[stopId] || stop.name
        return stop.stoptimesWithoutPatterns
          .map(dep => {
            const depSeconds = dep.realtime ? dep.realtimeDeparture : dep.scheduledDeparture
            const depMs = (dep.serviceDay + depSeconds) * 1000
            const mins = Math.floor((depMs - now) / 60000)
            const depDate = new Date(depMs)
            const time = `${String(depDate.getHours()).padStart(2, '0')}:${String(depDate.getMinutes()).padStart(2, '0')}`
            return { stopName, line: dep.trip.route.shortName, dest: dep.headsign, mins, time, depMs }
          })
          .filter(d => d.mins >= 0)
      } catch {
        return []
      }
    }))

    const departures = results.flat().sort((a, b) => a.depMs - b.depMs).slice(0, 6)
    if (!departures.length) return null

    const stopNames = stops.map(id => customNames[id] || null).filter(Boolean)
    return { departures, stopNames }
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
  const [weatherExpanded, setWeatherExpanded] = useState(false)

  async function doFetchWeather() {
    try {
      const [weatherRes, airRes] = await Promise.all([
        fetchWithTimeout(WEATHER_URL),
        fetchWithTimeout(AIR_QUALITY_URL),
      ])
      if (weatherRes.ok) setWeather(await weatherRes.json())
      if (airRes.ok) setAirQuality(await airRes.json())
    } catch { /* silent */ }
  }

  async function doFetchNews() {
    try {
      const res = await fetchWithTimeout(YLE_RSS_URL)
      if (res.ok) setNews(parseNewsWithDates(await res.text()))
    } catch { /* silent */ }
  }

  async function doFetchTPS() {
    try {
      const res = await fetchWithTimeout(TPS_ICS_URL)
      if (res.ok) setTpsGame(parseTPSNextGame(await res.text()))
    } catch { /* silent */ }
  }

  useEffect(() => {
    doFetchWeather()
    doFetchNews()
    doFetchTPS()
  }, [])

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

  const datetime = getCurrentDatetime()

  return (
    <div className="page-home">
      <PageHeader
        title={getGreeting()}
        subtitle={daylightSubtitle}
        datetime={datetime}
      />

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
              <div className="skeleton-row" style={{ width: 48, height: 48, borderRadius: '50%' }} />
              <div>
                <div className="skeleton-row" style={{ width: 60, height: 28, borderRadius: 6 }} />
                <div className="skeleton-row" style={{ width: 100, height: 16, borderRadius: 4, marginTop: 6 }} />
              </div>
            </div>
          )}
        </div>

        {sunrise && sunset && (
          <>
            <SunArc sunrise={sunrise} sunset={sunset} />
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
          </>
        )}

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
              <AirQualityPanel uv={uv} pollen={dailyPollen} />
            </div>
          </div>
        )}
      </div>

      {/* TPS card */}
      {tpsGame && (() => {
        const { vsText, isHome } = formatTpsGame(tpsGame.summary || '')
        const gameDate = tpsGame.start
        const weekdays = ['su', 'ma', 'ti', 'ke', 'to', 'pe', 'la']
        const wd = weekdays[gameDate.getDay()]
        const h = String(gameDate.getHours()).padStart(2, '0')
        const m = String(gameDate.getMinutes()).padStart(2, '0')
        const isToday = gameDate.toDateString() === new Date().toDateString()
        return (
          <div className="tps-card">
            <div className="tps-left">
              <div className="tps-meta-row">
                <span className="tps-dot" />
                <span className="tps-meta">TPS · {isHome ? 'KOTIOTTELLU' : 'VIERASOTTELU'}</span>
              </div>
              <div className="tps-matchup">{vsText}</div>
            </div>
            <div className="tps-right">
              <div className="tps-weekday">{isToday ? 'tänään' : wd}</div>
              <div className="tps-time">{h}:{m}</div>
            </div>
          </div>
        )
      })()}


      {/* News section */}
      {news?.[0] && (
        <div className="home-section">
          <div className="home-section-heading">
            <div className="home-section-title">Päivän uutiset</div>
            <div className="home-section-meta">Yle Turku</div>
          </div>
          <div className="news-card">
            <div className="news-title">{news[0].title}</div>
            {news[0].pubDate && (
              <div className="news-sub">{formatRelativeTime(news[0].pubDate)}</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
