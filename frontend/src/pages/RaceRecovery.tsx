import { useState } from 'react';
import { Upload, Download, AlertCircle, Check, Zap, BarChart3, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { API_BASE_URL } from '@/services/api';
import { Footer } from '@/components/Footer';
import { validateGPXFile, formatValidationError } from '@/utils/gpxValidator';

export function RaceRecovery() {
  const [incompleteFile, setIncompleteFile] = useState<File | null>(null);
  const [completeFile, setCompleteFile] = useState<File | null>(null);
  const [officialTime, setOfficialTime] = useState('');
  const [approxDistance, setApproxDistance] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const handleIncompleteFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setIncompleteFile(e.target.files[0]);
      setError(null);
      setSuccess(false);
    }
  };

  const handleCompleteFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setCompleteFile(e.target.files[0]);
      setError(null);
      setSuccess(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!incompleteFile || !completeFile || !officialTime) {
      setError('Tous les champs sont obligatoires');
      return;
    }

    // Validate time format
    const timeRegex = /^(\d{1,2}):(\d{2}):(\d{2})$|^(\d{1,2}):(\d{2})$/;
    if (!timeRegex.test(officialTime)) {
      setError('Format de temps invalide. Utilisez HH:MM:SS ou MM:SS');
      return;
    }

    // Validate GPX files client-side
    const incompleteValidation = await validateGPXFile(incompleteFile);
    if (!incompleteValidation.valid) {
      setError(`GPX incomplet: ${formatValidationError(incompleteValidation)}`);
      return;
    }

    const completeValidation = await validateGPXFile(completeFile);
    if (!completeValidation.valid) {
      setError(`GPX complet: ${formatValidationError(completeValidation)}`);
      return;
    }

    setIsProcessing(true);
    setError(null);
    setSuccess(false);

    try {
      const formData = new FormData();
      formData.append('incomplete_gpx', incompleteFile);
      formData.append('complete_gpx', completeFile);
      formData.append('official_time', officialTime);
      if (approxDistance) {
        formData.append('approx_distance_km', approxDistance);
      }

      const response = await fetch(`${API_BASE_URL}/api/v1/race/recover`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Erreur lors de la reconstitution');
      }

      // Get GPX file as blob
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setSuccess(true);
    } catch (err: any) {
      console.error('Recovery error:', err);
      setError(err.message || 'Erreur lors de la reconstitution');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (downloadUrl) {
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = 'recovered_race.gpx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col pt-16">
      <div className="flex-1 p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold">Sauve ma course</h1>
            <p className="text-muted-foreground">
              Reconstitue un GPX complet quand ta montre est tombée en panne de batterie
            </p>
          </div>

        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* GPX Incomplet */}
            <div className="space-y-2">
              <label className="block text-sm font-medium">
                GPX incomplet (avec temps)
                <span className="text-muted-foreground ml-2">
                  - De ta montre/Strava
                </span>
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  accept=".gpx"
                  onChange={handleIncompleteFileChange}
                  className="block w-full text-sm text-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                />
                {incompleteFile && (
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                )}
              </div>
            </div>

            {/* GPX Complet */}
            <div className="space-y-2">
              <label className="block text-sm font-medium">
                GPX complet (sans temps)
                <span className="text-muted-foreground ml-2">
                  - Tracé officiel de la course
                </span>
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  accept=".gpx"
                  onChange={handleCompleteFileChange}
                  className="block w-full text-sm text-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                />
                {completeFile && (
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                )}
              </div>
            </div>

            {/* Temps officiel */}
            <div className="space-y-2">
              <label className="block text-sm font-medium">
                Temps officiel final
                <span className="text-muted-foreground ml-2">
                  (Format: HH:MM:SS ou MM:SS)
                </span>
              </label>
              <input
                type="text"
                value={officialTime}
                onChange={(e) => setOfficialTime(e.target.value)}
                placeholder="3:45:30"
                className="w-full px-4 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Distance approximative (optionnel) */}
            <div className="space-y-2">
              <label className="block text-sm font-medium">
                Distance parcourue approximative
                <span className="text-muted-foreground ml-2">
                  (Optionnel, en km - aide à trouver précisément le point d'arrêt)
                </span>
              </label>
              <input
                type="number"
                step="0.1"
                value={approxDistance}
                onChange={(e) => setApproxDistance(e.target.value)}
                placeholder="48.5"
                className="w-full px-4 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <p className="text-xs text-muted-foreground">
                Si tu sais environ combien de km tu avais parcouru, indique-le ici (ex: 48). L'algorithme cherchera uniquement autour de cette distance (±5km).
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-start gap-3 p-4 bg-destructive/10 text-destructive rounded-md">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <p className="text-sm">{error}</p>
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="flex items-start gap-3 p-4 bg-green-500/10 text-green-600 rounded-md">
                <Check className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div className="space-y-2 flex-1">
                  <p className="text-sm font-medium">GPX reconstitué avec succès !</p>
                  <Button
                    type="button"
                    onClick={handleDownload}
                    variant="outline"
                    className="gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Télécharger le GPX complet
                  </Button>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isProcessing || !incompleteFile || !completeFile || !officialTime}
              className="w-full gap-2"
            >
              {isProcessing ? (
                <>
                  <Upload className="w-4 h-4 animate-spin" />
                  Reconstitution en cours...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Reconstituer le GPX
                </>
              )}
            </Button>
          </form>
        </Card>

        {/* Info Card */}
        <Card className="p-6 bg-muted/50">
          <h3 className="font-semibold mb-3">Comment ça marche ?</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>
              <strong>1.</strong> Upload le GPX partiel enregistré par ta montre (avec les
              timestamps)
            </li>
            <li>
              <strong>2.</strong> Upload le tracé complet de la course (GPX officiel, sans temps)
            </li>
            <li>
              <strong>3.</strong> Entre ton temps final officiel
            </li>
            <li>
              <strong>4.</strong> L'algorithme calcule les timestamps manquants en tenant compte
              de la pente du terrain
            </li>
            <li className="pt-2 italic">
              Formule: Vitesse = Vitesse moyenne × (1 - 2 × pente). Plus c'est pentu, plus tu es
              lent !
            </li>
          </ul>
        </Card>

        {/* Smart Navigation */}
        {success ? (
          <Card className="p-6 border-2 border-primary/20">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Zap className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">Et maintenant ?</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Ton GPX a été reconstitué avec succès ! Tu peux maintenant :
              </p>
              <div className="grid gap-3">
                <Link to="/">
                  <Button variant="outline" className="w-full justify-start gap-3">
                    <BarChart3 className="w-4 h-4" />
                    <div className="text-left">
                      <div className="font-medium">Analyser ton parcours</div>
                      <div className="text-xs text-muted-foreground">
                        Visualise tes stats, profil d'élévation et performance
                      </div>
                    </div>
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        ) : (
          <div className="flex justify-center">
            <Link to="/">
              <Button variant="ghost" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Retour aux outils d'analyse
              </Button>
            </Link>
          </div>
        )}
        </div>
      </div>

      <Footer />
    </div>
  );
}
