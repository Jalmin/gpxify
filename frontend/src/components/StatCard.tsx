import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  color?: 'blue' | 'green' | 'red' | 'purple' | 'orange' | 'white';
}

const colorClasses = {
  blue: 'text-blue-500',
  green: 'text-green-500',
  red: 'text-red-500',
  purple: 'text-purple-500',
  orange: 'text-orange-500',
  white: 'text-white',
};

export function StatCard({ title, value, icon: Icon, trend, color = 'blue' }: StatCardProps) {
  return (
    <div className="bg-card border border-border rounded-lg p-6 hover:border-primary/50 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-bold text-foreground">{value}</p>
            {trend && (
              <span className="text-xs text-muted-foreground">{trend}</span>
            )}
          </div>
        </div>
        <div className={`p-3 rounded-lg bg-secondary ${colorClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}
