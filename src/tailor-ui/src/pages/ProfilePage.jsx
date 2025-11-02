import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../utils/api'
import Card from '../components/Card'
import Button from '../components/Button'
import ProtectedRoute from '../components/ProtectedRoute'
import { useAuth } from '../hooks/useAuth'

const ORDER = ['movements','cases','dials','straps','hands','crowns']
const LABEL = {
  movements: 'Movements',
  cases: 'Cases',
  dials: 'Dials',
  straps: 'Straps',
  hands: 'Hands',
  crowns: 'Crowns'
}

function PartCard({ type, item, onDelete, onEdit }) {
  const price = Number(item?.price ?? 0)
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-3 flex gap-3">
      <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 grid place-items-center overflow-hidden">
        {item?.image_url
          ? <img src={item.image_url} alt="" className="h-16 w-16 object-cover" />
          : <span className="text-[11px] text-gray-500">No image</span>}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">
          {(item?.brand ?? 'Unknown')} {(item?.model ?? '')}
        </div>
        <div className="text-xs text-gray-600">${price.toFixed(2)}</div>
        <div className="mt-2 flex gap-2">
          <Button size="sm" onClick={() => onEdit(type, item.id)}>Edit</Button>
          <Button size="sm" variant="outline" onClick={() => onDelete(type, item.id)}>Delete</Button>
        </div>
      </div>
    </div>
  )
}

function ProfileInner() {
  const { user, refresh } = useAuth()
  const [displayName, setDisplayName] = useState(user?.display_name || "")
  const [bio, setBio] = useState("")
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState("")
  const [mine, setMine] = useState(null)
  const [loadingParts, setLoadingParts] = useState(true)
  const [errorParts, setErrorParts] = useState("")
  const navigate = useNavigate()

  useEffect(() => {
    async function load() {
      const me = await api('/api/profile')
      setDisplayName(me.display_name || "")
      setBio(me.bio || "")
    }
    load()
  }, [])

  useEffect(() => {
    let cancelled = false
    async function loadParts() {
      setLoadingParts(true)
      setErrorParts("")
      try {
        const data = await api('/api/parts/mine')
        if (!cancelled) setMine(data)
      } catch (e) {
        if (!cancelled) setErrorParts(e.message || 'Failed to load parts')
      } finally {
        if (!cancelled) setLoadingParts(false)
      }
    }
    loadParts()
    return () => { cancelled = true }
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
      setStatus(`Error: ${e.message || 'saving profile'}`)
    } finally {
      setSaving(false)
    }
  }

  const onDelete = async (type, id) => {
    if (!window.confirm('Delete this part? This cannot be undone.')) return
    try {
      await api(`/api/parts/${type}/${id}`, { method: 'DELETE' })
      setMine(prev => {
        const next = { ...(prev || {}) }
        next[type] = (next[type] || []).filter(x => Number(x.id) !== Number(id))
        return next
      })
    } catch (e) {
      alert(`Delete failed: ${e.message || e}`)
    }
  }

  const onEdit = (type, id) => {
    // Send to uploader in edit mode
    navigate(`/upload?type=${encodeURIComponent(type)}&id=${encodeURIComponent(id)}`)
  }

  return (
    <div className="mx-auto max-w-6xl p-6">
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

      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-3">Your uploaded parts</h2>
        {loadingParts && <div className="p-4 text-sm">Loading…</div>}
        {errorParts && <div className="p-4 text-sm text-red-600">{errorParts}</div>}
        {!loadingParts && mine && ORDER.map((t) => (
          <div key={t} className="mb-6">
            <div className="text-sm font-semibold mb-2">{LABEL[t]}</div>
            {mine[t]?.length ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {mine[t].map(item => (
                  <PartCard
                    key={item.id}
                    type={t}
                    item={item}
                    onDelete={onDelete}
                    onEdit={onEdit}
                  />
                ))}
              </div>
            ) : (
              // 🔧 FIX: use toLowerCase() instead of .lowercase (which is undefined and crashes)
              <Card className="text-sm text-gray-600">No {LABEL[t].toLowerCase()} yet.</Card>
            )}
          </div>
        ))}
      </div>
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
