import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';

export function Header() {
  const location = useLocation();
  const navigate = useNavigate();

  const getTitle = () => {
    if (location.pathname === '/characters') return 'Characters';
    if (location.pathname === '/characters/new') return 'Create Character';
    if (location.pathname.startsWith('/characters/') && location.pathname.endsWith('/edit')) {
      return 'Edit Character';
    }
    if (location.pathname === '/personas') return 'Personas';
    if (location.pathname === '/lorebooks') return 'Lorebooks';
    if (location.pathname.startsWith('/lorebooks/')) return 'Edit Lorebook';
    if (location.pathname === '/settings') return 'Settings';
    if (location.pathname.startsWith('/chat/')) return null; // Chat has its own header
    return 'Glee';
  };

  const title = getTitle();

  // Don't render header for chat view
  if (location.pathname.startsWith('/chat/')) {
    return null;
  }

  const showBackButton = location.pathname !== '/characters' && 
    location.pathname !== '/personas' && 
    location.pathname !== '/lorebooks' && 
    location.pathname !== '/settings';

  return (
    <header className="h-14 flex items-center justify-between px-6 border-b border-surface-700 bg-surface-900">
      <div className="flex items-center gap-4">
        {showBackButton && (
          <button
            onClick={() => navigate(-1)}
            className="p-2 text-surface-400 hover:text-surface-100 hover:bg-surface-800 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        {title && <h1 className="text-lg font-semibold text-surface-100">{title}</h1>}
      </div>

      <div className="flex items-center gap-2">
        {location.pathname === '/characters' && (
          <Button onClick={() => navigate('/characters/new')} size="sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Character
          </Button>
        )}
      </div>
    </header>
  );
}
