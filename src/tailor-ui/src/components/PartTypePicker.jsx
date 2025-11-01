import Card from './Card'
import Button from './Button'
import { PART_TYPES } from '../utils/partFields'

export default function PartTypePicker({ onPick }) {
  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-bold mb-4">What are you uploading?</h1>
      <Card>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {PART_TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => onPick(t.value)}
              className="rounded-2xl border border-gray-200 p-5 text-left hover:shadow-md bg-white"
            >
              <div className="text-base font-semibold">{t.label}</div>
              <div className="mt-1 text-sm text-gray-600">{t.value}</div>
            </button>
          ))}
        </div>
        <div className="mt-4 text-sm text-gray-500">
          You can change this later from the dropdown on the next step.
        </div>
      </Card>
      <div className="mt-6">
        <Button variant="subtle" onClick={() => onPick('dials')}>Skip — start with Dial</Button>
      </div>
    </div>
  )
}
