import { Link, useLocation } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import Avatar from './Avatar'
import Button from './Button'
import { useAuth } from '../hooks/useAuth'

export default function Header() {
  const { user, login, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const panelRef = useRef(null)
  const loc = useLocation()

  // Close menu when route changes
  useEffect(() => { setOpen(false) }, [loc.pathname])

  // Click-outside & ESC to close
  useEffect(() => {
    function onDocClick(e) {
      if (open && panelRef.current && !panelRef.current.contains(e.target)) setOpen(false)
    }
    function onEsc(e) { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onEsc)
    }
  }, [open])

  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-200 bg-white/70 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 py-3 flex items-center gap-4">
        {/* Mobile menu button */}
        <button
          className="sm:hidden -ml-1 p-2 rounded-lg border border-gray-300 bg-white"
          onClick={() => setOpen(o => !o)}
          aria-label="Open menu"
          aria-expanded={open}
        >
          <span className="block w-5 h-0.5 bg-gray-800 mb-1"></span>
          <span className="block w-5 h-0.5 bg-gray-800 mb-1"></span>
          <span className="block w-5 h-0.5 bg-gray-800"></span>
        </button>

        <Link to="/" className="font-extrabold tracking-tight text-gray-900">
          TimeTailor
        </Link>

        {/* Desktop nav */}
        <nav className="ml-4 hidden sm:flex gap-4 text-sm">
          <Link to="/" className="text-gray-700 hover:text-blue-700">Home</Link>
          {user && <Link to="/upload" className="text-gray-700 hover:text-blue-700">Upload</Link>}
          {user && <Link to="/profile" className="text-gray-700 hover:text-blue-700">Profile</Link>}
        </nav>

        {/* Right side auth */}
        <div className="ml-auto flex items-center gap-3">
          {user ? (
            <>
              <Avatar src={user.avatar_url} name={user.display_name} />
              <span className="hidden sm:inline text-sm text-gray-800">{user.display_name}</span>
              <Button variant="outline" onClick={logout} size="sm">Logout</Button>
            </>
          ) : (
            <Button onClick={() => login('/')} size="sm">Sign in with Google</Button>
          )}
        </div>
      </div>

      {/* Mobile dropdown panel */}
      {open && (
        <>
          {/* dim background; click to close */}
          <div className="fixed inset-0 bg-black/20 sm:hidden" onClick={() => setOpen(false)} />
          <div
            ref={panelRef}
            className="sm:hidden absolute left-0 right-0 top-full border-b border-gray-200 bg-white shadow-lg"
          >
            <div className="mx-auto max-w-7xl px-4 py-3 flex flex-col gap-2 text-sm">
              <Link className="py-1 text-gray-800" to="/">Home</Link>
              {user && <Link className="py-1 text-gray-800" to="/upload">Upload</Link>}
              {user && <Link className="py-1 text-gray-800" to="/profile">Profile</Link>}

              <div className="pt-2 mt-1 border-t border-gray-100">
                {user ? (
                  <button className="py-1 text-left text-gray-800" onClick={logout}>Logout</button>
                ) : (
                  <button className="py-1 text-left text-blue-700" onClick={() => login('/')}>Sign in</button>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </header>
  )
}
