import './PageHeader.css'

export function TurkuMark() {
  return (
    <div className="turku-mark">
      <span className="turku-mark-dot" aria-hidden="true" />
      Turku
    </div>
  )
}

export function PageHeader({ title, subtitle, right }) {
  return (
    <header className="page-header">
      <div className="page-header-row">
        <TurkuMark />
        {right}
      </div>
      <h1 className="page-header-h1">{title}</h1>
      {subtitle && <p className="page-header-subtitle">{subtitle}</p>}
    </header>
  )
}
