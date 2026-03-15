import { useState, useEffect } from 'react'
import './WeatherWidget.css'

const TURKU_LAT = 60.4518
const TURKU_LON = 22.2666

const API_URL = `https://api.open-meteo.com/v1/forecast?latitude=${TURKU_LAT}&longitude=${TURKU_LON}&current=temperature_2m,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=Europe/Helsinki&forecast_days=2`

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

export default function WeatherWidget() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  async function fetchWeather() {
    try {
      setError(null)
      const res = await fetch(API_URL)
      if (!res.ok) throw new Error('Sään haku epäonnistui')
      const json = await res.json()
      setData(json)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchWeather()
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
          <button className="btn-primary" onClick={fetchWeather}>Yritä uudelleen</button>
        </div>
      </div>
    )
  }

  const current = data.current
  const tomorrow = {
    max: data.daily.temperature_2m_max[1],
    min: data.daily.temperature_2m_min[1],
    code: data.daily.weather_code[1]
  }
  const weather = getWeather(current.weather_code)
  const tomorrowWeather = getWeather(tomorrow.code)

  return (
    <div className="weather-widget card">
      <div className="weather-current">
        <span className="weather-icon">{weather.icon}</span>
        <div className="weather-info">
          <span className="temp">{Math.round(current.temperature_2m)}°</span>
          <span className="condition">{weather.text}</span>
        </div>
        <div className="wind">
          <span className="wind-icon">💨</span>
          <span>{Math.round(current.wind_speed_10m)} m/s</span>
        </div>
      </div>
      <div className="weather-tomorrow">
        <span className="tomorrow-label">Huomenna</span>
        <span className="tomorrow-icon">{tomorrowWeather.icon}</span>
        <span className="tomorrow-temps">
          {Math.round(tomorrow.max)}° / {Math.round(tomorrow.min)}°
        </span>
      </div>
    </div>
  )
}
