import { useState, useEffect } from 'react'
import { PageHeader } from './PageHeader'
import BusWidget from './BusWidget'

export default function PageBus({ initialEditing = false, onConsumeInitial }) {
  const [editing, setEditing] = useState(initialEditing)

  useEffect(() => {
    if (initialEditing && onConsumeInitial) onConsumeInitial()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
