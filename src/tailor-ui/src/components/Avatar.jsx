export default function Avatar({ src, name="", size=40 }) {
  const initials = (name || "?").slice(0,1).toUpperCase()
  return src ? (
    <img src={src} alt={name} width={size} height={size}
         className="rounded-full object-cover border border-gray-200" />
  ) : (
    <div style={{width:size, height:size}}
         className="rounded-full bg-gray-200 text-gray-700 grid place-items-center font-semibold">
      {initials}
    </div>
  )
}
