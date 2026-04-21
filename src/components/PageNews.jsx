import { PageHeader } from './PageHeader'
import NewsWidget from './NewsWidget'

export default function PageNews() {
  return (
    <div>
      <PageHeader title="Uutiset" subtitle="Yle Turku" right={<img src="/yle-logo.svg" width={22} height={22} alt="" />} />
      <NewsWidget />
    </div>
  )
}
