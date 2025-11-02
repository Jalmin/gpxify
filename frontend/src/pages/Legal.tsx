import { Shield, Lock, Database, Eye, FileText } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useNavigate } from 'react-router-dom';

export function Legal() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary/10 via-background to-background border-b border-border">
        <div className="container mx-auto px-6 py-12">
          <div className="max-w-4xl mx-auto text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-4xl font-bold">Mentions légales & Confidentialité</h1>
            <p className="text-lg text-muted-foreground">
              Informations légales et politique de protection des données
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-6 py-12">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Mentions légales */}
          <Card className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <FileText className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-bold">Mentions légales</h2>
            </div>

            <div className="space-y-6 text-muted-foreground">
              <div>
                <h3 className="font-semibold text-foreground mb-2">Éditeur du site</h3>
                <p>
                  GPXIFY est un projet open-source développé et maintenu par la communauté trail et outdoor.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-2">Hébergement</h3>
                <p>
                  Ce site est hébergé sur une infrastructure cloud sécurisée.
                  <br />
                  Localisation des serveurs : Union Européenne
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-2">Propriété intellectuelle</h3>
                <p>
                  Le code source de GPXIFY est disponible sous licence open-source sur GitHub.
                  Les marques, logos et éléments graphiques sont la propriété de leurs auteurs respectifs.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-2">Contact</h3>
                <p>
                  Pour toute question concernant ce site, vous pouvez nous contacter via GitHub :
                  <br />
                  <a
                    href="https://github.com/Jalmin/gpxify"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    github.com/Jalmin/gpxify
                  </a>
                </p>
              </div>
            </div>
          </Card>

          {/* Privacy Policy */}
          <Card className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <Lock className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-bold">Politique de confidentialité</h2>
            </div>

            <div className="space-y-6 text-muted-foreground">
              <div>
                <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  Données collectées
                </h3>
                <p className="mb-3">
                  GPXIFY collecte un minimum de données pour fonctionner :
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>
                    <strong>Fichiers GPX :</strong> Uploadés temporairement pour analyse, puis supprimés
                    immédiatement après traitement (sauf si vous utilisez la fonction "Partager")
                  </li>
                  <li>
                    <strong>Partages :</strong> Si vous créez un lien de partage, les données de trace sont
                    stockées pendant 30 jours maximum avec : adresse IP, user agent, nombre de vues
                  </li>
                  <li>
                    <strong>Analytics :</strong> Statistiques anonymes via Fathom Analytics (voir ci-dessous)
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  Fathom Analytics - Respect de votre vie privée
                </h3>
                <p className="mb-3">
                  GPXIFY utilise{' '}
                  <a
                    href="https://usefathom.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Fathom Analytics
                  </a>
                  , une solution d'analyse respectueuse de la vie privée :
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Aucun cookie n'est déposé sur votre navigateur</li>
                  <li>Aucune donnée personnelle n'est collectée (pas d'IP, pas d'identifiant unique)</li>
                  <li>Conformité RGPD totale - aucun bandeau de consentement nécessaire</li>
                  <li>
                    Seules des statistiques agrégées et anonymes sont collectées (pages visitées, durée,
                    provenance)
                  </li>
                  <li>
                    Données hébergées en UE et non revendues à des tiers
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-2">Conservation des données</h3>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Fichiers GPX uploadés : supprimés immédiatement après traitement</li>
                  <li>Partages créés : conservés 30 jours puis supprimés automatiquement</li>
                  <li>Analytics : données anonymes agrégées conservées indéfiniment</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-2">Vos droits</h3>
                <p className="mb-3">
                  Conformément au RGPD, vous disposez des droits suivants :
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Droit d'accès à vos données</li>
                  <li>Droit de rectification</li>
                  <li>Droit à l'effacement (suppression de vos partages)</li>
                  <li>Droit d'opposition au traitement</li>
                </ul>
                <p className="mt-3">
                  Pour exercer ces droits, contactez-nous via GitHub ou supprimez directement vos partages
                  depuis l'interface.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-2">Sécurité</h3>
                <p>
                  Nous mettons en œuvre toutes les mesures techniques et organisationnelles appropriées pour
                  protéger vos données contre tout accès, modification, divulgation ou destruction non
                  autorisés. Les communications avec le serveur sont chiffrées via HTTPS.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-2">Cookies</h3>
                <p>
                  GPXIFY n'utilise aucun cookie. Fathom Analytics fonctionne sans cookies et respecte les
                  directives ePrivacy de l'UE.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-2">Modifications de cette politique</h3>
                <p>
                  Nous nous réservons le droit de modifier cette politique de confidentialité à tout moment.
                  Les modifications seront publiées sur cette page avec une date de mise à jour.
                </p>
                <p className="mt-2 text-sm">
                  <strong>Dernière mise à jour :</strong> {new Date().toLocaleDateString('fr-FR')}
                </p>
              </div>
            </div>
          </Card>

          {/* Open Source Notice */}
          <Card className="p-8 bg-gradient-to-br from-primary/5 to-background">
            <div className="space-y-4">
              <h3 className="text-xl font-semibold">Projet Open Source</h3>
              <p className="text-muted-foreground">
                GPXIFY est un projet open-source. Le code source est disponible publiquement et peut être
                audité par n'importe qui. Cela garantit transparence et confiance dans le traitement de vos
                données.
              </p>
              <div className="flex gap-3">
                <Button
                  onClick={() =>
                    window.open('https://github.com/Jalmin/gpxify', '_blank', 'noopener,noreferrer')
                  }
                  variant="outline"
                >
                  Voir le code source
                </Button>
                <Button onClick={() => navigate('/')}>Retour à l'accueil</Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
