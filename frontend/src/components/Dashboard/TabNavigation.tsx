import { Merge, Table, Heart } from 'lucide-react';

interface TabNavigationProps {
  activeTab: 'analyze' | 'merge' | 'aid-stations' | 'race-recovery';
  onTabChange: (tab: 'analyze' | 'merge' | 'aid-stations' | 'race-recovery') => void;
}

export function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  const tabs = [
    { id: 'analyze' as const, label: 'Analyser', icon: null },
    { id: 'merge' as const, label: 'Fusionner', icon: Merge },
    { id: 'aid-stations' as const, label: 'Prévisions', icon: Table },
    { id: 'race-recovery' as const, label: 'Sauve ma course', icon: Heart },
  ];

  return (
    <div className="flex gap-2 border-b border-border">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`px-4 py-2 font-medium transition-colors flex items-center gap-2 ${
              activeTab === tab.id
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {Icon && <Icon className="w-4 h-4" />}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
