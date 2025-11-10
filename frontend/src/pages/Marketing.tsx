import { Link } from 'react-router-dom';
import { FileUpload } from '@/components/FileUpload';
import { Footer } from '@/components/Footer';
import { useGPXUpload } from '@/hooks/useGPXUpload';
import { useNavigate } from 'react-router-dom';

export function Marketing() {
  const { handleFileSelect, isUploading } = useGPXUpload();
  const navigate = useNavigate();

  const handleFileUpload = async (file: File) => {
    await handleFileSelect(file);
    setTimeout(() => navigate('/analyze'), 100);
  };

  return (
    <div className="min-h-screen bg-black">
      {/* Hero Section */}
      <section className="container mx-auto px-6 py-12 md:py-16 max-w-6xl">
        <div className="space-y-10">
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

          {/* Upload Zone */}
          <div className="bg-card border-2 border-border rounded-2xl p-6 shadow-xl max-w-2xl mx-auto">
            <FileUpload onFileSelect={handleFileUpload} isUploading={isUploading} />
          </div>

          {/* Use Cases - 3 phrases simples */}
          <div className="bg-gradient-to-br from-gray-900 to-black border border-gray-800 rounded-2xl p-8 max-w-3xl mx-auto">
            <div className="space-y-4 text-gray-300">
              <p className="text-base leading-relaxed">
                <span className="text-white font-semibold">Prépare ta course ou ton off</span> grâce à l'analyse des montées et la découpe de trace de ravito en ravito.
              </p>
              <p className="text-base leading-relaxed">
                <span className="text-white font-semibold">Problème de montre ?</span> Fusionne deux traces GPX en une seule sortie.
              </p>
              <p className="text-base leading-relaxed">
                <span className="text-white font-semibold">Plus de batterie dans ta montre ?</span> Recrée ta sortie avec ton temps officiel et le GPX de la course.
              </p>
            </div>
          </div>

          {/* Link to analyze */}
          <div className="text-center text-sm text-gray-400">
            ou{' '}
            <Link to="/analyze" className="text-primary hover:underline">
              utiliser l'app directement
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}
