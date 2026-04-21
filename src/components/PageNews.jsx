import { PageHeader } from './PageHeader'
import NewsWidget from './NewsWidget'

export default function PageNews() {
  return (
    <div>
      <PageHeader title="Uutiset" subtitle="Yle Turku" />
      <NewsWidget />
    </div>
  )
}
