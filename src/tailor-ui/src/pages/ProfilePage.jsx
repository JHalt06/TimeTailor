import { useEffect, useState } from 'react'
import { api } from '../utils/api'
import Card from '../components/Card'
import Button from '../components/Button'
import ProtectedRoute from '../components/ProtectedRoute'
import { useAuth } from '../hooks/useAuth'

function ProfileInner() {
  const { user, refresh } = useAuth()
  const [displayName, setDisplayName] = useState(user?.display_name || "")
  const [bio, setBio] = useState("")
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState("")

  useEffect(() => {
    async function load() {
      const data = await api('/api/profile')
      setDisplayName(data.display_name || "")
      setBio(data.bio || "")
    }
    load()
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setStatus("")
    try {
      await api('/api/profile', { method: 'POST', body: { display_name: displayName, bio } })
      await refresh()
      setStatus("Saved!")
    } catch (e) {
      setStatus("Error saving")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-bold mb-4">Profile</h1>
      <Card>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Display name</label>
            <input
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Bio</label>
            <textarea
              rows="4"
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
              value={bio}
              onChange={e => setBio(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3">
            <Button type="submit" variant="primary">{saving ? "Saving…" : "Save"}</Button>
            {status && <span className="text-sm text-gray-600">{status}</span>}
          </div>
        </form>
      </Card>
    </div>
  )
}

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <ProfileInner />
    </ProtectedRoute>
  )
}
