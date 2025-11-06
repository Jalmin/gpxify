import { Heart } from 'lucide-react';
import { FileUpload } from './FileUpload';
import { Footer } from './Footer';
import { Link } from 'react-router-dom';

interface HeroProps {
  onFileSelect: (file: File) => void;
  isUploading: boolean;
  error: string | null;
}

export function Hero({ onFileSelect, isUploading, error }: HeroProps) {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6">
      <div className="max-w-6xl w-full space-y-10">
        {/* Hero Banner with Dual Logos */}
        <div className="text-center space-y-8">
          {/* Dual Logos Layout */}
          <div className="flex items-center justify-center gap-0 w-full">
            {/* Logo Gauche */}
            <img
              src="/logoGPXgauche.png"
              alt="GPX Logo Left"
              className="w-1/2 max-w-80 h-auto pixelated"
              style={{ imageRendering: 'pixelated' }}
            />
            {/* Logo Droite */}
            <img
              src="/logoGPXdroite.png"
              alt="GPX Logo Right"
              className="w-1/2 max-w-80 h-auto pixelated"
              style={{ imageRendering: 'pixelated' }}
            />
          </div>
        </div>

        {/* Upload Section - Simple et épuré */}
        <div className="bg-card border-2 border-border rounded-2xl p-6 shadow-xl max-w-2xl mx-auto">
          <FileUpload onFileSelect={onFileSelect} isUploading={isUploading} />
          {error && (
            <div className="mt-4 p-4 bg-destructive/10 text-destructive rounded-lg border border-destructive text-center text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Use Cases Section */}
        <div className="bg-gradient-to-br from-gray-900 to-black border border-gray-800 rounded-2xl p-8">
          <h3 className="text-xl font-bold text-white mb-6 text-center">Cas d'usage</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-black/50 p-4 rounded-lg border border-gray-800">
              <div className="flex items-start gap-3">
                <div className="text-2xl">🏃</div>
                <div>
                  <h4 className="font-semibold text-white text-sm mb-1">Ultra-trail & Course</h4>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Générez un tableau de ravitaillement avec temps estimés par segment, D+/D-, et distances
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-black/50 p-4 rounded-lg border border-gray-800">
              <div className="flex items-start gap-3">
                <div className="text-2xl">🔋</div>
                <div>
                  <h4 className="font-semibold text-white text-sm mb-1">Batterie vide</h4>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Reconstituez votre trace complète quand votre montre s'est éteinte en pleine course
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-black/50 p-4 rounded-lg border border-gray-800">
              <div className="flex items-start gap-3">
                <div className="text-2xl">✂️</div>
                <div>
                  <h4 className="font-semibold text-white text-sm mb-1">Multi-jours</h4>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Fusionnez plusieurs étapes en une seule trace ou découpez pour isoler une journée
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-black/50 p-4 rounded-lg border border-gray-800">
              <div className="flex items-start gap-3">
                <div className="text-2xl">📊</div>
                <div>
                  <h4 className="font-semibold text-white text-sm mb-1">Analyse détaillée</h4>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Visualisez stats, profil d'altitude, carte interactive et identifiez n'importe quel point
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Race Recovery Link */}
        <div className="text-center">
          <Link
            to="/race-recovery"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg border-2 border-primary/30 hover:border-primary transition-all"
          >
            <Heart className="w-5 h-5" />
            <span className="font-semibold">Sauve ma course</span>
            <span className="text-sm opacity-75">- Batterie vide ?</span>
          </Link>
        </div>

        {/* Footer Info */}
        <div className="text-center text-sm text-muted-foreground">
          <p>Formats supportés : GPX • Taille max : 10 MB</p>
        </div>

        {/* Footer */}
        <Footer />
      </div>
    </div>
  );
}
