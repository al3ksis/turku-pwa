import { useState, useRef, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useVehicleTracking } from '../hooks/useVehicleTracking'
import { TURKU_CENTER } from '../utils/vehicleMatching'
import './BusMapSheet.css'

// Snap points (% of viewport height)
const SNAP_HALF = 55
const SNAP_FULL = 85

// CartoDB Dark Matter tiles
const DARK_TILES = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
const TILE_ATTRIBUTION = '&copy; <a href="https://carto.com/">CARTO</a>'

// Custom markers
const busIcon = L.divIcon({
  className: 'bus-marker-wrapper',
  html: '<div class="bus-marker">🚌</div>',
  iconSize: [36, 36],
  iconAnchor: [18, 18]
})

const stopIcon = L.divIcon({
  className: 'stop-marker-wrapper',
  html: '<div class="stop-marker">🚏</div>',
  iconSize: [24, 24],
  iconAnchor: [12, 12]
})

// Map auto-fit component - centers only on first load
function MapBounds({ busPosition }) {
  const map = useMap()
  const hasCentered = useRef(false)

  useEffect(() => {
    if (busPosition && !hasCentered.current) {
      map.setView(busPosition, 15)
      hasCentered.current = true
    }
  }, [map, busPosition])

  return null
}

export default function BusMapSheet({ departure, stopId, onClose }) {
  const [sheetHeight, setSheetHeight] = useState(SNAP_HALF)
  const [isDragging, setIsDragging] = useState(false)
  const startY = useRef(0)
  const startHeight = useRef(0)

  const { vehicle, loading, error, refetch } = useVehicleTracking(departure, stopId, !!departure)

  // Touch handlers for drag gesture
  function handleTouchStart(e) {
    startY.current = e.touches[0].clientY
    startHeight.current = sheetHeight
    setIsDragging(true)
  }

  function handleTouchMove(e) {
    if (!isDragging) return
    const deltaY = startY.current - e.touches[0].clientY
    const deltaPercent = (deltaY / window.innerHeight) * 100
    const newHeight = Math.max(0, Math.min(SNAP_FULL, startHeight.current + deltaPercent))
    setSheetHeight(newHeight)
  }

  function handleTouchEnd() {
    setIsDragging(false)
    // Snap to nearest point
    if (sheetHeight < 25) {
      onClose()
    } else if (sheetHeight < (SNAP_HALF + SNAP_FULL) / 2) {
      setSheetHeight(SNAP_HALF)
    } else {
      setSheetHeight(SNAP_FULL)
    }
  }

  // Mouse handlers for desktop testing
  function handleMouseDown(e) {
    startY.current = e.clientY
    startHeight.current = sheetHeight
    setIsDragging(true)
  }

  useEffect(() => {
    if (!isDragging) return

    function handleMouseMove(e) {
      const deltaY = startY.current - e.clientY
      const deltaPercent = (deltaY / window.innerHeight) * 100
      const newHeight = Math.max(0, Math.min(SNAP_FULL, startHeight.current + deltaPercent))
      setSheetHeight(newHeight)
    }

    function handleMouseUp() {
      setIsDragging(false)
      if (sheetHeight < 25) {
        onClose()
      } else if (sheetHeight < (SNAP_HALF + SNAP_FULL) / 2) {
        setSheetHeight(SNAP_HALF)
      } else {
        setSheetHeight(SNAP_FULL)
      }
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, sheetHeight, onClose])

  if (!departure) return null

  const busPosition = vehicle ? [vehicle.latitude, vehicle.longitude] : null
  const delayMinutes = vehicle?.delaysecs ? Math.round(vehicle.delaysecs / 60) : 0

  return (
    <>
      <div
        className={`sheet-backdrop ${departure ? 'visible' : ''}`}
        onClick={onClose}
      />
      <div
        className={`sheet-container ${isDragging ? 'dragging' : ''}`}
        style={{ height: `${sheetHeight}vh` }}
      >
        <div
          className="sheet-handle-area"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
        >
          <div className="sheet-handle" />
        </div>

        <div className="sheet-header">
          <div className="sheet-bus-info">
            <span className="sheet-line-badge">
              {departure.trip?.route?.shortName}
            </span>
            <div>
              <div className="sheet-destination">{departure.headsign}</div>
              {vehicle?.onwardcalls?.[0]?.stoppointname && (
                <div className="sheet-next-stop">
                  Seuraava: {vehicle.onwardcalls[0].stoppointname}
                </div>
              )}
            </div>
          </div>
          {vehicle && (
            <div className={`sheet-delay ${delayMinutes > 0 ? 'late' : delayMinutes < 0 ? 'early' : 'on-time'}`}>
              {delayMinutes > 0 && `+${delayMinutes} min`}
              {delayMinutes < 0 && `${delayMinutes} min`}
              {delayMinutes === 0 && 'Aikataulussa'}
            </div>
          )}
        </div>

        {loading && (
          <div className="sheet-loading">
            <div className="sheet-loading-spinner" />
            <span>Haetaan bussia...</span>
          </div>
        )}

        {error && !loading && (
          <div className="sheet-error">
            <p>{error}</p>
            <button className="btn-primary" onClick={refetch}>
              Yritä uudelleen
            </button>
          </div>
        )}

        {!loading && !error && vehicle && (
          <div className="sheet-map-container">
            <MapContainer
              center={busPosition || [TURKU_CENTER.latitude, TURKU_CENTER.longitude]}
              zoom={15}
              className="sheet-map"
              zoomControl={true}
              attributionControl={true}
            >
              <TileLayer
                url={DARK_TILES}
                attribution={TILE_ATTRIBUTION}
              />
              {busPosition && (
                <Marker position={busPosition} icon={busIcon} />
              )}
              <MapBounds busPosition={busPosition} />
            </MapContainer>
          </div>
        )}

        <button className="sheet-close" onClick={onClose}>
          ✕
        </button>
      </div>
    </>
  )
}
