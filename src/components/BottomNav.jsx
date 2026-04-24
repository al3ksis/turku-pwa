import './BottomNav.css'

const TABS = [
  { id: 'home', label: 'Etusivu', accent: '#4a9eff' },
  { id: 'bus',  label: 'Bussit',  accent: '#4eff9f' },
  { id: 'news', label: 'Uutiset', accent: '#4a9eff' },
  { id: 'tps',  label: 'TPS',     accent: '#ffcc00' },
]

const Icons = {
  home: (filled) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1h-5v-6h-6v6H4a1 1 0 01-1-1v-9.5z"
        stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"
        fill={filled ? 'currentColor' : 'none'} />
    </svg>
  ),
  bus: (filled) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="4" width="16" height="14" rx="2.5"
        stroke="currentColor" strokeWidth="1.8"
        fill={filled ? 'currentColor' : 'none'} />
      <path d="M4 11h16" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="8" cy="15" r="1.2" fill={filled ? '#000' : 'currentColor'} />
      <circle cx="16" cy="15" r="1.2" fill={filled ? '#000' : 'currentColor'} />
      <path d="M7 18v2M17 18v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
  news: (filled) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2"
        stroke="currentColor" strokeWidth="1.8"
        fill={filled ? 'currentColor' : 'none'} />
      <path d="M7 9h7M7 12h10M7 15h6"
        stroke={filled ? '#000' : 'currentColor'} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  tps: (filled) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.57a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.57a2 2 0 0 0-1.34-2.23z"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
        fill={filled ? 'currentColor' : 'none'} />
    </svg>
  ),
}

export default function BottomNav({ activeTab, onTabChange }) {
  return (
    <nav className="bottom-nav" aria-label="Päätabs">
      {TABS.map((tab) => {
        const active = tab.id === activeTab
        return (
          <button
            key={tab.id}
            className={`bottom-nav-tab${active ? ' active' : ''}`}
            style={active ? { '--tab-accent': tab.accent, '--tab-pill-bg': tab.accent + '1f' } : undefined}
            onClick={() => onTabChange(tab.id)}
            aria-current={active ? 'page' : undefined}
          >
            <span className="bottom-nav-pill">
              {Icons[tab.id](active)}
            </span>
            <span className="bottom-nav-label">{tab.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
