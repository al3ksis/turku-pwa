import { useState, useEffect } from 'react'
import { fetchWithTimeout } from '../utils/fetch'
import './BusWidget.css'

const DIGITRANSIT_URL = 'https://api.digitransit.fi/routing/v2/waltti/gtfs/v1'
const REFRESH_INTERVAL_MS = 30000
const DEPARTURES_COUNT = 4
const SOON_THRESHOLD_MINUTES = 5
const MAX_STOPS = 3

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
  const departureTime = new Date((serviceDay + departureSeconds) * 1000)
  const hours = departureTime.getHours().toString().padStart(2, '0')
  const minutes = departureTime.getMinutes().toString().padStart(2, '0')
  return `${hours}:${minutes}`
}

function getMinutesUntil(serviceDay, departureSeconds) {
  const departureTime = (serviceDay + departureSeconds) * 1000
  const now = Date.now()
  return Math.floor((departureTime - now) / 60000)
}

function loadStops() {
  const saved = localStorage.getItem('busStops')
  if (saved) {
    try {
      return JSON.parse(saved)
    } catch {
      return ['FOLI:598']
    }
  }
  // Migrate from old single stop format
  const oldStop = localStorage.getItem('busStopId')
  if (oldStop) {
    return [oldStop]
  }
  return ['FOLI:598']
}

export default function BusWidget() {
  const [stops, setStops] = useState(loadStops)
  const [activeIndex, setActiveIndex] = useState(0)
  const [stopsData, setStopsData] = useState({})
  const [showSettings, setShowSettings] = useState(false)
  const [inputValue, setInputValue] = useState('')

  async function fetchStop(stopId) {
    setStopsData(prev => ({
      ...prev,
      [stopId]: { ...prev[stopId], loading: true, error: null }
    }))

    try {
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
      setStopsData(prev => ({
        ...prev,
        [stopId]: { data: json.data.stop, loading: false, error: null }
      }))
    } catch (err) {
      setStopsData(prev => ({
        ...prev,
        [stopId]: { ...prev[stopId], loading: false, error: err.message }
      }))
    }
  }

  function fetchAllStops() {
    stops.forEach(fetchStop)
  }

  useEffect(() => {
    fetchAllStops()
    const interval = setInterval(fetchAllStops, REFRESH_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [stops])

  function saveStops(newStops) {
    localStorage.setItem('busStops', JSON.stringify(newStops))
    setStops(newStops)
  }

  function addStop() {
    const trimmed = inputValue.trim()
    if (!trimmed || stops.length >= MAX_STOPS) return
    const stopId = trimmed.startsWith('FOLI:') ? trimmed : `FOLI:${trimmed}`
    if (stops.includes(stopId)) return
    saveStops([...stops, stopId])
    setInputValue('')
  }

  function removeStop(stopId) {
    const newStops = stops.filter(s => s !== stopId)
    saveStops(newStops)
    if (activeIndex >= newStops.length) {
      setActiveIndex(Math.max(0, newStops.length - 1))
    }
  }

  const activeStopId = stops[activeIndex]
  const activeData = stopsData[activeStopId] || { loading: true }

  if (showSettings) {
    return (
      <div className="bus-widget card">
        <div className="bus-header">
          <h2>Pysäkit</h2>
        </div>
        <div className="bus-settings">
          <div className="stops-list">
            {stops.map(stopId => (
              <div key={stopId} className="stop-item">
                <span className="stop-id">{stopsData[stopId]?.data?.name || stopId}</span>
                {stops.length > 1 && (
                  <button
                    className="remove-btn"
                    onClick={() => removeStop(stopId)}
                    title="Poista"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
          {stops.length < MAX_STOPS && (
            <div className="add-stop">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="esim. 1933"
                onKeyDown={(e) => e.key === 'Enter' && addStop()}
              />
              <button className="btn-primary" onClick={addStop}>
                Lisää
              </button>
            </div>
          )}
          <button className="btn-secondary" onClick={() => setShowSettings(false)}>
            Valmis
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bus-widget card">
      <div className="bus-header">
        <div>
          <img src="/foli-logo.svg" alt="Föli" className="bus-logo" />
          <h2>Föli</h2>
        </div>
        <button className="settings-btn" onClick={() => setShowSettings(true)} title="Asetukset">
          ⚙️
        </button>
      </div>

      {stops.length > 1 && (
        <div className="bus-tabs">
          {stops.map((stopId, i) => (
            <button
              key={stopId}
              className={`bus-tab ${i === activeIndex ? 'active' : ''}`}
              onClick={() => setActiveIndex(i)}
            >
              {stopsData[stopId]?.data?.name || stopId}
            </button>
          ))}
        </div>
      )}

      {activeData.loading && (
        <div className="bus-loading">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="skeleton-row" />
          ))}
        </div>
      )}

      {activeData.error && (
        <div className="bus-error">
          <p>{activeData.error}</p>
          <button className="btn-primary" onClick={() => fetchStop(activeStopId)}>
            Yritä uudelleen
          </button>
        </div>
      )}

      {!activeData.loading && !activeData.error && activeData.data && (
        <>
          {stops.length === 1 && (
            <div className="single-stop-name">{activeData.data.name}</div>
          )}
          <div className="departures">
            {activeData.data.stoptimesWithoutPatterns.map((dep, i) => {
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
        </>
      )}
    </div>
  )
}
