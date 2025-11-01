export default function Card({ children, className = "" }) {
  return (
    <div className={`rounded-3xl border border-gray-200 bg-white/80 shadow-sm p-5 backdrop-blur ${className}`}>
      {children}
    </div>
  )
}
