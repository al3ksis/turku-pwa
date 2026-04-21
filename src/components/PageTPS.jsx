import { PageHeader } from './PageHeader'
import TPSWidget from './TPSWidget'

export default function PageTPS() {
  return (
    <div>
      <PageHeader title="HC TPS" subtitle="Kiekkoa Turussa" right={<img src="/tps-logo.svg" width={28} height={28} alt="" />} />
      <TPSWidget />
    </div>
  )
}
