// Vehicle matching: Yhdistää BusWidgetin lähdön (Digitransit) oikeaan ajoneuvoon (Föli SIRI)

const ARRIVAL_TIME_TOLERANCE_MS = 180000 // 3 minuuttia

/**
 * Normalisoi headsign/määränpää vertailua varten
 */
function normalizeHeadsign(str) {
  if (!str) return ''
  return str
    .toLowerCase()
    .replace(/[^a-zäöå0-9]/g, '')
    .trim()
}

/**
 * Pura pysäkin numero ID:stä (esim. "FOLI:1234" -> "1234")
 */
function extractStopNumber(stopId) {
  if (!stopId) return null
  return stopId.replace('FOLI:', '')
}

/**
 * Muuntaa Digitransit-lähdön Unix-aikaleimaksi
 */
function getDepartureTimestamp(departure) {
  const depSeconds = departure.realtime ? departure.realtimeDeparture : departure.scheduledDeparture
  return (departure.serviceDay + depSeconds) * 1000
}

/**
 * Tarkistaa onko pysäkki bussin tulevissa pysäkeissä ja palauttaa ennustetun ajan
 */
function findStopInOnwardCalls(vehicle, stopNumber) {
  if (!vehicle.onwardcalls || !stopNumber) return null

  const stop = vehicle.onwardcalls.find(call => call.stoppointref === stopNumber)
  if (stop) {
    // Palauta ennustettu tai ajoitettu saapumisaika
    return (stop.expectedarrivaltime || stop.aimedarrivaltime) * 1000
  }

  // Tarkista myös seuraava pysäkki erikseen
  if (vehicle.next_stoppointref === stopNumber) {
    return (vehicle.next_expectedarrivaltime || vehicle.next_aimedarrivaltime) * 1000
  }

  return null
}

/**
 * Etsii oikean ajoneuvon lähdölle
 * @param {Object} departure - BusWidgetin departure-objekti
 * @param {Object} vehiclesData - Föli SIRI VM -vastaus
 * @param {string} stopId - Pysäkin ID (esim. "FOLI:1234")
 * @returns {Object|null} Löydetty ajoneuvo tai null
 */
export function findMatchingVehicle(departure, vehiclesData, stopId) {
  if (!departure || !vehiclesData?.result?.vehicles) {
    return null
  }

  const vehicles = Object.values(vehiclesData.result.vehicles)
  const targetLine = departure.trip?.route?.shortName
  const targetHeadsign = normalizeHeadsign(departure.headsign)
  const targetTime = getDepartureTimestamp(departure)
  const stopNumber = extractStopNumber(stopId)

  // Vaihe 1: Suodata linja + määränpää
  const candidates = vehicles.filter(v => {
    const lineMatch = v.lineref === targetLine || v.publishedlinename === targetLine
    const headsignMatch = normalizeHeadsign(v.destinationname) === targetHeadsign
    return lineMatch && headsignMatch
  })

  if (candidates.length === 0) {
    return null
  }

  if (candidates.length === 1) {
    return candidates[0]
  }

  // Vaihe 2: Etsi bussi jonka onwardcalls sisältää pysäkin ja aika täsmää
  let bestMatch = null
  let bestTimeDiff = Infinity

  for (const vehicle of candidates) {
    const arrivalTime = findStopInOnwardCalls(vehicle, stopNumber)

    if (arrivalTime) {
      const timeDiff = Math.abs(arrivalTime - targetTime)

      if (timeDiff < ARRIVAL_TIME_TOLERANCE_MS && timeDiff < bestTimeDiff) {
        bestMatch = vehicle
        bestTimeDiff = timeDiff
      }
    }
  }

  if (bestMatch) {
    return bestMatch
  }

  // Vaihe 3: Fallback - ota lähin bussi ajan perusteella
  // (jos onwardcalls ei sisällä pysäkkiä, bussi voi olla jo ohittanut sen
  // tai data on epätäydellinen)
  return null
}

/**
 * Turun keskusta (fallback kartan keskitykseen)
 */
export const TURKU_CENTER = {
  latitude: 60.4518,
  longitude: 22.2666
}
