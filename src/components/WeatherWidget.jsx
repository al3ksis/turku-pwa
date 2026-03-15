import { useState, useEffect } from 'react'
import './WeatherWidget.css'

const TURKU_LAT = 60.4518
const TURKU_LON = 22.2666

const WEATHER_URL = `https://api.open-meteo.com/v1/forecast?latitude=${TURKU_LAT}&longitude=${TURKU_LON}&current=temperature_2m,weather_code,wind_speed_10m&timezone=Europe/Helsinki`

const AIR_QUALITY_URL = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${TURKU_LAT}&longitude=${TURKU_LON}&current=uv_index,birch_pollen,grass_pollen,alder_pollen&timezone=Europe/Helsinki`

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
  if (uv < 6) return { text: 'Kohtalainen', color: '#ffcc00' }
  if (uv < 8) return { text: 'Korkea', color: '#ff9900' }
  return { text: 'Erittäin korkea', color: 'var(--error)' }
}

function getPollenLevel(value) {
  if (!value || value < 10) return null
  if (value < 30) return 'vähän'
  if (value < 60) return 'kohtalaisesti'
  return 'runsaasti'
}

export default function WeatherWidget() {
  const [weather, setWeather] = useState(null)
  const [airQuality, setAirQuality] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  async function fetchData() {
    try {
      setError(null)
      const [weatherRes, airRes] = await Promise.all([
        fetch(WEATHER_URL),
        fetch(AIR_QUALITY_URL)
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

  const uv = airQuality?.current?.uv_index
  const uvLevel = uv != null ? getUvLevel(uv) : null

  // Check pollen levels
  const birch = getPollenLevel(airQuality?.current?.birch_pollen)
  const grass = getPollenLevel(airQuality?.current?.grass_pollen)
  const alder = getPollenLevel(airQuality?.current?.alder_pollen)

  const pollenTypes = []
  if (birch) pollenTypes.push(`Koivu: ${birch}`)
  if (grass) pollenTypes.push(`Heinä: ${grass}`)
  if (alder) pollenTypes.push(`Leppä: ${alder}`)

  return (
    <div className="weather-widget card">
      <div className="weather-current">
        <span className="weather-icon">{weatherInfo.icon}</span>
        <div className="weather-info">
          <span className="temp">{Math.round(current.temperature_2m)}°</span>
          <span className="condition">{weatherInfo.text}</span>
        </div>
        <div className="wind">
          <span className="wind-icon">💨</span>
          <span>{Math.round(current.wind_speed_10m)} m/s</span>
        </div>
      </div>
      <div className="weather-extra">
        {uvLevel && (
          <div className="extra-item">
            <span className="extra-icon">☀️</span>
            <span className="extra-label">UV</span>
            <span className="extra-value" style={{ color: uvLevel.color }}>
              {Math.round(uv)} - {uvLevel.text}
            </span>
          </div>
        )}
        {pollenTypes.length > 0 ? (
          <div className="extra-item">
            <span className="extra-icon">🌸</span>
            <span className="extra-label">Siitepöly</span>
            <span className="extra-value">{pollenTypes.join(', ')}</span>
          </div>
        ) : (
          <div className="extra-item">
            <span className="extra-icon">🌸</span>
            <span className="extra-label">Siitepöly</span>
            <span className="extra-value muted">Ei merkittävää</span>
          </div>
        )}
      </div>
    </div>
  )
}
