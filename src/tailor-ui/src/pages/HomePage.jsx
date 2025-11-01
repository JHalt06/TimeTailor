import { useState } from 'react'
import TwoPane from '../components/TwoPane'
import WatchCanvas from '../components/WatchCanvas'
import PartsPanel from '../components/PartsPanel'
import Card from '../components/Card'
import Button from '../components/Button'
import { api } from '../utils/api'
import { useAuth } from '../hooks/useAuth'
import { Link } from 'react-router-dom'

export default function HomePage() {
  const { user, login } = useAuth()
  const [selection, setSelection] = useState({
    movements_id: null, cases_id: null, dials_id: null,
    straps_id: null, hands_id: null, crowns_id: null,
  })
  const [saving, setSaving] = useState(false)
  const total = 0 // could compute client-side later from fetched parts

  const onPick = (type, id) => {
    const key = `${type}_id`
    setSelection(prev => ({ ...prev, [key]: id }))
  }

  const saveBuild = async () => {
    if (!user) return login('/profile')
    setSaving(true)
    try {
      await api('/api/builds', { method:'POST', body: selection })
      alert('Saved build!')
    } finally { setSaving(false) }
  }

  return (
    <TwoPane
      left={
        <>
          <WatchCanvas selection={selection} />
          <Card className="mt-4 flex items-center justify-between">
            <div className="text-sm">Estimated total: <strong>${total.toFixed?.(2) ?? total}</strong></div>
            <div className="flex gap-2">
              {!user ? (
                <Button onClick={() => login('/')}>Sign in to Save</Button>
              ) : (
                <Button onClick={saveBuild} disabled={saving}>{saving?'Saving…':'Save Build'}</Button>
              )}
            </div>
          </Card>
        </>
      }
      right={<PartsPanel selection={selection} onPick={onPick} />}
    />
  )
}
