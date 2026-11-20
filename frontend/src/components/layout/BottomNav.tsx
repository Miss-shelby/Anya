import { NavLink } from 'react-router-dom';
import { Home, Camera, Clock, Settings } from 'lucide-react';

const NAV_ITEMS = [
  { to: '/home', label: 'Home', icon: Home },
  { to: '/naira', label: 'Camera', icon: Camera },
  { to: '/history', label: 'History', icon: Clock },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export function BottomNav() {
  return (
    <nav
      aria-label="Primary navigation"
      className="border-t border-anya-border bg-white/95 px-3 py-2 backdrop-blur-sm"
    >
      <ul className="grid grid-cols-4 gap-1">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              className={({ isActive }) =>
                `flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-2xl px-2 py-1.5 text-xs font-semibold transition-colors ${
                  isActive
                    ? 'bg-anya-soft text-anya-primary'
                    : 'text-anya-muted hover:bg-anya-bg hover:text-anya-ink'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className="h-5 w-5"
                    strokeWidth={isActive ? 2.4 : 2}
                    aria-hidden="true"
                  />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
