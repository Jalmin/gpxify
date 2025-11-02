import { useState } from 'react';
import { ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useNavigate } from 'react-router-dom';

interface FAQItem {
  question: string;
  answer: string;
}

export function FAQ() {
  const navigate = useNavigate();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqItems: FAQItem[] = [
    {
      question: 'Comment fusionner plusieurs fichiers GPX ?',
      answer: 'Pour fusionner des fichiers GPX : 1) Cliquez sur l\'onglet "Fusionner" dans le menu principal. 2) Déposez ou sélectionnez plusieurs fichiers GPX. 3) Réorganisez-les par glisser-déposer dans l\'ordre souhaité. 4) Configurez les options de fusion si nécessaire (détection des trous, tri automatique). 5) Cliquez sur "Fusionner les fichiers". 6) Téléchargez le fichier GPX fusionné résultant.',
    },
    {
      question: 'Comment créer un tableau de ravitaillement pour une course ?',
      answer: 'Pour créer un tableau de prévisions : 1) Uploadez votre fichier GPX de parcours. 2) Cliquez sur l\'onglet "Prévisions". 3) Sélectionnez le fichier GPX à utiliser. 4) Ajoutez les ravitaillements en indiquant leur nom et leur position kilométrique. 5) Choisissez la méthode de calcul (formule de Naismith recommandée pour le trail, ou allure personnalisée). 6) Générez le tableau pour voir les statistiques entre chaque ravitaillement (distance, D+, D-, temps estimé). 7) Exportez en CSV si besoin.',
    },
    {
      question: 'Quels formats de fichiers sont supportés ?',
      answer: 'GPXIFY supporte uniquement les fichiers au format GPX (GPS Exchange Format), qui est le standard universel pour les traces GPS. La taille maximale par fichier est de 10 MB. Les fichiers GPX peuvent provenir de n\'importe quelle montre GPS, application ou plateforme (Garmin, Suunto, Strava, Komoot, etc.).',
    },
    {
      question: 'Mes données sont-elles sauvegardées sur vos serveurs ?',
      answer: 'Par défaut, vos fichiers GPX sont traités côté serveur mais ne sont PAS sauvegardés de manière permanente. Les fichiers sont analysés puis supprimés immédiatement. La seule exception est si vous utilisez la fonction "Partager" : dans ce cas, l\'état de votre analyse (incluant les traces) est stocké temporairement pendant 30 jours pour permettre le partage via lien. Aucune donnée personnelle n\'est collectée.',
    },
    {
      question: 'Combien de temps les partages sont-ils conservés ?',
      answer: 'Les liens de partage sont conservés pendant 30 jours maximum. Passé ce délai, ils sont automatiquement supprimés de la base de données. Vous pouvez également supprimer manuellement un partage à tout moment en utilisant le bouton de suppression sur la page partagée.',
    },
    {
      question: 'Comment fonctionne la formule de Naismith pour les prévisions ?',
      answer: 'La formule de Naismith est une méthode classique pour estimer le temps de marche/course en montagne. Elle considère : une vitesse de base de 12 km/h sur le plat, ajoute 5 minutes par 100m de dénivelé positif, et retire 5 minutes par 100m de dénivelé négatif sur les pentes raides (>12%). C\'est une estimation conservative adaptée au trail et à la randonnée.',
    },
    {
      question: 'Puis-je réorganiser l\'ordre de mes fichiers GPX ?',
      answer: 'Oui ! Dans l\'onglet "Analyser", vous pouvez glisser-déposer les fichiers GPX pour les réorganiser dans l\'ordre que vous souhaitez. Cela affecte l\'ordre d\'affichage et la couleur assignée à chaque trace sur la carte. Dans l\'onglet "Fusionner", l\'ordre des fichiers détermine l\'ordre de fusion.',
    },
    {
      question: 'Comment interpréter le profil d\'altitude ?',
      answer: 'Le profil d\'altitude affiche l\'élévation en fonction de la distance parcourue. Vous pouvez cliquer sur n\'importe quel point du graphique pour voir la position correspondante sur la carte. Les zones en montée apparaissent avec une pente positive, les descentes avec une pente négative. Les statistiques détaillées (D+, D-, pente moyenne) sont affichées dans les cartes de statistiques.',
    },
    {
      question: 'GPXIFY est-il gratuit ?',
      answer: 'Oui, GPXIFY est entièrement gratuit et sans publicité. L\'outil a été créé pour la communauté trail et outdoor. Aucune inscription n\'est nécessaire, aucune limite d\'utilisation n\'est imposée (dans la mesure du raisonnable).',
    },
    {
      question: 'Mes données GPS sont-elles privées ?',
      answer: 'Oui. GPXIFY utilise Fathom Analytics, une solution respectueuse de la vie privée qui ne collecte aucune donnée personnelle, n\'utilise pas de cookies, et est conforme RGPD. Seules des statistiques d\'utilisation anonymes sont collectées (pages visitées, durée de visite). Vos traces GPX ne sont jamais partagées avec des tiers.',
    },
  ];

  const toggleQuestion = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary/10 via-background to-background border-b border-border">
        <div className="container mx-auto px-6 py-12">
          <div className="max-w-3xl mx-auto text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <HelpCircle className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-4xl font-bold">Questions fréquentes</h1>
            <p className="text-lg text-muted-foreground">
              Tout ce que vous devez savoir sur GPXIFY
            </p>
          </div>
        </div>
      </div>

      {/* FAQ Content */}
      <div className="container mx-auto px-6 py-12">
        <div className="max-w-3xl mx-auto space-y-4">
          {faqItems.map((item, index) => (
            <Card key={index} className="overflow-hidden">
              <button
                onClick={() => toggleQuestion(index)}
                className="w-full p-6 text-left flex items-start justify-between gap-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{item.question}</h3>
                  {openIndex === index && (
                    <p className="mt-3 text-muted-foreground leading-relaxed">
                      {item.answer}
                    </p>
                  )}
                </div>
                <div className="flex-shrink-0 mt-1">
                  {openIndex === index ? (
                    <ChevronUp className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
              </button>
            </Card>
          ))}
        </div>

        {/* CTA */}
        <div className="max-w-3xl mx-auto mt-12 text-center">
          <Card className="p-8 bg-gradient-to-br from-primary/5 to-background">
            <h3 className="text-xl font-semibold mb-3">
              Vous ne trouvez pas votre réponse ?
            </h3>
            <p className="text-muted-foreground mb-6">
              Essayez GPXIFY dès maintenant, c'est gratuit et sans inscription !
            </p>
            <Button onClick={() => navigate('/')} size="lg">
              Commencer à analyser
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
