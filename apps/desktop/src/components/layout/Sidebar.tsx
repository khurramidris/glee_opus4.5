import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';

const navItems = [
  { 
    path: '/characters', 
    label: 'Characters',
    icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' 
  },
  { 
    path: '/personas', 
    label: 'Personas',
    icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' 
  },
  {
    path: '/lorebooks', 
    label: 'Lorebooks',
    icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253'
  },
  { 
    path: '/settings', 
    label: 'Settings',
    icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37.996.608 2.296.07 2.572-1.065z' 
  },
];

export function Sidebar() {
  return (
    <aside className="w-16 flex flex-col items-center py-6 bg-surface-900 rounded-r-2xl border-r border-surface-800 shadow-xl z-20 h-full">
      {/* Logo */}
      <div className="w-10 h-10 mb-8 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center shadow-glow shrink-0">
        <span className="text-surface-900 font-bold text-xl">G</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 flex flex-col gap-4 w-full px-2 overflow-y-auto no-scrollbar">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            title={item.label}
            className={({ isActive }) =>
              cn(
                'w-10 h-10 mx-auto flex items-center justify-center rounded-xl transition-all duration-300',
                isActive
                  ? 'bg-surface-800 text-primary-400 shadow-glow-purple scale-110'
                  : 'text-surface-400 hover:text-surface-200 hover:bg-surface-800/50'
              )
            }
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
            </svg>
          </NavLink>
        ))}
      </nav>

      {/* User Avatar (Bottom) */}
      <div className="w-10 h-10 mt-auto rounded-full bg-surface-800 border-2 border-surface-700 overflow-hidden cursor-pointer hover:border-primary-500 transition-colors shrink-0">
        <div className="w-full h-full bg-gradient-to-tr from-surface-700 to-surface-600" />
      </div>
    </aside>
  );
}