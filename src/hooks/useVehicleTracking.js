import { useState, useEffect, useCallback } from 'react'
import { fetchWithTimeout } from '../utils/fetch'
import { findMatchingVehicle } from '../utils/vehicleMatching'

const FOLI_VEHICLE_URL = 'https://data.foli.fi/siri/vm'
const REFRESH_INTERVAL_MS = 3000

/**
 * Hook bussin reaaliaikaiseen seurantaan
 * @param {Object} departure - BusWidgetin departure-objekti (tai null kun ei seurata)
 * @param {string} stopId - Pysäkin ID (esim. "FOLI:1234")
 * @param {boolean} isTracking - Onko seuranta aktiivinen
 * @returns {Object} { vehicle, loading, error, refetch }
 */
export function useVehicleTracking(departure, stopId, isTracking) {
  const [vehicle, setVehicle] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchVehicle = useCallback(async () => {
    if (!departure || !stopId) return

    try {
      setError(null)
      const res = await fetchWithTimeout(FOLI_VEHICLE_URL)

      if (!res.ok) {
        throw new Error('Bussidatan haku epäonnistui')
      }

      const data = await res.json()
      const matched = findMatchingVehicle(departure, data, stopId)

      if (matched) {
        setVehicle(matched)
      } else {
        setError('Bussia ei löytynyt')
        setVehicle(null)
      }
    } catch (err) {
      setError(err.message)
      setVehicle(null)
    } finally {
      setLoading(false)
    }
  }, [departure, stopId])

  useEffect(() => {
    if (!isTracking || !departure || !stopId) {
      setVehicle(null)
      setError(null)
      return
    }

    // Hae heti kun seuranta alkaa
    setLoading(true)
    fetchVehicle()

    // Päivitä 5s välein
    const interval = setInterval(fetchVehicle, REFRESH_INTERVAL_MS)

    return () => clearInterval(interval)
  }, [isTracking, departure, stopId, fetchVehicle])

  return { vehicle, loading, error, refetch: fetchVehicle }
}
