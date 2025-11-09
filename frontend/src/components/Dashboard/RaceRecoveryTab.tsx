import { Heart } from 'lucide-react';
import { Card } from '../ui/Card';

export function RaceRecoveryTab() {
  return (
    <div className="space-y-6">
      <Card className="p-8">
        <div className="text-center space-y-4">
          <Heart className="w-16 h-16 text-primary mx-auto" />
          <h2 className="text-2xl font-bold">Sauve ma course</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Votre montre a rendu l'âme en pleine course ? Pas de panique ! Utilisez notre outil
            pour reconstruire votre trace GPX complète avec des timestamps précis.
          </p>
          <div className="pt-4">
            <a
              href="/race-recovery"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-semibold"
            >
              <Heart className="w-5 h-5" />
              Ouvrir l'outil de récupération
            </a>
          </div>
        </div>
      </Card>
    </div>
  );
}
