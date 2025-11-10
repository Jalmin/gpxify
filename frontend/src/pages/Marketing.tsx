import { Link } from 'react-router-dom';
import {
  Upload,
  Mountain,
  Merge,
  Share2,
  Activity,
  Zap,
  FileText,
  TrendingUp,
  MapPin,
  Download
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Footer } from '@/components/Footer';

export function Marketing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Simple Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold text-foreground">
            GPX Ninja
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Fonctionnalités
            </a>
            <a href="#faq" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              FAQ
            </a>
            <Link to="/analyze">
              <Button size="sm">
                Commencer
              </Button>
            </Link>
          </nav>
          <Link to="/analyze" className="md:hidden">
            <Button size="sm">
              Commencer
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="border-b border-border">
        <div className="container mx-auto px-6 py-16 max-w-5xl">
          <div className="text-center space-y-6">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground">
              GPX Ninja
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Outils pour analyser, préparer et partager vos traces GPX de trail et ultra.
            </p>
            <div className="flex gap-4 justify-center pt-4">
              <Link to="/analyze">
                <Button size="lg">
                  Commencer
                </Button>
              </Link>
              <a href="#features">
                <Button size="lg" variant="outline">
                  Fonctionnalités
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="container mx-auto px-6 py-16 max-w-6xl">
        <h2 className="text-2xl font-bold text-center mb-12">Ce que vous pouvez faire</h2>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Analyser */}
          <div className="border border-border rounded-lg p-6 space-y-3">
            <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-950 flex items-center justify-center">
              <Activity className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold">Analyser une trace</h3>
            <p className="text-sm text-muted-foreground">
              Distance, dénivelé, profil d'altitude, carte interactive. Tout ce qu'il faut pour étudier un parcours.
            </p>
          </div>

          {/* Détecter montées */}
          <div className="border border-border rounded-lg p-6 space-y-3">
            <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-950 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-lg font-semibold">Détecter les montées</h3>
            <p className="text-sm text-muted-foreground">
              Identifie automatiquement les côtes significatives avec distance, dénivelé et pente moyenne.
            </p>
          </div>

          {/* Extraire segment */}
          <div className="border border-border rounded-lg p-6 space-y-3">
            <div className="w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-950 flex items-center justify-center">
              <Download className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="text-lg font-semibold">Extraire un segment</h3>
            <p className="text-sm text-muted-foreground">
              Sélectionnez une portion de trace et exportez-la en fichier GPX séparé.
            </p>
          </div>

          {/* Fusionner */}
          <div className="border border-border rounded-lg p-6 space-y-3">
            <div className="w-12 h-12 rounded-lg bg-orange-100 dark:bg-orange-950 flex items-center justify-center">
              <Merge className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
            <h3 className="text-lg font-semibold">Fusionner des traces</h3>
            <p className="text-sm text-muted-foreground">
              Combinez plusieurs fichiers GPX en un seul pour avoir une vue d'ensemble.
            </p>
          </div>

          {/* Ravitaillements */}
          <div className="border border-border rounded-lg p-6 space-y-3">
            <div className="w-12 h-12 rounded-lg bg-red-100 dark:bg-red-950 flex items-center justify-center">
              <MapPin className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-lg font-semibold">Table de ravitaillement</h3>
            <p className="text-sm text-muted-foreground">
              Générez un tableau de ravitaillements avec temps estimés selon la formule de Naismith.
            </p>
          </div>

          {/* Récupérer course */}
          <div className="border border-border rounded-lg p-6 space-y-3">
            <div className="w-12 h-12 rounded-lg bg-yellow-100 dark:bg-yellow-950 flex items-center justify-center">
              <Zap className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <h3 className="text-lg font-semibold">Récupérer une course</h3>
            <p className="text-sm text-muted-foreground">
              Montre coupée en course ? Reconstituez votre trace complète à partir du GPX officiel et de votre temps.
            </p>
          </div>

          {/* Partager */}
          <div className="border border-border rounded-lg p-6 space-y-3">
            <div className="w-12 h-12 rounded-lg bg-cyan-100 dark:bg-cyan-950 flex items-center justify-center">
              <Share2 className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
            </div>
            <h3 className="text-lg font-semibold">Partager une analyse</h3>
            <p className="text-sm text-muted-foreground">
              Partagez votre analyse complète via un lien. Pas besoin de compte, tout est anonyme.
            </p>
          </div>

          {/* Export */}
          <div className="border border-border rounded-lg p-6 space-y-3">
            <div className="w-12 h-12 rounded-lg bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center">
              <FileText className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h3 className="text-lg font-semibold">Exporter en PDF</h3>
            <p className="text-sm text-muted-foreground">
              Exportez votre analyse complète en PDF pour l'imprimer ou l'archiver.
            </p>
          </div>

          {/* Vie privée */}
          <div className="border border-border rounded-lg p-6 space-y-3">
            <div className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-950 flex items-center justify-center">
              <Mountain className="w-6 h-6 text-slate-600 dark:text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold">100% privé</h3>
            <p className="text-sm text-muted-foreground">
              Vos traces ne sont jamais stockées. Traitement côté navigateur, transfert sécurisé, suppression immédiate.
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-border bg-muted/30">
        <div className="container mx-auto px-6 py-16 max-w-4xl">
          <h2 className="text-2xl font-bold text-center mb-12">Comment ça marche</h2>

          <div className="space-y-8">
            <div className="flex gap-6 items-start">
              <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold flex-shrink-0">
                1
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Uploadez votre fichier GPX</h3>
                <p className="text-muted-foreground">
                  Glissez-déposez ou sélectionnez un fichier .gpx depuis votre ordinateur ou smartphone.
                  Limite 10 MB. Formats GPX standard acceptés.
                </p>
              </div>
            </div>

            <div className="flex gap-6 items-start">
              <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold flex-shrink-0">
                2
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Analysez et utilisez les outils</h3>
                <p className="text-muted-foreground">
                  Consultez les statistiques, le profil d'altitude, détectez les montées, extrayez des segments,
                  générez une table de ravitaillement. Tout se passe dans votre navigateur.
                </p>
              </div>
            </div>

            <div className="flex gap-6 items-start">
              <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold flex-shrink-0">
                3
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Exportez ou partagez</h3>
                <p className="text-muted-foreground">
                  Téléchargez vos fichiers GPX modifiés, exportez en PDF, ou partagez un lien vers votre analyse.
                  Simple et rapide.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Facts */}
      <section className="container mx-auto px-6 py-16 max-w-4xl">
        <h2 className="text-2xl font-bold text-center mb-12">Les faits</h2>

        <div className="grid md:grid-cols-3 gap-8 text-center">
          <div>
            <div className="text-3xl font-bold text-primary mb-2">100%</div>
            <div className="text-sm text-muted-foreground">Gratuit, sans publicité</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-primary mb-2">0</div>
            <div className="text-sm text-muted-foreground">Compte requis</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-primary mb-2">10 MB</div>
            <div className="text-sm text-muted-foreground">Taille max de fichier</div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="border-t border-border bg-muted/30">
        <div className="container mx-auto px-6 py-16 max-w-3xl">
          <h2 className="text-2xl font-bold text-center mb-12">Questions fréquentes</h2>

          <div className="space-y-6">
            <div>
              <h3 className="font-semibold mb-2">Mes fichiers GPX sont-ils stockés ?</h3>
              <p className="text-sm text-muted-foreground">
                Non. Le traitement se fait dans votre navigateur quand c'est possible. Quand le fichier doit être envoyé
                au serveur (fusion, génération PDF), il est supprimé immédiatement après traitement. Aucun stockage permanent.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Quels formats sont acceptés ?</h3>
              <p className="text-sm text-muted-foreground">
                Fichiers .gpx standard (GPX 1.0 et 1.1). Les fichiers doivent contenir des traces (tracks) avec points et élévations.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">C'est vraiment gratuit ?</h3>
              <p className="text-sm text-muted-foreground">
                Oui. Pas de limite d'utilisation, pas de publicité, pas de compte premium.
                Le projet est open source et développé pour la communauté trail.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Puis-je utiliser GPX Ninja sur mobile ?</h3>
              <p className="text-sm text-muted-foreground">
                Oui, le site est responsive et fonctionne sur smartphone et tablette. L'interface s'adapte à votre écran.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">D'où viennent les altitudes ?</h3>
              <p className="text-sm text-muted-foreground">
                Les altitudes proviennent directement de votre fichier GPX (enregistrées par votre montre/GPS).
                Nous ne les recalculons pas avec des API externes.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Comment fonctionne la détection de montées ?</h3>
              <p className="text-sm text-muted-foreground">
                L'algorithme analyse le profil d'altitude et identifie les segments avec au moins 200m de D+ sur 500m minimum.
                Le seuil s'adapte au profil du parcours (5% de l'amplitude d'élévation totale).
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Un bug ou une suggestion ?</h3>
              <p className="text-sm text-muted-foreground">
                Utilisez le bouton "Nous contacter" en bas de page ou ouvrez une issue sur GitHub.
                Le projet est open source, les contributions sont bienvenues.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border">
        <div className="container mx-auto px-6 py-16 text-center">
          <h2 className="text-2xl font-bold mb-4">Prêt à analyser votre trace ?</h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Pas d'inscription, pas de configuration. Uploadez un fichier GPX et commencez immédiatement.
          </p>
          <Link to="/analyze">
            <Button size="lg">
              <Upload className="w-4 h-4 mr-2" />
              Commencer maintenant
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}
