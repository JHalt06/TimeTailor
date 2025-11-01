export default function Tabs({ value, onChange, items = [], className = "" }) {
  return (
    <div className={`flex items-center gap-2 overflow-x-auto no-scrollbar ${className}`}>
      {items.map((t) => {
        const active = value === t.value
        return (
          <button
            key={t.value}
            onClick={() => onChange(t.value)}
            className={`px-3 py-1.5 rounded-xl text-sm border transition
              ${active
                ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                : "bg-white border-gray-300 text-gray-800 hover:bg-gray-50"}`}
          >
            {t.label ?? t.value}
          </button>
        )
      })}
    </div>
  )
}
