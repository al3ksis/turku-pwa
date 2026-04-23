import { useState, useEffect } from 'react'
import { fetchWithTimeout } from '../utils/fetch'
import './BusWidget.css'

const DIGITRANSIT_URL = 'https://api.digitransit.fi/routing/v2/waltti/gtfs/v1'
const REFRESH_INTERVAL_MS = 30000
const DEPARTURES_COUNT = 3
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
      return []
    }
  }
  // Migrate from old single stop format
  const oldStop = localStorage.getItem('busStopId')
  if (oldStop) {
    return [oldStop]
  }
  return []
}

function loadCustomNames() {
  const saved = localStorage.getItem('busStopNames')
  if (saved) {
    try {
      return JSON.parse(saved)
    } catch {
      return {}
    }
  }
  return {}
}

export default function BusWidget() {
  const [stops, setStops] = useState(loadStops)
  const [stopsData, setStopsData] = useState({})
  const [showSettings, setShowSettings] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [customNames, setCustomNames] = useState(loadCustomNames)
  const [editingStopId, setEditingStopId] = useState(null)
  const [editNameValue, setEditNameValue] = useState('')

  function getDisplayName(stopId) {
    return customNames[stopId] || stopsData[stopId]?.data?.name || stopId
  }

  function saveCustomName(stopId, name) {
    const trimmed = name.trim()
    const newNames = { ...customNames }
    if (trimmed) {
      newNames[stopId] = trimmed
    } else {
      delete newNames[stopId]
    }
    localStorage.setItem('busStopNames', JSON.stringify(newNames))
    setCustomNames(newNames)
  }

  function startEditing(stopId) {
    setEditingStopId(stopId)
    setEditNameValue(customNames[stopId] || '')
  }

  function finishEditing() {
    if (editingStopId) {
      saveCustomName(editingStopId, editNameValue)
      setEditingStopId(null)
      setEditNameValue('')
    }
  }

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
    if (stops.length === 0) return
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
    saveStops(stops.filter(s => s !== stopId))
  }

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
                {editingStopId === stopId ? (
                  <input
                    type="text"
                    className="stop-name-input"
                    value={editNameValue}
                    onChange={(e) => setEditNameValue(e.target.value)}
                    onBlur={finishEditing}
                    onKeyDown={(e) => e.key === 'Enter' && finishEditing()}
                    placeholder={stopsData[stopId]?.data?.name || stopId}
                    autoFocus
                  />
                ) : (
                  <button
                    className="stop-name-btn"
                    onClick={() => startEditing(stopId)}
                    title="Nimeä uudelleen"
                  >
                    {getDisplayName(stopId)}
                  </button>
                )}
                <button
                  className="remove-btn"
                  onClick={() => removeStop(stopId)}
                  title="Poista"
                >
                  ✕
                </button>
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
    <div className="bus-widget">
      <div className="bus-manage-row">
        <button className="bus-manage-btn" onClick={() => setShowSettings(true)}>
          ⚙ Pysäkit
        </button>
      </div>

      {stops.length === 0 && (
        <div className="bus-empty card">
          <p>Ei pysäkkejä</p>
          <p className="bus-empty-hint">Lisää pysäkki painamalla Pysäkit</p>
        </div>
      )}

      {stops.map(stopId => {
        const data = stopsData[stopId] || { loading: true }
        const name = getDisplayName(stopId)
        return (
          <div key={stopId} className="bus-stop-card card">
            <div className="bus-stop-header">
              <img src="/foli-logo.svg" alt="" className="bus-stop-logo" />
              <span className="bus-stop-name">{name}</span>
            </div>

            {data.loading && (
              <div className="bus-stop-loading">
                {[1, 2, 3].map(i => <div key={i} className="skeleton-row bus-skeleton-row" />)}
              </div>
            )}

            {data.error && (
              <div className="bus-stop-error">
                <p>{data.error}</p>
                <button className="btn-primary" onClick={() => fetchStop(stopId)}>
                  Yritä uudelleen
                </button>
              </div>
            )}

            {!data.loading && !data.error && data.data && (
              <div className="bus-departures">
                {data.data.stoptimesWithoutPatterns.map((dep, i) => {
                  const depSeconds = dep.realtime ? dep.realtimeDeparture : dep.scheduledDeparture
                  const minutes = getMinutesUntil(dep.serviceDay, depSeconds)
                  const soon = minutes <= SOON_THRESHOLD_MINUTES
                  return (
                    <div key={i} className="bus-departure-row">
                      <span className={`bus-line-badge ${soon ? 'soon' : ''}`}>
                        {dep.trip.route.shortName}
                      </span>
                      <span className="bus-destination">{dep.headsign}</span>
                      <span className="bus-dep-time">{formatTime(dep.serviceDay, depSeconds)}</span>
                      <span className={`bus-dep-minutes ${soon ? 'soon' : ''}`}>
                        {minutes} min
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
