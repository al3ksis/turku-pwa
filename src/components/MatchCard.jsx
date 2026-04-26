import './MatchCard.css'

const WEEKDAYS_SHORT = ['SU', 'MA', 'TI', 'KE', 'TO', 'PE', 'LA']
const MONTH_ABBR = ['TAMMI', 'HELMI', 'MAALIS', 'HUHTI', 'TOUKO', 'KESÄ', 'HEINÄ', 'ELO', 'SYYS', 'LOKA', 'MARRAS', 'JOULU']

function ClockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="feature-match-clock">
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 4.5 V8 L10.5 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function FeatureMatchCard({
  teamName,
  opponent,
  isHome,
  date,
  leagueLabel,
  leagueColors,
  borderColor,
  venueLabel,
}) {
  const weekday = WEEKDAYS_SHORT[date.getDay()]
  const day = date.getDate()
  const month = MONTH_ABBR[date.getMonth()]
  const timeStr = `${String(date.getHours()).padStart(2, '0')}.${String(date.getMinutes()).padStart(2, '0')}`
  const matchTitle = isHome ? `TPS – ${opponent}` : `${opponent} – TPS`

  return (
    <div className="feature-match-card" style={{ borderLeftColor: borderColor }}>
      <div className="feature-match-date">
        <span className="feature-match-date-weekday">{weekday}</span>
        <span className="feature-match-date-day">{day}.</span>
        <span className="feature-match-date-month">{month}</span>
      </div>
      <div className="feature-match-content">
        <div className="feature-match-meta">
          <span className="feature-match-team">{teamName}</span>
          <span className="feature-match-meta-sep"> · </span>
          <span
            className="feature-match-league"
            style={{ background: leagueColors.bg, color: leagueColors.text }}
          >
            {leagueLabel}
          </span>
        </div>
        <div className="feature-match-title">{matchTitle}</div>
        <div className="feature-match-info">
          <ClockIcon />
          <span className="feature-match-time">klo {timeStr}</span>
          <span className="feature-match-info-sep"> · </span>
          <span className="feature-match-venue">{venueLabel}</span>
        </div>
      </div>
    </div>
  )
}
