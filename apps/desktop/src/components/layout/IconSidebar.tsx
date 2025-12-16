import { NavLink, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

export function IconSidebar() {
    const navigate = useNavigate();

    const NavItem = ({
        to,
        title,
        icon,
        end = false
    }: {
        to: string;
        title: string;
        icon: React.ReactNode;
        end?: boolean;
    }) => (
        <NavLink
            to={to}
            end={end}
            title={title}
            className={({ isActive }) =>
                cn(
                    'w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200',
                    'hover:bg-white/10',
                    isActive
                        ? 'bg-white/15 text-white shadow-sm'
                        : 'text-white/60 hover:text-white'
                )
            }
        >
            {icon}
        </NavLink>
    );

    return (
        <aside className="w-16 flex flex-col items-center py-4 gap-2 bg-transparent h-full">
            {/* Top Navigation Icons */}
            <div className="flex flex-col items-center gap-1">
                <NavItem
                    to="/characters"
                    end
                    title="Characters"
                    icon={
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                    }
                />

                <NavItem
                    to="/personas"
                    title="Personas"
                    icon={
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                    }
                />
            </div>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Bottom Icons with Labels */}
            <div className="flex flex-col items-center gap-3">
                {/* Settings */}
                <button
                    onClick={() => navigate('/settings')}
                    title="Settings"
                    className="flex flex-col items-center gap-1 text-white/60 hover:text-white transition-all duration-200 group"
                >
                    <div className="w-10 h-10 flex items-center justify-center rounded-xl group-hover:bg-white/10 transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    </div>
                    <span className="text-[10px] font-medium opacity-80">Settings</span>
                </button>

                {/* Profile */}
                <button
                    onClick={() => navigate('/personas')}
                    title="Profile"
                    className="flex flex-col items-center gap-1 text-white/60 hover:text-white transition-all duration-200 group"
                >
                    <div className="w-10 h-10 flex items-center justify-center rounded-xl group-hover:bg-white/10 transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                    </div>
                    <span className="text-[10px] font-medium opacity-80">Profile</span>
                </button>
            </div>
        </aside>
    );
}