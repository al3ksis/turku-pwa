# Turku

Personal dashboard PWA for Turku — weather, buses, sports, news, and a daily Turku-dialect quote.

## Features

### Etusivu (home)
- **Daily Turku-dialect quote** picked deterministically from `quotes.json` (same all day, rotates at midnight)
- **Weather** — current temperature, "feels like", wind, condition. Click chevron to expand: sun arc, sunrise/sunset, daylight length, hourly forecast (temp/precipitation/wind), UV index, pollen levels (Open-Meteo)
- **Seuraavat bussit** — next departure for each saved stop, "Muokkaa" → bottom sheet for choosing which stops appear on home (per-stop visibility filter)
- **Seuraavat kotiottelut** — next home match per team (HC TPS / FC TPS / FC Inter / FC TPS Naiset), sorted by date, "Muokkaa" → bottom sheet for choosing which teams appear on home
- **Päivän uutiset** — today's news items from Yle Turku, clickable

### Bussit
- Per-stop departure list with auto-refresh (30s, paused when tab is hidden)
- Add/remove stops, custom names, per-stop route filtering (track only the lines you care about)
- Drag-and-drop reorder in edit mode (order shared with home page list)
- "Etsi kartalta" link to Föli's stop finder

### Ottelut
- Tabs: Kaikki / HC TPS / FC TPS / FC Inter / FC TPS Naiset
- "Seuraavat ottelut" — next match per team in Kaikki tab; single match for individual team tabs
- "Tulevat ottelut" — full upcoming list, league-colored badges (Liiga / Veikkausliiga / Cup / Kansallinen Ykkönen)
- Border color per match perspective: home (green) / away (blue) / paikallispeli derby (red)

### Uutiset
- Full Yle Turku news feed

## Tech stack

- React 19 + Vite 8
- Vanilla CSS with CSS variables (dark theme, mobile-first, max-width 430px)
- Netlify hosting + Netlify Functions (`netlify/functions/proxy.js`) for CORS-restricted sources
- localStorage for stale-while-revalidate caching (weather, news, bus departures, TPS/Inter games, custom names, hidden lists, daily quote tracking)
- Service Worker (`public/sw.js`) network-first for offline shell

## Data sources

| Source | Fetch | Cache |
|---|---|---|
| Open-Meteo (weather + air quality) | Direct | localStorage 30 min |
| Digitransit Waltti GraphQL (bus departures) | Direct | localStorage (depMs-based, mins recomputed at render) |
| Yle RSS Turku | Proxy | localStorage + CDN s-maxage 600 |
| HC TPS ICS calendar | Proxy | localStorage + CDN |
| FC TPS HTML (men + women) | Proxy | localStorage + CDN |
| FC Inter HTML | Proxy | localStorage + CDN |

## Setup

```bash
npm install
npm run dev
```

For local development with Netlify Functions (proxy):
```bash
netlify dev
```

## Configuration

### Digitransit API key (required for bus widget)

1. Register at [portal-api.digitransit.fi](https://portal-api.digitransit.fi/)
2. Subscribe to the Waltti API
3. Add to `.env` file: `VITE_DIGITRANSIT_API_KEY=your-key`
4. Set the same key in Netlify dashboard → Site settings → Environment variables for production

### Bus stops

Open Bussit tab → "Muokkaa" → enter stop number (e.g. `1933`) — the `FOLI:` prefix is added automatically. Use "Etsi kartalta →" to find IDs via Föli's reittiopas. Each stop has its own route filter (which lines to track) and custom name. New stops appear on home automatically.

## Build

```bash
npm run build
npm run preview
```

## Deploy

Push to `main` branch for automatic Netlify deployment.

## Project structure

```
src/
├── components/
│   ├── PageHome.jsx      # Quote, weather, buses, matches, news (with edit modals)
│   ├── PageBus.jsx       # Bus tab wrapper with edit toggle
│   ├── BusWidget.jsx     # Departure list + edit mode (drag, routes, add/remove)
│   ├── PageTPS.jsx       # Match tabs + Tulevat ottelut list
│   ├── MatchCard.jsx     # Shared FeatureMatchCard for home + Ottelut
│   ├── PageNews.jsx
│   ├── NewsWidget.jsx
│   ├── WeatherWidget.jsx
│   ├── PageHeader.jsx    # TURKU/ÅBO header + title row
│   └── BottomNav.jsx
├── utils/fetch.js        # 10s timeout helper
├── App.jsx
└── index.css             # Dark theme tokens, shared styles

netlify/functions/proxy.js  # CORS proxy for hc.tps.fi, fc.tps.fi, fcinter.fi, yle.fi
public/                     # Icons, manifest, service worker
quotes.json                 # Turku-dialect daily quotes
```
