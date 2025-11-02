import { Mountain, Map, TrendingUp, Upload, Menu, X, ArrowDownUp, Table } from 'lucide-react';
import { useState } from 'react';

interface SidebarProps {
  activeSection?: string;
  onSectionChange?: (section: string) => void;
}

export function Sidebar({ activeSection = 'dashboard', onSectionChange }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Mountain },
    { id: 'merge', label: 'Fusion GPX', icon: ArrowDownUp },
    { id: 'aidstation', label: 'Ravitaillements', icon: Table },
    { id: 'map', label: 'Carte', icon: Map },
    { id: 'elevation', label: 'Profil', icon: TrendingUp },
    { id: 'upload', label: 'Importer', icon: Upload },
  ];

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden p-2 rounded-lg bg-card text-foreground border border-border"
      >
        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Sidebar backdrop for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-screen w-64
          bg-card border-r border-border
          transition-transform duration-300 ease-in-out
          lg:translate-x-0
          ${isOpen ? 'translate-x-0 z-50' : '-translate-x-full lg:translate-x-0 z-40'}
        `}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 p-6 border-b border-border">
          <Mountain className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-xl font-bold text-foreground">GPXIFY</h1>
            <p className="text-xs text-muted-foreground">Analyse GPX</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSectionChange?.(item.id);
                  setIsOpen(false);
                }}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-lg
                  transition-colors duration-200
                  ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted'
                  }
                `}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">
            GPXIFY v1.0.0
          </p>
        </div>
      </aside>
    </>
  );
}
