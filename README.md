# Turku

Personal dashboard PWA for Turku.

## Features

- **Weather** - Current weather, hourly forecast (expandable), UV index, pollen levels with color coding (Open-Meteo API)
- **Bus departures** - Real-time Föli departures with multi-stop support and tabs (Digitransit API)
- **TPS games** - Upcoming HC TPS hockey games (ICS calendar)
- **News** - Yle Turku news (RSS feed)

## Setup

```bash
npm install
npm run dev
```

## Configuration

### Digitransit API key (required for bus widget)

1. Register at [portal-api.digitransit.fi](https://portal-api.digitransit.fi/)
2. Subscribe to the Waltti API
3. Add to `.env` file: `VITE_DIGITRANSIT_API_KEY=your-key`

### Bus stops

Click the gear icon on the bus widget to add stops. You can add up to 3 stops.

Enter just the stop number (e.g. `1933`) - the `FOLI:` prefix is added automatically.

Find stop IDs from [Föli reittiopas](https://reittiopas.foli.fi/).

## Build

```bash
npm run build
npm run preview
```

## Deploy

Push to main branch for automatic Netlify deployment.
