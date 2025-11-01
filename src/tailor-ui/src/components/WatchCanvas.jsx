export default function WatchCanvas({ selection }) {
  const chips = Object.entries(selection)
    .filter(([, v]) => v)
    .map(([k]) => k.replace('_id',''))

  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-6">
      <h2 className="font-semibold mb-3">Watch Builder</h2>
      <p className="text-sm text-gray-600 mb-4">Visual preview placeholder</p>

      {/* checkerboard preview area */}
      <div
        className="relative rounded-2xl border-2 border-dashed border-gray-200 aspect-square
                   bg-[linear-gradient(45deg,#f3f4f6_25%,transparent_25%,transparent_75%,#f3f4f6_75%,#f3f4f6),linear-gradient(45deg,#f3f4f6_25%,transparent_25%,transparent_75%,#f3f4f6_75%,#f3f4f6)]
                   bg-[length:20px_20px] bg-[position:0_0,10px_10px]"
      />

      {/* selection summary */}
      <div className="mt-4 flex flex-wrap gap-2">
        {chips.length === 0 ? (
          <span className="text-xs text-gray-500">No parts selected yet.</span>
        ) : chips.map((c) => (
          <span key={c}
            className="text-xs px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
            {c}
          </span>
        ))}
      </div>
    </div>
  )
}
