import { Mountain, Share2, Trash2 } from 'lucide-react';
import { Button } from './ui/Button';

interface NavbarProps {
  onClearAll: () => void;
  shareButton?: React.ReactNode;
}

export function Navbar({ onClearAll, shareButton }: NavbarProps) {
  return (
    <nav className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center px-6">
        {/* Logo */}
        <div className="flex items-center gap-2 mr-6">
          <Mountain className="w-6 h-6 text-primary" />
          <span className="text-xl font-bold bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
            GPXIFY
          </span>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Actions */}
        <div className="flex items-center gap-2">
          {shareButton}
          <Button
            onClick={onClearAll}
            variant="outline"
            className="gap-2 text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="w-4 h-4" />
            Tout supprimer
          </Button>
        </div>
      </div>
    </nav>
  );
}
