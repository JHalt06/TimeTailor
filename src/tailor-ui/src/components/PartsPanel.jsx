import { useEffect, useMemo, useState } from 'react'
import Card from './Card'
import Button from './Button'
import Tabs from './Tabs'
import { api } from '../utils/api'

const TYPES = ['movements', 'cases', 'dials', 'straps', 'hands', 'crowns']

export default function PartsPanel({ selection, onPick }) {
  const [tab, setTab] = useState('dials')
  const [view, setView] = useState('parts') // parts | buy
  const [items, setItems] = useState([])

  const selectedId = selection?.[tab]?.id ?? selection?.[tab]?.ID ?? null

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = await api(`/api/parts/${tab}`)
        if (!cancelled) setItems(Array.isArray(data) ? data : [])
      } catch {
        if (!cancelled) setItems([])
      }
    })()
    return () => { cancelled = true }
  }, [tab])

  const tabItems = useMemo(
    () => TYPES.map(t => ({ value: t, label: t })),
    []
  )

  return (
    <Card className="lg:sticky lg:top-24">
      <div className="flex items-center justify-between gap-3 mb-4">
        <Tabs value={tab} onChange={setTab} items={tabItems} />
        <Tabs
          value={view}
          onChange={setView}
          items={[
            { value: 'parts', label: 'Parts' },
            { value: 'buy', label: 'Buy Links' },
          ]}
        />
      </div>

      {view === 'parts' ? (
        <ul className="grid sm:grid-cols-2 gap-3">
          {items.map(it => {
            const pk = it?.id ?? it?.ID
            const active = Number(selectedId) === Number(pk)
            const price = Number(it?.price ?? 0)

            return (
              <li
                key={pk ?? JSON.stringify(it)}
                className={`rounded-2xl border p-3 transition bg-white ${
                  active
                    ? 'border-blue-400 ring-2 ring-blue-200'
                    : 'border-gray-300 hover:shadow-md'
                }`}
              >
                <div className="flex gap-3">
                  <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 grid place-items-center text-[11px] text-gray-500">
                    Img
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">
                      {(it?.brand ?? 'Unknown')} {(it?.model ?? '')}
                    </div>
                    <div className="text-xs text-gray-600">
                      ${price.toFixed(2)}
                    </div>

                    <div className="mt-2">
                      {active ? (
                        <span className="inline-flex items-center text-xs px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                          ✓ Selected
                        </span>
                      ) : (
                        <Button size="sm" onClick={() => onPick(tab, it)}>
                          Select
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            )
          })}
          {items.length === 0 && (
            <div className="text-sm text-gray-500">No items yet.</div>
          )}
        </ul>
      ) : (
        <div className="text-sm text-gray-600">
          Buy links view placeholder — show affiliate/product links for the selected {tab}.
        </div>
      )}
    </Card>
  )
}
