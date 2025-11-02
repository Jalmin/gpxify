import { Edit3, Merge, Scissors, BarChart3, Search, Upload } from 'lucide-react';
import { FileUpload } from './FileUpload';
import { Footer } from './Footer';

interface HeroProps {
  onFileSelect: (file: File) => void;
  isUploading: boolean;
  error: string | null;
}

export function Hero({ onFileSelect, isUploading, error }: HeroProps) {
  const features = [
    { icon: Edit3, label: 'Éditer' },
    { icon: Merge, label: 'Fusionner' },
    { icon: Scissors, label: 'Découper' },
    { icon: BarChart3, label: 'Analyser' },
    { icon: Search, label: 'Identifier' },
  ];

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6">
      <div className="max-w-6xl w-full space-y-12">
        {/* Hero Banner with Dual Logos */}
        <div className="text-center space-y-8">
          {/* Dual Logos Layout */}
          <div className="flex items-center justify-center gap-12 flex-wrap">
            {/* Logo Gauche */}
            <img
              src="/logoGPXgauche.png"
              alt="GPX Logo Left"
              className="w-40 h-auto pixelated"
              style={{ imageRendering: 'pixelated' }}
            />

            {/* Logo Droite */}
            <img
              src="/logoGPXdroite.png"
              alt="GPX Logo Right"
              className="w-40 h-auto pixelated"
              style={{ imageRendering: 'pixelated' }}
            />
          </div>
        </div>

        {/* Feature Icons - Black & White */}
        <div className="flex justify-center items-center gap-8 flex-wrap">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group relative flex flex-col items-center gap-3 transition-transform hover:scale-110"
            >
              <div className="w-16 h-16 rounded-2xl bg-white p-4 shadow-lg group-hover:shadow-2xl group-hover:bg-gray-200 transition-all">
                <feature.icon className="w-full h-full text-black" strokeWidth={2.5} />
              </div>
              <span className="text-sm font-semibold text-gray-400 group-hover:text-white transition-colors">
                {feature.label}
              </span>
            </div>
          ))}
        </div>

        {/* Upload Section */}
        <div className="bg-card border-2 border-border rounded-2xl p-8 shadow-xl">
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                <Upload className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold">Commencez maintenant</h2>
              <p className="text-muted-foreground">
                Importez votre fichier GPX pour analyser, éditer et optimiser vos traces
              </p>
            </div>

            <FileUpload onFileSelect={onFileSelect} isUploading={isUploading} />

            {error && (
              <div className="p-4 bg-destructive/10 text-destructive rounded-lg border border-destructive text-center">
                {error}
              </div>
            )}
          </div>
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
