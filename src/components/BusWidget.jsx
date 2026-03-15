import { useState, useEffect } from 'react'
import './BusWidget.css'

const DIGITRANSIT_URL = 'https://api.digitransit.fi/routing/v2/waltti/gtfs/v1'

// API key from https://portal-api.digitransit.fi/
// Store in localStorage as 'digitransitApiKey'
const getApiKey = () => localStorage.getItem('digitransitApiKey') || ''

const query = `
query GetDepartures($stopId: String!) {
  stop(id: $stopId) {
    name
    stoptimesWithoutPatterns(numberOfDepartures: 4) {
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
  const [apiKeyInput, setApiKeyInput] = useState(() => getApiKey())

  async function fetchDepartures() {
    const apiKey = getApiKey()
    if (!apiKey) {
      setError('API-avain puuttuu')
      setLoading(false)
      return
    }

    try {
      setError(null)
      const res = await fetch(DIGITRANSIT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'digitransit-subscription-key': apiKey
        },
        body: JSON.stringify({ query, variables: { stopId } })
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
    const interval = setInterval(fetchDepartures, 30000)
    return () => clearInterval(interval)
  }, [stopId])

  function saveSettings() {
    localStorage.setItem('busStopId', inputValue)
    localStorage.setItem('digitransitApiKey', apiKeyInput)
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
            Digitransit API-avain
            <input
              type="text"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx"
            />
            <span className="hint">
              Hanki avain: <a href="https://portal-api.digitransit.fi/" target="_blank" rel="noopener">portal-api.digitransit.fi</a>
            </span>
          </label>
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
          <span className="bus-icon">🚌</span>
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
          {error === 'API-avain puuttuu' ? (
            <button className="btn-primary" onClick={() => setShowSettings(true)}>
              Lisää API-avain
            </button>
          ) : (
            <button className="btn-primary" onClick={fetchDepartures}>Yritä uudelleen</button>
          )}
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
                <span className={`minutes ${minutes <= 5 ? 'soon' : ''}`}>
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
