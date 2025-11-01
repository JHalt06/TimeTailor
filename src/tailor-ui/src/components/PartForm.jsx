import Card from './Card'
import { PART_TYPES, COMMON_FIELDS, TYPE_FIELDS } from '../utils/partFields'

const Input = ({ field, value, onChange }) => {
  const base = "w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
  if (field.type === 'textarea') {
    return (
      <textarea
        rows="4"
        className={base}
        value={value || ""}
        placeholder={field.placeholder || ""}
        onChange={e => onChange(field.name, e.target.value)}
      />
    )
  }
  if (field.type === 'select') {
    return (
      <select
        className={base}
        value={value || ""}
        onChange={e => onChange(field.name, e.target.value)}
      >
        <option value="">Select…</option>
        {field.options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    )
  }
  return (
    <input
      className={base}
      type={field.type || 'text'}
      step={field.step}
      min={field.min}
      value={value ?? ""}
      placeholder={field.placeholder || ""}
      onChange={e => onChange(field.name, field.type === 'number' ? (e.target.value === "" ? "" : Number(e.target.value)) : e.target.value)}
      required={!!field.required}
    />
  )
}

export default function PartForm({ type, form, setForm }) {
  const fields = [
    ...COMMON_FIELDS,
    ...(TYPE_FIELDS[type] || []),
  ]

  const onChange = (name, val) => setForm(prev => ({ ...prev, [name]: val }))

  return (
    <Card>
      <div className="flex flex-wrap gap-3 items-center mb-3">
        <label className="text-sm font-medium">Part Type</label>
        <select
          className="rounded-xl border border-gray-300 px-3 py-2 text-sm"
          value={type}
          onChange={e => setForm(prev => ({ ...prev, __type: e.target.value }))}
        >
          {PART_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {fields.map((f) => (
          <div key={f.name}>
            <label className="block text-sm font-medium mb-1">{f.label}</label>
            <Input field={f} value={form[f.name]} onChange={onChange} />
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-2xl bg-gray-50 border border-gray-200 p-3 text-xs text-gray-600">
        <div className="font-semibold mb-1">Preview payload</div>
        <pre className="whitespace-pre-wrap break-all">
{JSON.stringify({ part_type: type, ...form }, null, 2)}
        </pre>
      </div>
    </Card>
  )
}
