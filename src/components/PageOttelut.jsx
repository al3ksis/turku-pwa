import { useState, useEffect, useRef } from 'react'
import { fetchWithTimeout } from '../utils/fetch'
import { PageHeader } from './PageHeader'
import { FeatureMatchCard } from './MatchCard'
import './PageOttelut.css'

// --- SWR list cache ---

const TPS_LIST_CACHE_KEY = 'tpsListCache'

function reviveList(list, dateField) {
  if (!Array.isArray(list)) return null
  const now = Date.now()
  return list
    .map(g => ({ ...g, [dateField]: new Date(g[dateField]) }))
    .filter(g => !isNaN(g[dateField]) && g[dateField].getTime() > now)
}

function readCachedTpsList() {
  try {
    const raw = localStorage.getItem(TPS_LIST_CACHE_KEY)
    if (!raw) return { hc: null, fc: null, inter: null, naiset: null, fcCup: null }
    const parsed = JSON.parse(raw)
    return {
      hc: reviveList(parsed.hc, 'start'),
      fc: reviveList(parsed.fc, 'date'),
      inter: reviveList(parsed.inter, 'date'),
      naiset: reviveList(parsed.naiset, 'date'),
      fcCup: reviveList(parsed.fcCup, 'date'),
    }
  } catch {
    return { hc: null, fc: null, inter: null, naiset: null, fcCup: null }
  }
}

function writeCachedTpsList(cache) {
  try {
    localStorage.setItem(TPS_LIST_CACHE_KEY, JSON.stringify(cache))
  } catch { /* silent */ }
}

const HC_ICS = 'https://hc.tps.fi/fi-fi/?action=getContent&type=exportcalendar&format=ics&levelId=64&season=2026'
const HC_URL = `/.netlify/functions/proxy?url=${encodeURIComponent(HC_ICS)}`
const FC_PAGE = 'https://fc.tps.fi/ottelut/miesten-edustus/'
const FC_URL = `/.netlify/functions/proxy?url=${encodeURIComponent(FC_PAGE)}`
const INTER_PAGE = 'https://fcinter.fi/ottelut/edustus'
const INTER_URL = `/.netlify/functions/proxy?url=${encodeURIComponent(INTER_PAGE)}`
const FC_NAISET_PAGE = 'https://fc.tps.fi/ottelut/naisten-edustus/'
const FC_NAISET_URL = `/.netlify/functions/proxy?url=${encodeURIComponent(FC_NAISET_PAGE)}`
const FC_CUP_PAGE = 'https://fc.tps.fi/ottelut/suomen-cup/'
const FC_CUP_URL = `/.netlify/functions/proxy?url=${encodeURIComponent(FC_CUP_PAGE)}`

// --- Parsers ---

function parseHcTpsIcs(icsText) {
  const events = []
  const lines = icsText.split('\n')
  let ev = null
  const now = new Date()

  for (const line of lines) {
    const t = line.trim()
    if (t === 'BEGIN:VEVENT') {
      ev = {}
    } else if (t === 'END:VEVENT' && ev) {
      if (ev.start && ev.summary && ev.start > now) events.push(ev)
      ev = null
    } else if (ev) {
      if (t.startsWith('DTSTART:')) {
        const s = t.slice(8)
        ev.start = new Date(Date.UTC(+s.slice(0,4), +s.slice(4,6)-1, +s.slice(6,8), +s.slice(9,11), +s.slice(11,13)))
      } else if (t.startsWith('SUMMARY:')) {
        ev.summary = t.slice(8)
      } else if (t.startsWith('LOCATION:')) {
        ev.location = t.slice(9)
      }
    }
  }
  return events.sort((a, b) => a.start - b.start)
}

function parseHcMatch(summary) {
  const parts = summary.split('-')
  if (parts.length < 2) return { opponent: summary, isHome: true }
  const first = parts[0].trim()
  const rest = parts.slice(1).join('-').trim()
  return first === 'TPS' ? { opponent: rest, isHome: true } : { opponent: first, isHome: false }
}

function parseFcTpsHtml(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const games = []
  const now = new Date()
  const DATE_RE = /(\d{2})\.(\d{2})\.(\d{4})\s+(\d{1,2})[.:](\d{2})(?::\d{2})?/

  for (const row of doc.querySelectorAll('tr')) {
    const cells = Array.from(row.querySelectorAll('td'))
    if (cells.length < 2) continue

    let gameDate = null
    let homeTeam = null
    let awayTeam = null
    let venue = null

    for (const cell of cells) {
      const text = cell.textContent.trim()
      const dateMatch = text.match(DATE_RE)
      if (dateMatch) {
        const [, d, mo, y, h, mi] = dateMatch
        gameDate = new Date(+y, +mo - 1, +d, +h, +mi)
        const after = text.slice(dateMatch.index + dateMatch[0].length).trim()
        if (after && !venue) venue = after.split(',')[0].trim()
        continue
      }
      if (text.includes(' vs ')) {
        const parts = text.split(' vs ')
        homeTeam = parts[0].trim()
        awayTeam = parts[1]?.split('\n')[0].trim() || ''
        continue
      }
      const tl = text.toLowerCase()
      if (!venue && (tl.includes('stadion') || tl.includes('areena') || tl.includes('arena') || tl.includes('kenttä') || tl.includes('puisto') || tl.startsWith('raatti'))) {
        venue = text.split(',')[0].trim()
      }
    }

    if (!gameDate || !homeTeam || gameDate <= now) continue
    if (!homeTeam.toUpperCase().includes('TPS') && !awayTeam.toUpperCase().includes('TPS')) continue

    const isHome = homeTeam.toUpperCase().includes('TPS')
    const opponent = isHome ? awayTeam : homeTeam
    const rowText = row.textContent
    const competition = rowText.includes('Veikkausliiga') ? 'Veikkausliiga' :
                        rowText.includes('Kansallinen Ykkönen') ? 'Kansallinen Ykkönen' :
                        rowText.includes('Cup') ? 'Cup' : 'FC TPS'

    games.push({ date: gameDate, opponent, isHome, venue: venue || (isHome ? 'Veritas Stadion' : ''), competition })
  }

  return games.sort((a, b) => a.date - b.date)
}

function parseInterMatchLi(li, dateRe) {
  const fullText = li.textContent
  const dm = fullText.match(dateRe)
  if (!dm) return null
  const date = new Date(+dm[3], +dm[2] - 1, +dm[1], +dm[4], +dm[5])

  let home = null, away = null
  for (const p of li.querySelectorAll('p')) {
    const spans = p.querySelectorAll(':scope > span')
    if (spans.length !== 3) continue
    const middle = spans[1].textContent.trim().toLowerCase()
    if (middle !== 'vs.' && middle !== 'vs') continue
    home = spans[0].textContent.trim()
    away = spans[2].textContent.trim()
    if (home && away) break
  }
  if (!home || !away) return null

  let venue = null
  for (const s of li.querySelectorAll('span')) {
    if (s.children.length > 0) continue
    const t = s.textContent.trim()
    if (!t || t.length > 60) continue
    if (dateRe.test(t)) continue
    if (/^vs\.?$/i.test(t) || /^edustus$/i.test(t) || /^lisätiedot$/i.test(t)) continue
    if (t === home || t === away) continue
    venue = t
    break
  }

  const isHome = home.toLowerCase().includes('inter')
  return { date, opponent: isHome ? away : home, isHome, venue }
}

function parseFcInterHtml(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const games = []
  const now = new Date()
  const DATE_RE = /(\d{2})\.(\d{2})\.(\d{4}),\s*KLO:\s*(\d{2}):(\d{2})/

  let upcomingList = null
  for (const h of doc.querySelectorAll('h1, h2, h3, h4')) {
    if (h.textContent.trim().toLowerCase().startsWith('tulevat')) {
      let el = h.nextElementSibling
      while (el && el.tagName !== 'UL') el = el.nextElementSibling
      upcomingList = el
      break
    }
  }
  if (!upcomingList) return []

  for (const li of upcomingList.children) {
    if (li.tagName !== 'LI') continue
    const game = parseInterMatchLi(li, DATE_RE)
    if (!game || game.date <= now) continue
    games.push(game)
  }
  return games.sort((a, b) => a.date - b.date)
}

// --- Helpers ---

function fcVenueLabel(isHome, opponent) {
  const opp = (opponent || '').toLowerCase()
  if (opp.includes('inter') || opp.includes('tps')) return 'paikallispeli'
  return isHome ? 'koti' : 'vieraspeli'
}

function hcVenueLabel(isHome) {
  return isHome ? 'kotiottellu' : 'vierasottelu'
}

function matchColorScheme(game) {
  const opp = (game.opponent || '').toLowerCase()
  const isDerby = (game.team === 'inter' && opp.includes('tps')) ||
                  (game.team !== 'inter' && opp.includes('inter'))
  if (isDerby) return { border: '#ff4a6a', badgeBg: 'rgba(255, 74, 106, 0.18)', badgeText: '#ff8095' }
  if (game.isHome) return { border: '#4ade80', badgeBg: 'rgba(74, 222, 128, 0.18)', badgeText: '#4ade80' }
  return { border: '#60a5fa', badgeBg: 'rgba(96, 165, 250, 0.18)', badgeText: '#93c5fd' }
}

function leagueLabel(game) {
  if (game.team === 'hc') return 'LIIGA'
  if (game.team === 'naiset') return 'KANSALLINEN YKKÖNEN'
  if (game.competition === 'Cup') return 'SUOMEN CUP'
  return 'VEIKKAUSLIIGA'
}

function leagueBadgeColors(game) {
  if (game.team === 'hc') return { bg: 'rgba(30, 136, 229, 0.18)', text: '#5dabe5' }
  if (game.team === 'naiset') return { bg: 'rgba(55, 42, 149, 0.22)', text: '#b3a8f5' }
  if (game.competition === 'Cup') return { bg: 'rgba(68, 161, 41, 0.18)', text: '#7dd362' }
  return { bg: 'rgba(212, 160, 23, 0.18)', text: '#d4a017' }
}

function venueLabelFor(game) {
  const isHc = game.team === 'hc'
  const raw = isHc ? hcVenueLabel(game.isHome) : fcVenueLabel(game.isHome, game.opponent)
  return raw.charAt(0).toUpperCase() + raw.slice(1)
}

function teamNameFor(game) {
  if (game.team === 'hc') return 'HC TPS'
  if (game.team === 'inter') return 'FC Inter'
  if (game.team === 'naiset') return 'FC TPS Naiset'
  return 'FC TPS'
}

function teamShortNameFor(game) {
  return game.team === 'inter' ? 'Inter' : 'TPS'
}

// --- Sub-components ---

function NextGameCard({ game }) {
  const isHc = game.team === 'hc'
  const gameDate = isHc ? game.start : game.date
  const colors = matchColorScheme(game)

  return (
    <FeatureMatchCard
      teamName={teamNameFor(game)}
      teamShortName={teamShortNameFor(game)}
      opponent={game.opponent}
      isHome={game.isHome}
      date={gameDate}
      leagueLabel={leagueLabel(game)}
      leagueColors={leagueBadgeColors(game)}
      borderColor={colors.border}
      venueLabel={venueLabelFor(game)}
    />
  )
}

const WEEKDAYS_LONG = ['Sunnuntai', 'Maanantai', 'Tiistai', 'Keskiviikko', 'Torstai', 'Perjantai', 'Lauantai']

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function GameListItem({ game }) {
  const isHc = game.team === 'hc'
  const gameDate = isHc ? game.start : game.date
  const venueStr = isHc ? (game.location || 'Veritas Areena') : game.venue
  const venueLabel = capitalize(isHc ? hcVenueLabel(game.isHome) : fcVenueLabel(game.isHome, game.opponent))
  const colors = matchColorScheme(game)
  const badge = leagueBadgeColors(game)
  const teamShort = teamShortNameFor(game)

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const gameDay = new Date(gameDate)
  gameDay.setHours(0, 0, 0, 0)
  const days = Math.round((gameDay - today) / 86400000)
  const dateLabel = days === 0 ? 'Tänään' : days === 1 ? 'Huomenna'
    : `${WEEKDAYS_LONG[gameDate.getDay()]} ${gameDate.getDate()}.${gameDate.getMonth() + 1}.`
  const countdown = days === 0 ? 'tänään' : days === 1 ? 'huomenna' : `${days} pv`
  const timeStr = `${String(gameDate.getHours()).padStart(2,'0')}.${String(gameDate.getMinutes()).padStart(2,'0')}`
  const title = game.isHome ? `${teamShort} – ${game.opponent}` : `${game.opponent} – ${teamShort}`

  return (
    <div className="next-match-card" style={{ borderLeftColor: colors.border }}>
      <div className="next-match-meta">
        <span className="next-match-badge" style={{ background: badge.bg, color: badge.text }}>
          {leagueLabel(game)}
        </span>
        <span className="next-match-date">{dateLabel}</span>
        <span className="next-match-countdown">{countdown}</span>
      </div>
      <div className="next-match-body">
        <div className="next-match-info">
          <div className="next-match-title">{title}</div>
          <div className="next-match-venue">{venueStr ? `${venueStr} · ${venueLabel}` : venueLabel}</div>
        </div>
        <div className="next-match-time">
          <span className="next-match-time-label">klo</span>
          <span className="next-match-time-value">{timeStr}</span>
        </div>
      </div>
    </div>
  )
}

function SeasonEndedCard() {
  return (
    <div className="season-ended-card">
      <div className="season-ended-header">
        <span className="ng-dot hc" />
        <span>HC TPS · KAUSI PÄÄTTYI</span>
      </div>
      <p className="season-ended-text">
        Liiga-kausi alkaa jälleen syyskuussa. Harjoituspelit elokuussa.
      </p>
    </div>
  )
}

// --- Main ---

export default function PageOttelut() {
  const cached = useRef(readCachedTpsList())
  const [tab, setTab] = useState('all')
  const [hcGames, setHcGames] = useState(cached.current.hc)
  const [fcGames, setFcGames] = useState(cached.current.fc)
  const [interGames, setInterGames] = useState(cached.current.inter)
  const [naisetGames, setNaisetGames] = useState(cached.current.naiset)
  const [fcCupGames, setFcCupGames] = useState(cached.current.fcCup)
  const [hcLoading, setHcLoading] = useState(true)
  const [fcLoading, setFcLoading] = useState(true)
  const [interLoading, setInterLoading] = useState(true)
  const [naisetLoading, setNaisetLoading] = useState(true)
  const [fcCupLoading, setFcCupLoading] = useState(true)

  useEffect(() => {
    function persist() {
      writeCachedTpsList(cached.current)
    }

    fetchWithTimeout(HC_URL)
      .then(r => r.text())
      .then(text => {
        const parsed = parseHcTpsIcs(text)
        setHcGames(parsed)
        cached.current.hc = parsed
        persist()
      })
      .catch(() => setHcGames([]))
      .finally(() => setHcLoading(false))

    fetchWithTimeout(FC_URL)
      .then(r => r.text())
      .then(html => {
        const parsed = parseFcTpsHtml(html)
        setFcGames(parsed)
        cached.current.fc = parsed
        persist()
      })
      .catch(() => setFcGames([]))
      .finally(() => setFcLoading(false))

    fetchWithTimeout(INTER_URL)
      .then(r => r.text())
      .then(html => {
        const parsed = parseFcInterHtml(html)
        setInterGames(parsed)
        cached.current.inter = parsed
        persist()
      })
      .catch(() => setInterGames([]))
      .finally(() => setInterLoading(false))

    fetchWithTimeout(FC_NAISET_URL)
      .then(r => r.text())
      .then(html => {
        const parsed = parseFcTpsHtml(html)
        setNaisetGames(parsed)
        cached.current.naiset = parsed
        persist()
      })
      .catch(() => setNaisetGames([]))
      .finally(() => setNaisetLoading(false))

    fetchWithTimeout(FC_CUP_URL)
      .then(r => r.text())
      .then(html => {
        const parsed = parseFcTpsHtml(html)
        setFcCupGames(parsed)
        cached.current.fcCup = parsed
        persist()
      })
      .catch(() => setFcCupGames([]))
      .finally(() => setFcCupLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const hcUpcoming = hcGames || []
  const fcUpcoming = fcGames || []
  const interUpcoming = interGames || []
  const naisetUpcoming = naisetGames || []
  const fcCupUpcoming = fcCupGames || []

  const hcArr = hcUpcoming.map(g => ({ ...g, team: 'hc', sortDate: g.start }))
  const fcArr = [...fcUpcoming, ...fcCupUpcoming]
    .map(g => ({ ...g, team: 'fc', sortDate: g.date }))
    .sort((a, b) => a.sortDate - b.sortDate)
  const interArr = interUpcoming.map(g => ({ ...g, team: 'inter', sortDate: g.date }))
  const naisetArr = naisetUpcoming.map(g => ({ ...g, team: 'naiset', sortDate: g.date }))

  const visibleGames = (() => {
    if (tab === 'hc') return hcArr
    if (tab === 'fc') return fcArr
    if (tab === 'inter') return interArr
    if (tab === 'naiset') return naisetArr
    return [...hcArr, ...fcArr, ...interArr, ...naisetArr].sort((a, b) => a.sortDate - b.sortDate)
  })()

  const nextGames = tab === 'all'
    ? [hcArr[0], fcArr[0], interArr[0], naisetArr[0]].filter(Boolean).sort((a, b) => a.sortDate - b.sortDate)
    : visibleGames.slice(0, 1)

  const nextSet = new Set(nextGames)
  const upcomingGames = visibleGames.filter(g => !nextSet.has(g))
  const nextLabel = nextGames.length > 1 ? 'SEURAAVAT OTTELUT' : 'SEURAAVA OTTELU'
  const loading = hcLoading || fcLoading || interLoading || naisetLoading || fcCupLoading
  const showSeasonEnded = !hcLoading && hcUpcoming.length === 0 && (tab === 'all' || tab === 'hc')

  return (
    <div className="page-tps">
      <PageHeader title="Ottelut" />

      <div className="tps-tabs">
        <button className={`tps-tab${tab === 'all' ? ' active' : ''}`} onClick={() => setTab('all')}>Kaikki</button>
        <button className={`tps-tab${tab === 'hc' ? ' active' : ''}`} onClick={() => setTab('hc')}>
          <span className="tab-dot hc" />HC TPS
        </button>
        <button className={`tps-tab${tab === 'fc' ? ' active' : ''}`} onClick={() => setTab('fc')}>
          <span className="tab-dot fc" />FC TPS
        </button>
        <button className={`tps-tab${tab === 'inter' ? ' active' : ''}`} onClick={() => setTab('inter')}>
          <span className="tab-dot inter" />FC Inter
        </button>
        <button className={`tps-tab${tab === 'naiset' ? ' active' : ''}`} onClick={() => setTab('naiset')}>
          <span className="tab-dot naiset" />FC TPS Naiset
        </button>
      </div>

      {loading && nextGames.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
          {[1, 2, 3].map(i => <div key={i} className="skeleton-row" style={{ height: 60 }} />)}
        </div>
      ) : (
        <>
          {nextGames.length > 0 && (
            <>
              <div className="tps-section-label">{nextLabel}</div>
              <div className="next-match-list">
                {nextGames.map((g, i) => <NextGameCard key={i} game={g} />)}
              </div>
            </>
          )}

          {upcomingGames.length > 0 && (
            <div className="tps-upcoming">
              <div className="tps-upcoming-header">
                <span className="tps-upcoming-title">Tulevat ottelut</span>
                <span className="tps-upcoming-count">{upcomingGames.length} ottelua</span>
              </div>
              <div className="next-match-list">
                {upcomingGames.map((game, i) => (
                  <GameListItem key={i} game={game} />
                ))}
              </div>
            </div>
          )}

          {showSeasonEnded && <SeasonEndedCard />}
        </>
      )}
    </div>
  )
}
