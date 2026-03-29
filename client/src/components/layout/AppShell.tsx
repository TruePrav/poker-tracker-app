import { Outlet, NavLink } from 'react-router-dom';
import { Home, PlusCircle, Users, History, Trophy, Timer, Database } from 'lucide-react';

const navItems = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/setup', icon: PlusCircle, label: 'New Game' },
  { to: '/blinds', icon: Timer, label: 'Blind Structures' },
  { to: '/players', icon: Users, label: 'Players' },
  { to: '/database', icon: Database, label: 'Database' },
  { to: '/history', icon: History, label: 'History' },
];

export function AppShell() {
  return (
    <div className="flex min-h-screen">
      <aside className="w-56 bg-gray-900 border-r border-gray-800 flex flex-col">
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <Trophy className="w-6 h-6 text-gold" />
            <div>
              <h1 className="text-sm font-bold text-gold">Mahtani</h1>
              <p className="text-xs text-gray-400">Poker Room</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-felt text-white'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-800">
          <p className="text-xs text-gray-600 text-center">Mahtani Poker Room</p>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
