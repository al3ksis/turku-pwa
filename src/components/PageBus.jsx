import { PageHeader } from './PageHeader'
import BusWidget from './BusWidget'

export default function PageBus() {
  return (
    <div>
      <PageHeader title="Bussit" subtitle="Föli · Turun seutu" />
      <BusWidget />
    </div>
  )
}
