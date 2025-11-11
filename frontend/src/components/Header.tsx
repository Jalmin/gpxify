import { Link, useLocation } from 'react-router-dom';
import { BarChart3, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Header() {
  const location = useLocation();

  const navItems = [
    { path: '/analyze', label: 'Analyser', icon: BarChart3 },
    { path: '/race-recovery', label: 'Save My Race', icon: Zap },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-sm border-b border-gray-800">
      <nav className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Dual Logos */}
          <Link to="/" className="flex items-center gap-0 hover:opacity-80 transition-opacity">
            <img
              src="/logoGPXgauche.png"
              alt="GPX Logo Left"
              className="h-8 w-auto pixelated"
              style={{ imageRendering: 'pixelated' }}
            />
            <img
              src="/logoGPXdroite.png"
              alt="GPX Logo Right"
              className="h-8 w-auto pixelated"
              style={{ imageRendering: 'pixelated' }}
            />
          </Link>

          {/* Navigation */}
          <div className="flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm font-medium',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </header>
  );
}
