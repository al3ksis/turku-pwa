import { useState } from 'react'
import { PageHeader } from './PageHeader'
import BusWidget from './BusWidget'

export default function PageBus() {
  const [editing, setEditing] = useState(false)

  return (
    <div>
      <PageHeader
        title="Bussit"
        subtitle={editing ? 'Föli · Turun seutu · Muokkaustila' : 'Föli · Turun seutu'}
        action={
          <button onClick={() => setEditing(e => !e)}>
            {editing ? 'Valmis' : 'Muokkaa'}
          </button>
        }
      />
      <BusWidget editing={editing} />
    </div>
  )
}
