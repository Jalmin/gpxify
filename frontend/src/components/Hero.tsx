import { Edit3, Merge, Scissors, BarChart3, Search, Upload } from 'lucide-react';
import { FileUpload } from './FileUpload';

interface HeroProps {
  onFileSelect: (file: File) => void;
  isUploading: boolean;
  error: string | null;
}

export function Hero({ onFileSelect, isUploading, error }: HeroProps) {
  const features = [
    { icon: Edit3, label: 'Éditer', color: 'from-blue-500 to-cyan-500' },
    { icon: Merge, label: 'Fusionner', color: 'from-purple-500 to-pink-500' },
    { icon: Scissors, label: 'Découper', color: 'from-orange-500 to-red-500' },
    { icon: BarChart3, label: 'Analyser', color: 'from-green-500 to-emerald-500' },
    { icon: Search, label: 'Identifier', color: 'from-indigo-500 to-blue-500' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted flex items-center justify-center p-6">
      <div className="max-w-4xl w-full space-y-12">
        {/* Hero Banner */}
        <div className="text-center space-y-4">
          <h1 className="text-7xl font-black text-white">
            GPXIFY
          </h1>
          <p className="text-2xl text-muted-foreground font-medium">
            L'outil tout-en-un pour vos traces GPX de trail
          </p>
        </div>

        {/* Feature Icons */}
        <div className="flex justify-center items-center gap-8 flex-wrap">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group relative flex flex-col items-center gap-3 transition-transform hover:scale-110"
            >
              <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${feature.color} p-4 shadow-lg group-hover:shadow-xl transition-all`}>
                <feature.icon className="w-full h-full text-white" strokeWidth={2.5} />
              </div>
              <span className="text-sm font-semibold text-foreground/80 group-hover:text-foreground transition-colors">
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
      </div>
    </div>
  );
}
