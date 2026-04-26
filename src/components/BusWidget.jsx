import { useState, useEffect } from 'react'
import { fetchWithTimeout } from '../utils/fetch'
import './BusWidget.css'

const DIGITRANSIT_URL = 'https://api.digitransit.fi/routing/v2/waltti/gtfs/v1'
const REFRESH_INTERVAL_MS = 30000
const DEPARTURES_FETCH_COUNT = 10
const DEPARTURES_SHOW_COUNT = 3
const SOON_THRESHOLD_MINUTES = 5
const ROUTE_TTL_MS = 7 * 24 * 3600 * 1000

const API_KEY = import.meta.env.VITE_DIGITRANSIT_API_KEY || ''

const DEPARTURES_QUERY = `
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

const ROUTES_QUERY = `
query GetStopRoutes($ids: [String]!) {
  stops(ids: $ids) {
    gtfsId
    routes { shortName }
  }
}
`

function formatTime(serviceDay, departureSeconds) {
  const d = new Date((serviceDay + departureSeconds) * 1000)
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

function getMinutesUntil(serviceDay, departureSeconds) {
  return Math.floor(((serviceDay + departureSeconds) * 1000 - Date.now()) / 60000)
}

function loadStops() {
  try {
    const saved = localStorage.getItem('busStops')
    if (saved) return JSON.parse(saved)
    const oldStop = localStorage.getItem('busStopId')
    if (oldStop) return [oldStop]
  } catch { /* */ }
  return []
}

function loadCustomNames() {
  try {
    return JSON.parse(localStorage.getItem('busStopNames') || '{}')
  } catch {
    return {}
  }
}

function loadRouteData() {
  try {
    return JSON.parse(localStorage.getItem('busStopRouteData') || '{}')
  } catch {
    return {}
  }
}

function apiPost(body) {
  return fetchWithTimeout(DIGITRANSIT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'digitransit-subscription-key': API_KEY },
    body: JSON.stringify(body),
  })
}

export default function BusWidget({ editing = false }) {
  const [stops, setStops] = useState(loadStops)
  const [stopsData, setStopsData] = useState({})
  const [inputValue, setInputValue] = useState('')
  const [customNames, setCustomNames] = useState(loadCustomNames)
  const [editingStopId, setEditingStopId] = useState(null)
  const [editNameValue, setEditNameValue] = useState('')
  const [routeData, setRouteData] = useState(loadRouteData)
  const [routesLoading, setRoutesLoading] = useState(false)

  function getDisplayName(stopId) {
    return customNames[stopId] || stopsData[stopId]?.data?.name || stopId
  }

  function getApiName(stopId) {
    return stopsData[stopId]?.data?.name || stopId.replace('FOLI:', '')
  }

  function saveCustomName(stopId, name) {
    const trimmed = name.trim()
    const newNames = { ...customNames }
    if (trimmed) newNames[stopId] = trimmed
    else delete newNames[stopId]
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

  function saveRouteData(newData) {
    localStorage.setItem('busStopRouteData', JSON.stringify(newData))
    setRouteData(newData)
  }

  function toggleRoute(stopId, shortName) {
    const current = routeData[stopId] || { available: [], hidden: [], fetchedAt: 0 }
    const hidden = current.hidden.includes(shortName)
      ? current.hidden.filter(r => r !== shortName)
      : [...current.hidden, shortName]
    saveRouteData({ ...routeData, [stopId]: { ...current, hidden } })
  }

  function clearHiddenRoutes(stopId) {
    const current = routeData[stopId] || { available: [], hidden: [], fetchedAt: 0 }
    saveRouteData({ ...routeData, [stopId]: { ...current, hidden: [] } })
  }

  function hideAllRoutes(stopId) {
    const current = routeData[stopId] || { available: [], hidden: [], fetchedAt: 0 }
    saveRouteData({ ...routeData, [stopId]: { ...current, hidden: [...current.available] } })
  }

  async function hydrateRoutes(stopIds) {
    const now = Date.now()
    const toFetch = (stopIds || stops).filter(id => {
      const d = routeData[id]
      return !d || d.fetchedAt === 0 || now - d.fetchedAt > ROUTE_TTL_MS
    })
    if (toFetch.length === 0) return

    setRoutesLoading(true)
    try {
      const res = await apiPost({ query: ROUTES_QUERY, variables: { ids: toFetch } })
      const json = await res.json()
      const results = json.data?.stops || []
      const updated = { ...routeData }

      results.forEach(stop => {
        if (!stop) return
        const existing = updated[stop.gtfsId] || { available: [], hidden: [], fetchedAt: 0 }
        const available = (stop.routes || []).map(r => r.shortName).filter(Boolean)
        const hidden = existing.hidden.filter(h => available.includes(h))
        updated[stop.gtfsId] = { available, hidden, fetchedAt: now }
      })

      saveRouteData(updated)
    } catch { /* silent — keep existing data */ }
    finally {
      setRoutesLoading(false)
    }
  }

  useEffect(() => {
    if (editing) hydrateRoutes()
  }, [editing])

  async function fetchStop(stopId) {
    setStopsData(prev => ({ ...prev, [stopId]: { ...prev[stopId], loading: true, error: null } }))
    try {
      const res = await apiPost({ query: DEPARTURES_QUERY, variables: { stopId, numberOfDepartures: DEPARTURES_FETCH_COUNT } })
      const json = await res.json()
      if (json.errors) throw new Error(json.errors[0].message)
      if (!json.data?.stop) throw new Error('Pysäkkiä ei löydy')
      setStopsData(prev => ({ ...prev, [stopId]: { data: json.data.stop, loading: false, error: null } }))
    } catch (err) {
      setStopsData(prev => ({ ...prev, [stopId]: { ...prev[stopId], loading: false, error: err.message } }))
    }
  }

  function fetchAllStops() { stops.forEach(fetchStop) }

  useEffect(() => {
    if (stops.length === 0) return
    fetchAllStops()
    const interval = setInterval(() => {
      if (!document.hidden) fetchAllStops()
    }, REFRESH_INTERVAL_MS)
    function onVisibility() {
      if (!document.hidden) fetchAllStops()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [stops])

  function saveStops(newStops) {
    localStorage.setItem('busStops', JSON.stringify(newStops))
    setStops(newStops)
  }

  function addStop() {
    const trimmed = inputValue.trim()
    if (!trimmed) return
    const stopId = trimmed.startsWith('FOLI:') ? trimmed : `FOLI:${trimmed}`
    if (stops.includes(stopId)) return
    saveStops([...stops, stopId])
    setInputValue('')
    hydrateRoutes([stopId])
  }

  function removeStop(stopId) {
    saveStops(stops.filter(s => s !== stopId))
    const updated = { ...routeData }
    delete updated[stopId]
    saveRouteData(updated)
  }

  if (editing) {
    return (
      <div className="bus-widget">
        <div className="bus-settings">
          <div className="stops-list">
            {stops.map(stopId => {
              const rd = routeData[stopId] || { available: [], hidden: [], fetchedAt: 0 }
              const displayName = getDisplayName(stopId)
              const apiName = getApiName(stopId)
              const hasCustomName = !!customNames[stopId]
              const allTracked = rd.hidden.length === 0
              const showSkeleton = routesLoading && rd.available.length === 0

              return (
                <div key={stopId} className="stop-card card">
                  <div className="stop-card-header">
                    <img src="/foli-logo.svg" alt="" className="bus-stop-logo" />
                    <div className="stop-card-name-col">
                      {editingStopId === stopId ? (
                        <input
                          type="text"
                          className="stop-name-input"
                          value={editNameValue}
                          onChange={e => setEditNameValue(e.target.value)}
                          onBlur={finishEditing}
                          onKeyDown={e => e.key === 'Enter' && finishEditing()}
                          placeholder={apiName}
                          autoFocus
                        />
                      ) : (
                        <button className="stop-card-name" onClick={() => startEditing(stopId)} title="Nimeä uudelleen">
                          {displayName}
                          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" className="pencil-icon" aria-hidden="true">
                            <path d="M11.7 2.3a1 1 0 0 1 1.4 0l.6.6a1 1 0 0 1 0 1.4L5.5 12.5l-2.5.5.5-2.5L11.7 2.3z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                      )}
                      {hasCustomName && editingStopId !== stopId && (
                        <div className="stop-card-sub">{apiName}</div>
                      )}
                    </div>
                    <button className="remove-btn" onClick={() => removeStop(stopId)} title="Poista">✕</button>
                  </div>

                  <div className="route-chips-section">
                    <div className="route-chips-label-row">
                      <span className="route-chips-label">SEURATUT LINJAT</span>
                      {allTracked
                        ? <button className="route-chips-clear" onClick={() => hideAllRoutes(stopId)}>Piilota kaikki</button>
                        : <button className="route-chips-clear" onClick={() => clearHiddenRoutes(stopId)}>Valitse kaikki</button>
                      }
                    </div>
                    <div className="route-chips-row">
                      {showSkeleton && [1, 2, 3].map(i => (
                        <div key={i} className="route-chip-skeleton skeleton-row" />
                      ))}
                      {!showSkeleton && rd.available.length === 0 && !routesLoading && (
                        <span className="route-chips-empty">Ladataan...</span>
                      )}
                      {rd.available.map(shortName => {
                        const isHidden = rd.hidden.includes(shortName)
                        return (
                          <button
                            key={shortName}
                            className={`route-chip ${isHidden ? 'hidden-route' : 'active'}`}
                            onClick={() => toggleRoute(stopId, shortName)}
                          >
                            {!isHidden && <span className="chip-check">✓</span>}
                            {shortName}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="add-stop-section">
            <div className="add-stop-label-row">
              <span className="add-stop-label">LISÄÄ PYSÄKKI</span>
              <a href="https://reittiopas.foli.fi/lahellasi/BUS/POS" target="_blank" rel="noopener noreferrer" className="add-stop-map-link">Etsi kartalta →</a>
            </div>
            <div className="add-stop">
              <input
                type="text"
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                placeholder="esim. 1933"
                onKeyDown={e => e.key === 'Enter' && addStop()}
              />
              <button className="btn-primary" onClick={addStop}>Lisää</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bus-widget">
      {stops.length === 0 && (
        <div className="bus-empty card">
          <p>Ei pysäkkejä</p>
          <p className="bus-empty-hint">Lisää pysäkki painamalla Muokkaa</p>
        </div>
      )}

      {stops.map(stopId => {
        const data = stopsData[stopId] || { loading: true }
        const name = getDisplayName(stopId)
        const hidden = routeData[stopId]?.hidden || []

        const departures = data.data?.stoptimesWithoutPatterns || []
        const filtered = departures
          .filter(dep => !hidden.includes(dep.trip.route.shortName))
          .slice(0, DEPARTURES_SHOW_COUNT)

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
                <button className="btn-primary" onClick={() => fetchStop(stopId)}>Yritä uudelleen</button>
              </div>
            )}

            {!data.loading && !data.error && data.data && (
              <div className="bus-departures">
                {filtered.length === 0 ? (
                  <div className="bus-no-tracked">Ei seurattuja linjoja</div>
                ) : (
                  filtered.map((dep, i) => {
                    const depSeconds = dep.realtime ? dep.realtimeDeparture : dep.scheduledDeparture
                    const minutes = getMinutesUntil(dep.serviceDay, depSeconds)
                    const soon = minutes <= SOON_THRESHOLD_MINUTES
                    return (
                      <div key={i} className="bus-departure-row">
                        <span className={`bus-line-badge ${soon ? 'soon' : ''}`}>{dep.trip.route.shortName}</span>
                        <span className="bus-destination">{dep.headsign}</span>
                        <span className="bus-dep-time">{formatTime(dep.serviceDay, depSeconds)}</span>
                        <span className={`bus-dep-minutes ${soon ? 'soon' : ''}`}>{minutes} min</span>
                      </div>
                    )
                  })
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
