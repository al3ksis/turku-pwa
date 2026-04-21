import './PageHeader.css'

function TurkuAbo() {
  return (
    <div className="turku-abo">
      <div className="turku-abo-fi">TURKU</div>
      <div className="turku-abo-sv">ÅBO</div>
    </div>
  )
}

export function PageHeader({ title, subtitle }) {
  return (
    <header className="page-header">
      <TurkuAbo />
      <h1 className="page-header-h1">{title}</h1>
      {subtitle && <p className="page-header-subtitle">{subtitle}</p>}
    </header>
  )
}
