import { Link } from 'react-router-dom';
import { Github, Heart } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-border bg-background/95 backdrop-blur mt-12">
      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* About */}
          <div>
            <h3 className="font-semibold mb-3">GPXIFY</h3>
            <p className="text-sm text-muted-foreground">
              L'outil tout-en-un pour analyser, fusionner et optimiser vos traces GPX de trail.
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="font-semibold mb-3">Liens utiles</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/faq" className="text-muted-foreground hover:text-primary transition-colors">
                  FAQ / Aide
                </Link>
              </li>
              <li>
                <Link to="/legal" className="text-muted-foreground hover:text-primary transition-colors">
                  Mentions légales & Confidentialité
                </Link>
              </li>
              <li>
                <a
                  href="https://github.com/Jalmin/gpxify"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1"
                >
                  <Github className="w-4 h-4" />
                  Code source
                </a>
              </li>
            </ul>
          </div>

          {/* Open Source */}
          <div>
            <h3 className="font-semibold mb-3">Projet Open Source</h3>
            <p className="text-sm text-muted-foreground mb-3">
              GPXIFY est gratuit, sans publicité et respectueux de votre vie privée.
            </p>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              Fait avec <Heart className="w-4 h-4 text-red-500 fill-red-500" /> pour la communauté trail
            </p>
          </div>
        </div>

        <div className="border-t border-border mt-8 pt-6 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} GPXIFY - Tous droits réservés</p>
        </div>
      </div>
    </footer>
  );
}
