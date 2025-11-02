import { NavLink, Link, useLocation } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import Avatar from './Avatar';
import Button from './Button';
import { useAuth } from '../hooks/useAuth';

const linkBase =
  'inline-flex items-center px-3 py-2 rounded-xl text-sm font-medium transition';
const linkInactive = 'text-gray-700 hover:text-blue-700 hover:bg-gray-100';
const linkActive = 'text-white bg-blue-600';

function NavItem({ to, children, end = false }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `${linkBase} ${isActive ? linkActive : linkInactive}`
      }
    >
      {children}
    </NavLink>
  );
}

export default function Header() {
  const { user, login, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);
  const loc = useLocation();

  // Close mobile panel on route change
  useEffect(() => setOpen(false), [loc.pathname]);

  // Click-outside + ESC to close panel
  useEffect(() => {
    function onDocClick(e) {
      if (open && panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    function onEsc(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white/70 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 py-3 flex items-center gap-4">
        {/* Mobile menu button */}
        <button
          className="sm:hidden -ml-1 p-2 rounded-lg border border-gray-300 bg-white"
          onClick={() => setOpen((o) => !o)}
          aria-label="Open menu"
          aria-expanded={open}
        >
          <span className="block w-5 h-0.5 bg-gray-800 mb-1" />
          <span className="block w-5 h-0.5 bg-gray-800 mb-1" />
          <span className="block w-5 h-0.5 bg-gray-800" />
        </button>

        <Link to="/" className="font-extrabold tracking-tight text-gray-900">
          TimeTailor
        </Link>

        {/* Desktop nav */}
        <nav className="ml-4 hidden sm:flex gap-2">
          <NavItem to="/" end>Home</NavItem>
          {user ? (
            <>
              <NavItem to="/upload">Upload</NavItem>
              <NavItem to="/profile">Profile</NavItem>
            </>
          ) : (
            <NavItem to="/login">Sign in</NavItem>
          )}
        </nav>

        {/* Right side auth */}
        <div className="ml-auto flex items-center gap-3">
          {user ? (
            <>
              <Avatar src={user.avatar_url} name={user.display_name} />
              <span className="hidden sm:inline text-sm text-gray-800">
                {user.display_name}
              </span>
              <Button variant="outline" size="sm" onClick={logout}>
                Logout
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={() => login('/')}>
              Sign in with Google
            </Button>
          )}
        </div>
      </div>

      {/* Mobile sheet */}
      {open && (
        <>
          {/* Put the dimmer **under** the panel by z-index so links are clickable */}
          <div className="fixed inset-0 z-40 bg-black/20 sm:hidden" onClick={() => setOpen(false)} />
          <div
            ref={panelRef}
            className="sm:hidden fixed left-0 right-0 top-16 z-50 border-b border-gray-200 bg-white shadow-lg"
          >
            <div className="mx-auto max-w-7xl px-4 py-3 flex flex-col gap-2 text-sm">
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  `${linkBase} ${isActive ? linkActive : linkInactive}`
                }
              >
                Home
              </NavLink>

              {user ? (
                <>
                  <NavLink
                    to="/upload"
                    className={({ isActive }) =>
                      `${linkBase} ${isActive ? linkActive : linkInactive}`
                    }
                  >
                    Upload
                  </NavLink>
                  <NavLink
                    to="/profile"
                    className={({ isActive }) =>
                      `${linkBase} ${isActive ? linkActive : linkInactive}`
                    }
                  >
                    Profile
                  </NavLink>
                  <button
                    className="text-left px-3 py-2 rounded-xl text-sm text-gray-800 hover:bg-gray-100"
                    onClick={logout}
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <NavLink
                    to="/login"
                    className={({ isActive }) =>
                      `${linkBase} ${isActive ? linkActive : linkInactive}`
                    }
                  >
                    Sign in
                  </NavLink>
                  <button
                    className="text-left px-3 py-2 rounded-xl text-sm text-blue-700 hover:bg-blue-50"
                    onClick={() => login('/')}
                  >
                    Sign in with Google
                  </button>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </header>
  );
}
