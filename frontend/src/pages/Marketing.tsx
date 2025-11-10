import { FileUpload } from '@/components/FileUpload';
import { Footer } from '@/components/Footer';
import { useGPXUpload } from '@/hooks/useGPXUpload';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, Zap, GitMerge } from 'lucide-react';

export function Marketing() {
  const { handleFileSelect, isUploading } = useGPXUpload();
  const navigate = useNavigate();

  const handleFileUpload = async (file: File) => {
    await handleFileSelect(file);
    setTimeout(() => navigate('/analyze'), 100);
  };

  return (
    <div className="min-h-screen bg-black">
      {/* Hero Section - Simple et Direct */}
      <section className="container mx-auto px-6 py-12 md:py-20 max-w-4xl min-h-screen flex flex-col justify-center">
        <div className="space-y-12">
          {/* Dual Logos */}
          <div className="flex items-center justify-center gap-0 w-full">
            <img
              src="/logoGPXgauche.png"
              alt="GPX Ninja"
              className="w-1/2 max-w-80 h-auto pixelated"
              style={{ imageRendering: 'pixelated' }}
            />
            <img
              src="/logoGPXdroite.png"
              alt="GPX Ninja"
              className="w-1/2 max-w-80 h-auto pixelated"
              style={{ imageRendering: 'pixelated' }}
            />
          </div>

          {/* Upload Zone - Clean, sans cadre */}
          <div className="max-w-2xl mx-auto">
            <FileUpload onFileSelect={handleFileUpload} isUploading={isUploading} />
          </div>
        </div>
      </section>

      {/* Use Cases Section - Détaillé au scroll */}
      <section className="border-t border-gray-800 bg-gradient-to-b from-black to-gray-900">
        <div className="container mx-auto px-6 py-20 max-w-5xl">
          <div className="space-y-16">

            {/* Use Case 1 - Préparation */}
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-green-950 flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-6 h-6 text-green-400" />
                </div>
                <div className="space-y-3">
                  <h3 className="text-2xl font-bold text-white">
                    Prépare ta course ou ton off
                  </h3>
                  <p className="text-gray-400 leading-relaxed">
                    Upload le GPX de ta course. L'algo détecte automatiquement toutes les montées significatives
                    (200m+ de D+, 500m+ de distance). Pour chaque bosse : distance, dénivelé, pente moyenne.
                  </p>
                  <p className="text-gray-400 leading-relaxed">
                    Découpe ta trace ravito par ravito avec le planificateur : place tes points de ravitaillement,
                    l'algorithme de Naismith (adapté trail) calcule tes temps de passage en tenant compte du D+ et D-.
                  </p>
                  <p className="text-sm text-gray-500">
                    → Analyse complète • Profil d'altitude interactif • Export PDF
                  </p>
                </div>
              </div>
            </div>

            {/* Use Case 2 - Fusion */}
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-purple-950 flex items-center justify-center flex-shrink-0">
                  <GitMerge className="w-6 h-6 text-purple-400" />
                </div>
                <div className="space-y-3">
                  <h3 className="text-2xl font-bold text-white">
                    Problème de montre ?
                  </h3>
                  <p className="text-gray-400 leading-relaxed">
                    Ta montre a coupé en pleine course et redémarré ? Tu as 2 (ou plus) fichiers GPX séparés ?
                  </p>
                  <p className="text-gray-400 leading-relaxed">
                    Fusionne-les intelligemment : l'outil détecte les gaps entre les fichiers, te prévient des overlaps,
                    et crée un GPX unique avec tous tes points GPS. Option d'interpolation pour combler les trous
                    ou laisser visible les coupures.
                  </p>
                  <p className="text-sm text-gray-500">
                    → Drag & drop pour réordonner • Détection auto des gaps • Preview avant export
                  </p>
                </div>
              </div>
            </div>

            {/* Use Case 3 - Recovery */}
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-yellow-950 flex items-center justify-center flex-shrink-0">
                  <Zap className="w-6 h-6 text-yellow-400" />
                </div>
                <div className="space-y-3">
                  <h3 className="text-2xl font-bold text-white">
                    Plus de batterie dans ta montre ?
                  </h3>
                  <p className="text-gray-400 leading-relaxed">
                    Scénario : tu fais un ultra, ta montre meurt au km 80 d'un 100km. Tu as ton GPX partiel
                    (0-80km avec les timestamps), le GPX officiel de la course (100km complet sans timestamps),
                    et ton temps final officiel.
                  </p>
                  <p className="text-gray-400 leading-relaxed">
                    L'algorithme reconstruit ton GPX complet : il trouve où ta montre s'est arrêtée, calcule
                    ta vitesse moyenne nécessaire pour la fin, l'ajuste selon la pente de chaque section
                    (plus lent en montée, plus rapide en descente), et génère les timestamps manquants.
                  </p>
                  <p className="text-sm text-gray-500">
                    → Algorithme de vitesse ajustée à la pente • Upload direct sur Strava • Unique sur le marché
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}
