import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores/uiStore';
import { useConversations } from '@/hooks/useConversations';
import { Avatar } from '@/components/ui/Avatar';
import { formatDate } from '@/lib/format';

const navItems = [
  {
    path: '/characters',
    label: 'Characters',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    path: '/personas',
    label: 'Personas',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
  {
    path: '/lorebooks',
    label: 'Lorebooks',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
  },
  {
    path: '/settings',
    label: 'Settings',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

export function Sidebar() {
  const location = useLocation();
  const { sidebarOpen, toggleSidebar } = useUIStore();
  const { conversations } = useConversations();

  return (
    <motion.aside
      initial={false}
      animate={{ width: sidebarOpen ? 256 : 64 }}
      className="fixed left-0 top-0 h-full bg-surface-800 border-r border-surface-700 z-40 flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between h-14 px-4 border-b border-surface-700">
        {sidebarOpen && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-lg font-bold text-primary-400"
          >
            Glee
          </motion.span>
        )}
        <button
          onClick={toggleSidebar}
          className="p-2 text-surface-400 hover:text-surface-100 hover:bg-surface-700 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-2">
          {navItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
                    isActive
                      ? 'bg-primary-600/20 text-primary-400'
                      : 'text-surface-400 hover:text-surface-100 hover:bg-surface-700'
                  )
                }
              >
                {item.icon}
                {sidebarOpen && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-sm font-medium"
                  >
                    {item.label}
                  </motion.span>
                )}
              </NavLink>
            </li>
          ))}
        </ul>

        {/* Recent Conversations */}
        {sidebarOpen && conversations.length > 0 && (
          <div className="mt-6 px-2">
            <h3 className="px-3 mb-2 text-xs font-semibold text-surface-500 uppercase tracking-wider">
              Recent Chats
            </h3>
            <ul className="space-y-1">
              {conversations.slice(0, 5).map((conv) => (
                <li key={conv.id}>
                  <NavLink
                    to={`/chat/${conv.id}`}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
                        isActive
                          ? 'bg-surface-700 text-surface-100'
                          : 'text-surface-400 hover:text-surface-100 hover:bg-surface-700'
                      )
                    }
                  >
                    <Avatar
                      src={conv.characters[0]?.avatarPath}
                      fallback={conv.characters[0]?.name}
                      size="sm"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {conv.title}
                      </p>
                      <p className="text-xs text-surface-500">
                        {formatDate(conv.updatedAt)}
                      </p>
                    </div>
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        )}
      </nav>
    </motion.aside>
  );
}
