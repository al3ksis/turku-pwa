# Turku

Personal dashboard PWA for Turku.

## Features

- **Bus departures** - Real-time Föli departures (Digitransit API)
- **Weather** - Current weather and tomorrow forecast (Open-Meteo)
- **TPS games** - Upcoming HC TPS hockey games
- **Events** - Local events (placeholder)
- **News** - Local news (placeholder)

## Setup

```bash
npm install
npm run dev
```

## Configuration

### Digitransit API key (required for bus widget)

1. Register at [portal-api.digitransit.fi](https://portal-api.digitransit.fi/)
2. Subscribe to the Waltti API
3. Click the gear icon on the bus widget and enter your API key

### Bus stop

Click the gear icon on the bus widget to change the stop ID.

Default: `FOLI:598`

Find stop IDs from [Föli reittiopas](https://reittiopas.foli.fi/).

## Build

```bash
npm run build
npm run preview
```
