import './PageHeader.css'

function TurkuAbo() {
  return (
    <div className="turku-abo">
      <div className="turku-abo-fi">TURKU</div>
      <div className="turku-abo-sv">ÅBO</div>
    </div>
  )
}

export function PageHeader({ title, subtitle, datetime, action }) {
  return (
    <header className="page-header">
      <div className="page-header-top">
        <TurkuAbo />
        {datetime && (
          <div className="page-header-datetime">
            <div>{datetime.date}</div>
            <div>{datetime.time}</div>
          </div>
        )}
      </div>
      {(title || action) && (
        <div className="page-header-title-row">
          {title && <h1 className="page-header-h1">{title}</h1>}
          {action && <div className="page-header-action">{action}</div>}
        </div>
      )}
      {subtitle && <p className="page-header-subtitle">{subtitle}</p>}
    </header>
  )
}
