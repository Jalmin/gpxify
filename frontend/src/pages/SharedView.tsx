import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import pako from 'pako';

interface SharedViewProps {
  onStateLoaded: (state: Record<string, any>) => void;
}

/**
 * Decode and decompress app state from URL-safe string
 * Inverse of encodeState in ShareButton.tsx
 */
function decodeState(encodedState: string): Record<string, any> {
  try {
    // Convert from base64url to base64
    let base64 = encodedState
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    // Add padding if needed
    while (base64.length % 4) {
      base64 += '=';
    }

    // Decode base64 to binary
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Decompress using inflate
    const decompressed = pako.inflate(bytes, { to: 'string' });

    // Parse JSON
    return JSON.parse(decompressed);
  } catch (error) {
    console.error('Failed to decode state:', error);
    throw new Error('Impossible de décoder les données partagées');
  }
}

export function SharedView({ onStateLoaded }: SharedViewProps) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSharedState = async () => {
      // Get state parameter from URL
      const stateParam = searchParams.get('state');

      if (!stateParam) {
        setError('Lien de partage invalide ou incomplet');
        setIsLoading(false);
        return;
      }

      try {
        // Decode the state from URL
        const decodedState = decodeState(stateParam);

        // Load the shared state into the app
        onStateLoaded(decodedState);

        // Navigate to the main app (dashboard)
        navigate('/', { replace: true });
      } catch (err: any) {
        console.error('Load shared state error:', err);
        setError(err.message || 'Erreur lors du chargement du partage');
      } finally {
        setIsLoading(false);
      }
    };

    loadSharedState();
  }, [searchParams, onStateLoaded, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 mx-auto text-primary animate-spin" />
          <h2 className="text-xl font-semibold">Chargement du partage...</h2>
          <p className="text-muted-foreground">Restauration de votre travail</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-lg w-full p-8 space-y-6">
          <div className="text-center space-y-4">
            <AlertCircle className="w-16 h-16 mx-auto text-destructive" />
            <h2 className="text-2xl font-bold">Erreur de chargement</h2>
            <p className="text-muted-foreground">{error}</p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => navigate('/')}
              className="flex-1 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg transition-colors"
            >
              Retour à l'accueil
            </button>
          </div>
        </Card>
      </div>
    );
  }

  return null;
}
