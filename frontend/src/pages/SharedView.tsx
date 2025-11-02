import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { shareApi } from '@/services/api';
import { Mountain, Loader2, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/Card';

interface SharedViewProps {
  onStateLoaded: (state: Record<string, any>) => void;
}

export function SharedView({ onStateLoaded }: SharedViewProps) {
  const { shareId } = useParams<{ shareId: string }>();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSharedState = async () => {
      if (!shareId) {
        setError('ID de partage invalide');
        setIsLoading(false);
        return;
      }

      try {
        const response = await shareApi.getSharedState(shareId);

        if (response.success && response.state_json) {
          // Load the shared state into the app
          onStateLoaded(response.state_json);

          // Navigate to the main app (dashboard)
          navigate('/', { replace: true });
        } else {
          setError('Impossible de charger le partage');
        }
      } catch (err: any) {
        console.error('Load shared state error:', err);

        if (err.response?.status === 404) {
          setError('Ce partage n\'existe pas ou a été supprimé');
        } else if (err.response?.status === 410) {
          setError('Ce partage a expiré (30 jours maximum)');
        } else {
          setError(err.response?.data?.detail || 'Erreur lors du chargement du partage');
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadSharedState();
  }, [shareId, onStateLoaded, navigate]);

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
