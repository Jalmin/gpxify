import { Trash2, HelpCircle } from 'lucide-react';
import { Button } from './ui/Button';
import { Link } from 'react-router-dom';

interface NavbarProps {
  onClearAll: () => void;
  shareButton?: React.ReactNode;
}

export function Navbar({ onClearAll, shareButton }: NavbarProps) {
  return (
    <nav className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center px-6">
        {/* Dual Logos */}
        <Link to="/" className="flex items-center gap-0 mr-6 hover:opacity-80 transition-opacity">
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

        {/* Spacer */}
        <div className="flex-1" />

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Link to="/faq">
            <Button variant="ghost" className="gap-2">
              <HelpCircle className="w-4 h-4" />
              Aide
            </Button>
          </Link>
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
