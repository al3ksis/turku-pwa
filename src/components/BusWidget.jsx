import { useState, useEffect } from 'react'
import { fetchWithTimeout } from '../utils/fetch'
import './BusWidget.css'

const DIGITRANSIT_URL = 'https://api.digitransit.fi/routing/v2/waltti/gtfs/v1'
const REFRESH_INTERVAL_MS = 30000
const DEPARTURES_COUNT = 4
const SOON_THRESHOLD_MINUTES = 5

const API_KEY = import.meta.env.VITE_DIGITRANSIT_API_KEY || ''

const query = `
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

function formatTime(serviceDay, departureSeconds) {
  // serviceDay is Unix timestamp of midnight, departureSeconds is seconds since midnight
  const departureTime = new Date((serviceDay + departureSeconds) * 1000)
  const hours = departureTime.getHours().toString().padStart(2, '0')
  const minutes = departureTime.getMinutes().toString().padStart(2, '0')
  return `${hours}:${minutes}`
}

function getMinutesUntil(serviceDay, departureSeconds) {
  const departureTime = (serviceDay + departureSeconds) * 1000
  const now = Date.now()
  const diff = Math.floor((departureTime - now) / 60000)
  return diff
}

export default function BusWidget() {
  const [stopId, setStopId] = useState(() =>
    localStorage.getItem('busStopId') || 'FOLI:598'
  )
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showSettings, setShowSettings] = useState(false)
  const [inputValue, setInputValue] = useState(stopId)

  async function fetchDepartures() {
    try {
      setError(null)
      const res = await fetchWithTimeout(DIGITRANSIT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'digitransit-subscription-key': API_KEY
        },
        body: JSON.stringify({ query, variables: { stopId, numberOfDepartures: DEPARTURES_COUNT } })
      })
      const json = await res.json()
      if (json.errors) {
        throw new Error(json.errors[0].message)
      }
      if (!json.data?.stop) {
        throw new Error('Pysäkkiä ei löydy')
      }
      setData(json.data.stop)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDepartures()
    const interval = setInterval(fetchDepartures, REFRESH_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [stopId])

  function saveSettings() {
    localStorage.setItem('busStopId', inputValue)
    setStopId(inputValue)
    setShowSettings(false)
    setLoading(true)
  }

  if (showSettings) {
    return (
      <div className="bus-widget card">
        <div className="bus-header">
          <h2>Asetukset</h2>
        </div>
        <div className="bus-settings">
          <label>
            Pysäkki-ID
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="FOLI:598"
            />
          </label>
          <div className="settings-buttons">
            <button className="btn-secondary" onClick={() => setShowSettings(false)}>
              Peruuta
            </button>
            <button className="btn-primary" onClick={saveSettings}>
              Tallenna
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bus-widget card">
      <div className="bus-header">
        <div>
          <img src="/foli-logo.svg" alt="Föli" className="bus-logo" />
          <h2>{loading ? 'Ladataan...' : data?.name || 'Bussit'}</h2>
        </div>
        <button className="settings-btn" onClick={() => setShowSettings(true)} title="Asetukset">
          ⚙️
        </button>
      </div>

      {loading && (
        <div className="bus-loading">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="skeleton-row" />
          ))}
        </div>
      )}

      {error && (
        <div className="bus-error">
          <p>{error}</p>
          <button className="btn-primary" onClick={fetchDepartures}>Yritä uudelleen</button>
        </div>
      )}

      {!loading && !error && data && (
        <div className="departures">
          {data.stoptimesWithoutPatterns.map((dep, i) => {
            const depSeconds = dep.realtime ? dep.realtimeDeparture : dep.scheduledDeparture
            const minutes = getMinutesUntil(dep.serviceDay, depSeconds)
            return (
              <div key={i} className="departure-row">
                <span className="line-badge">{dep.trip.route.shortName}</span>
                <span className="destination">{dep.headsign}</span>
                <span className="time">{formatTime(dep.serviceDay, depSeconds)}</span>
                <span className={`minutes ${minutes <= SOON_THRESHOLD_MINUTES ? 'soon' : ''}`}>
                  {minutes} min
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
