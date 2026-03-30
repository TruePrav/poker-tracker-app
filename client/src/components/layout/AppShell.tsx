import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Home, PlusCircle, Users, History, Trophy, Timer, Database, Menu, X } from 'lucide-react';

const navItems = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/setup', icon: PlusCircle, label: 'New Game' },
  { to: '/blinds', icon: Timer, label: 'Blind Structures' },
  { to: '/players', icon: Users, label: 'Players' },
  { to: '/database', icon: Database, label: 'Database' },
  { to: '/history', icon: History, label: 'History' },
];

export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  const handleNavClick = (to: string) => {
    setMobileOpen(false);
    navigate(to);
  };

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-56 bg-gray-900 border-r border-gray-800 flex-col">
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

      {/* Mobile header bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-gold" />
          <span className="text-sm font-bold text-gold">Mahtani Poker Room</span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-30 bg-black/60"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <div
        className={`md:hidden fixed top-0 left-0 bottom-0 z-40 w-64 bg-gray-900 border-r border-gray-800 flex flex-col transform transition-transform duration-200 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-6 h-6 text-gold" />
            <div>
              <h1 className="text-sm font-bold text-gold">Mahtani</h1>
              <p className="text-xs text-gray-400">Poker Room</p>
            </div>
          </div>
          <button onClick={() => setMobileOpen(false)} className="text-gray-500 hover:text-gray-300">
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <button
              key={to}
              onClick={() => handleNavClick(to)}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors text-gray-300 hover:text-white hover:bg-gray-800 text-left"
            >
              <Icon className="w-5 h-5" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-auto md:ml-0 mt-[52px] md:mt-0">
        <Outlet />
      </main>
    </div>
  );
}
