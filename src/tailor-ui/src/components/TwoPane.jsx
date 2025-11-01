export default function TwoPane({ left, right }) {
  return (
    <div className="mx-auto max-w-7xl p-4 lg:p-6 grid gap-6 grid-cols-1 lg:grid-cols-2">
      <div className="flex flex-col gap-4">{left}</div>
      <div className="flex flex-col gap-4">{right}</div>
    </div>
  )
}
