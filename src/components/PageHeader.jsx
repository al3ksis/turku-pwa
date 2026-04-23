import './PageHeader.css'

function TurkuAbo() {
  return (
    <div className="turku-abo">
      <div className="turku-abo-fi">TURKU</div>
      <div className="turku-abo-sv">ÅBO</div>
    </div>
  )
}

export function PageHeader({ title, subtitle, datetime }) {
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
      <h1 className="page-header-h1">{title}</h1>
      {subtitle && <p className="page-header-subtitle">{subtitle}</p>}
    </header>
  )
}
