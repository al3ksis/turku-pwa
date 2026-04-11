import { useState, useEffect } from 'react'
import { fetchWithTimeout } from '../utils/fetch'
import './WeatherWidget.css'

const TURKU_LAT = 60.4518
const TURKU_LON = 22.2666

const WEATHER_URL = `https://api.open-meteo.com/v1/forecast?latitude=${TURKU_LAT}&longitude=${TURKU_LON}&current=temperature_2m,weather_code,wind_speed_10m&hourly=temperature_2m,weather_code,precipitation_probability&daily=sunrise,sunset&wind_speed_unit=ms&timezone=Europe/Helsinki&forecast_days=2`

const AIR_QUALITY_URL = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${TURKU_LAT}&longitude=${TURKU_LON}&current=uv_index&hourly=birch_pollen,grass_pollen,alder_pollen&timezone=Europe/Helsinki&forecast_days=1`

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

function getWeather(code) {
  return weatherCodes[code] || { icon: '❓', text: 'Tuntematon' }
}

function getUvLevel(uv) {
  if (uv < 3) return { text: 'Matala', color: 'var(--accent-green)' }
  if (uv < 6) return { text: 'Kohtalainen', color: 'var(--accent-yellow)' }
  if (uv < 8) return { text: 'Korkea', color: 'var(--accent-orange)' }
  return { text: 'Erittäin korkea', color: 'var(--error)' }
}

// CAMS/EAACI thresholds (grains/m³):
// Birch/Alder: ≥10 = season start (moderate), ≥100 = peak (high)
// Grass: ≥10 = moderate, ~50 = symptoms for most
// Show lower values too for sensitive individuals
function getPollenLevel(value) {
  if (!value || value < 0.5) return null
  if (value < 10) return { text: 'vähän', color: 'var(--accent-yellow)' }
  if (value < 100) return { text: 'kohtalaisesti', color: 'var(--accent-orange)' }
  return { text: 'runsaasti', color: 'var(--error)' }
}

function getDailyMaxPollen(hourlyData) {
  if (!hourlyData) return { birch: 0, grass: 0, alder: 0 }

  const birch = hourlyData.birch_pollen ? Math.max(...hourlyData.birch_pollen) : 0
  const grass = hourlyData.grass_pollen ? Math.max(...hourlyData.grass_pollen) : 0
  const alder = hourlyData.alder_pollen ? Math.max(...hourlyData.alder_pollen) : 0

  return { birch, grass, alder }
}

function formatTime(isoString) {
  return new Date(isoString).toLocaleTimeString('fi-FI', {
    hour: '2-digit',
    minute: '2-digit'
  })
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

function getDaylightDuration(sunrise, sunset) {
  const sunriseTime = new Date(sunrise)
  const sunsetTime = new Date(sunset)
  const durationMs = sunsetTime - sunriseTime
  const hours = Math.floor(durationMs / (1000 * 60 * 60))
  const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60))
  return { hours, minutes }
}

function getTimeUntilSunEvent(sunrise, sunset, tomorrowSunrise) {
  const now = new Date()
  const sunriseTime = new Date(sunrise)
  const sunsetTime = new Date(sunset)

  let targetTime, event
  if (now < sunriseTime) {
    targetTime = sunriseTime
    event = 'sunrise'
  } else if (now < sunsetTime) {
    targetTime = sunsetTime
    event = 'sunset'
  } else if (tomorrowSunrise) {
    targetTime = new Date(tomorrowSunrise)
    event = 'sunrise'
  } else {
    return null
  }

  const diffMs = targetTime - now
  const hours = Math.floor(diffMs / (1000 * 60 * 60))
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
  return { event, hours, minutes }
}

function SunArc({ sunrise, sunset }) {
  const progress = getSunProgress(sunrise, sunset)
  const sunriseFormatted = formatTime(sunrise)
  const sunsetFormatted = formatTime(sunset)

  // Arc dimensions
  const width = 280
  const height = 100
  const padding = 30
  const arcStartX = padding
  const arcEndX = width - padding
  const arcY = height - 20
  const arcPeakY = 20

  // Calculate sun position on the arc (quadratic bezier)
  const t = progress
  const controlX = width / 2
  const controlY = arcPeakY - 20

  const sunX = (1 - t) * (1 - t) * arcStartX + 2 * (1 - t) * t * controlX + t * t * arcEndX
  const sunY = (1 - t) * (1 - t) * arcY + 2 * (1 - t) * t * controlY + t * t * arcY

  // Create arc path
  const arcPath = `M ${arcStartX} ${arcY} Q ${controlX} ${controlY} ${arcEndX} ${arcY}`

  // Split point for coloring (approximate)
  const splitX = sunX

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="sun-arc-svg">
      {/* Dashed gray line (future/after sunset part) */}
      <path
        d={arcPath}
        fill="none"
        stroke="var(--text-muted)"
        strokeWidth="2"
        strokeDasharray="4 4"
        opacity="0.5"
      />

      {/* Solid orange line (past/daylight part) */}
      {progress > 0 && (
        <path
          d={arcPath}
          fill="none"
          stroke="var(--accent-orange)"
          strokeWidth="2"
          strokeDasharray={`${progress * 250} 1000`}
        />
      )}

      {/* Sunrise dot */}
      <circle cx={arcStartX} cy={arcY} r="4" fill="var(--accent-orange)" />
      <text x={arcStartX} y={arcY + 14} textAnchor="middle" className="sun-arc-time">
        {sunriseFormatted}
      </text>

      {/* Sunset dot */}
      <circle cx={arcEndX} cy={arcY} r="4" fill="var(--text-muted)" />
      <text x={arcEndX} y={arcY + 14} textAnchor="middle" className="sun-arc-time">
        {sunsetFormatted}
      </text>

      {/* Current sun position */}
      {progress > 0 && progress < 1 && (
        <>
          <text x={sunX} y={sunY - 18} textAnchor="middle" className="sun-arc-now">
            nyt
          </text>
          <circle cx={sunX} cy={sunY} r="10" fill="var(--accent-orange)" />
        </>
      )}
    </svg>
  )
}

function getHourlyForecast(hourlyData) {
  if (!hourlyData) return []

  const now = new Date()
  const today = now.toDateString()

  const forecast = []
  for (let i = 0; i < hourlyData.time.length; i++) {
    const time = new Date(hourlyData.time[i])

    // Only show from current time to end of today
    if (time >= now && time.toDateString() === today) {
      forecast.push({
        hour: time.getHours(),
        temp: Math.round(hourlyData.temperature_2m[i]),
        weatherCode: hourlyData.weather_code[i],
        precipitation: hourlyData.precipitation_probability[i]
      })
    }
  }
  return forecast
}

export default function WeatherWidget() {
  const [weather, setWeather] = useState(null)
  const [airQuality, setAirQuality] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showHourly, setShowHourly] = useState(false)

  async function fetchData() {
    try {
      setError(null)
      const [weatherRes, airRes] = await Promise.all([
        fetchWithTimeout(WEATHER_URL),
        fetchWithTimeout(AIR_QUALITY_URL)
      ])

      if (!weatherRes.ok) throw new Error('Sään haku epäonnistui')

      const weatherData = await weatherRes.json()
      setWeather(weatherData)

      if (airRes.ok) {
        const airData = await airRes.json()
        setAirQuality(airData)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        fetchData()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  if (loading) {
    return (
      <div className="weather-widget card">
        <div className="weather-loading">
          <div className="skeleton-circle" />
          <div className="skeleton-text" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="weather-widget card">
        <div className="weather-error">
          <p>{error}</p>
          <button className="btn-primary" onClick={fetchData}>Yritä uudelleen</button>
        </div>
      </div>
    )
  }

  const current = weather.current
  const weatherInfo = getWeather(current.weather_code)
  const hourlyForecast = getHourlyForecast(weather.hourly)
  const sunrise = weather.daily?.sunrise?.[0]
  const sunset = weather.daily?.sunset?.[0]
  const tomorrowSunrise = weather.daily?.sunrise?.[1]

  const uv = airQuality?.current?.uv_index
  const uvLevel = uv != null ? getUvLevel(uv) : null

  // Check pollen levels (daily max values for better accuracy)
  const dailyPollen = getDailyMaxPollen(airQuality?.hourly)
  const pollenData = [
    { name: 'Koivu', level: getPollenLevel(dailyPollen.birch) },
    { name: 'Heinä', level: getPollenLevel(dailyPollen.grass) },
    { name: 'Leppä', level: getPollenLevel(dailyPollen.alder) }
  ].filter(p => p.level !== null)

  return (
    <div className="weather-widget card">
      <div
        className="weather-current clickable"
        onClick={() => setShowHourly(!showHourly)}
      >
        <span className="weather-icon">{weatherInfo.icon}</span>
        <div className="weather-info">
          <span className="temp">{Math.round(current.temperature_2m)}°</span>
          <span className="condition">{weatherInfo.text}</span>
        </div>
        <div className="weather-right">
          <div className="wind">
            <span className="wind-icon">💨</span>
            <span>{Math.round(current.wind_speed_10m)} m/s</span>
          </div>
          <span className={`expand-icon ${showHourly ? 'expanded' : ''}`}>▼</span>
        </div>
      </div>

      {sunrise && sunset && (() => {
        const daylight = getDaylightDuration(sunrise, sunset)
        const sunEvent = getTimeUntilSunEvent(sunrise, sunset, tomorrowSunrise)
        return (
          <div className="sun-section">
            <SunArc sunrise={sunrise} sunset={sunset} />

            <div className="sun-info-row">
              <div className="sun-info-item">
                <span className="sun-info-label">aurinko nousee</span>
                <span className="sun-info-time sunrise">{formatTime(sunrise)}</span>
              </div>
              <div className="sun-info-daylight">
                <span>päivänvaloa</span>
                <span className="daylight-duration">
                  {daylight.hours}t {daylight.minutes}min
                </span>
              </div>
              <div className="sun-info-item">
                <span className="sun-info-label">aurinko laskee</span>
                <span className="sun-info-time">{formatTime(sunset)}</span>
              </div>
            </div>

            {sunEvent && (
              <div className="sun-status-pill">
                <span className="sun-status-dot"></span>
                <span>
                  {sunEvent.event === 'sunrise' ? 'aurinko nousee' : 'aurinko laskee'}{' '}
                  {sunEvent.hours}t {sunEvent.minutes}min päästä
                </span>
              </div>
            )}
          </div>
        )
      })()}

      {showHourly && hourlyForecast.length > 0 && (
        <div className="hourly-forecast">
          <div className="hourly-scroll">
            {hourlyForecast.map((h) => (
              <div key={h.hour} className="hourly-item">
                <span className="hourly-time">{h.hour}:00</span>
                <span className="hourly-icon">{getWeather(h.weatherCode).icon}</span>
                <span className="hourly-temp">{h.temp}°</span>
                {h.precipitation > 0 && (
                  <span className="hourly-precip">{h.precipitation}%</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="weather-extra">
        {uvLevel && (
          <div className="extra-item">
            <span className="extra-label">UV</span>
            <span className="extra-value" style={{ color: uvLevel.color }}>
              {Math.round(uv)} - {uvLevel.text}
            </span>
          </div>
        )}
        {pollenData.length > 0 ? (
          <div className="extra-item">
            <span className="extra-label">Siitepöly</span>
            <span className="extra-value pollen-list">
              {pollenData.map((p, i) => (
                <span key={p.name}>
                  {p.name}: <span style={{ color: p.level.color }}>{p.level.text}</span>
                  {i < pollenData.length - 1 && ', '}
                </span>
              ))}
            </span>
          </div>
        ) : (
          <div className="extra-item">
            <span className="extra-label">Siitepöly</span>
            <span className="extra-value muted">Ei merkittävää</span>
          </div>
        )}
      </div>
    </div>
  )
}
