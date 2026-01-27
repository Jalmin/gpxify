import { useState, useEffect } from 'react';
import {
  Lock,
  LogOut,
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  FileText,
  AlertCircle,
  Check,
  Loader2,
  ArrowLeft,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { adminApi, gpxApi } from '@/services/api';
import { Race, RaceCreate, RaceAidStation, ParsedRavito } from '@/types/ptp';
import { Footer } from '@/components/Footer';

type ViewMode = 'list' | 'create' | 'edit';

export function AdminPage() {
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // List state
  const [races, setRaces] = useState<Race[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [editingRace, setEditingRace] = useState<Race | null>(null);
  const [formData, setFormData] = useState<RaceCreate>({
    name: '',
    slug: '',
    description: '',
    gpx_content: '',
    is_published: false,
    aid_stations: [],
  });
  const [gpxPreview, setGpxPreview] = useState<{ distance: number; elevation: number } | null>(null);
  const [ravitoText, setRavitoText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Check for existing token on mount
  useEffect(() => {
    const token = adminApi.getToken();
    if (token) {
      setIsAuthenticated(true);
      loadRaces();
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setAuthError(null);

    try {
      const response = await adminApi.login(password);
      if (response.success) {
        setIsAuthenticated(true);
        setPassword('');
        loadRaces();
      } else {
        setAuthError(response.message || 'Mot de passe incorrect');
      }
    } catch (err: any) {
      setAuthError(err.response?.data?.detail || 'Erreur de connexion');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await adminApi.logout();
    setIsAuthenticated(false);
    setRaces([]);
  };

  const loadRaces = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const races = await adminApi.getRaces();
      setRaces(races);
    } catch (err: any) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        // Token invalid or expired - force re-login
        setIsAuthenticated(false);
        adminApi.setToken(null);
      } else {
        setError(err.response?.data?.detail || 'Erreur de chargement');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNew = () => {
    setFormData({
      name: '',
      slug: '',
      description: '',
      gpx_content: '',
      is_published: false,
      aid_stations: [],
    });
    setGpxPreview(null);
    setRavitoText('');
    setEditingRace(null);
    setViewMode('create');
    setSaveError(null);
  };

  const handleEdit = async (race: Race) => {
    setEditingRace(race);
    setFormData({
      name: race.name,
      slug: race.slug,
      description: race.description || '',
      gpx_content: race.gpx_content,
      is_published: race.is_published,
      aid_stations: race.aid_stations.map((s) => ({
        name: s.name,
        distance_km: s.distance_km,
        elevation: s.elevation,
        type: s.type,
        services: s.services,
        cutoff_time: s.cutoff_time,
        position_order: s.position_order,
      })),
    });
    setGpxPreview({
      distance: race.total_distance_km || 0,
      elevation: race.total_elevation_gain || 0,
    });
    setViewMode('edit');
    setSaveError(null);
  };

  const handleDelete = async (race: Race) => {
    if (!confirm(`Supprimer la course "${race.name}" ?`)) return;

    try {
      await adminApi.deleteRace(race.id);
      loadRaces();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erreur de suppression');
    }
  };

  const handleTogglePublish = async (race: Race) => {
    try {
      await adminApi.updateRace(race.id, { is_published: !race.is_published });
      loadRaces();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erreur de mise à jour');
    }
  };

  const handleGpxUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // Read file content
      const content = await file.text();
      setFormData((prev) => ({ ...prev, gpx_content: content }));

      // Parse GPX for preview
      const response = await gpxApi.uploadGPX(file);
      if (response.success && response.data?.tracks?.[0]) {
        const stats = response.data.tracks[0].statistics;
        setGpxPreview({
          distance: Math.round(stats.total_distance / 10) / 100,
          elevation: Math.round(stats.total_elevation_gain),
        });
      }
    } catch (err) {
      console.error('GPX parse error:', err);
    }
  };

  const handleParseRavito = async () => {
    if (!ravitoText.trim()) return;

    setIsParsing(true);
    setParseError(null);

    try {
      const result = await adminApi.parseRavitoTable(ravitoText);
      const aidStations: Omit<RaceAidStation, 'id'>[] = result.ravitos.map(
        (r: ParsedRavito, i: number) => ({
          name: r.name,
          distance_km: r.distance_km,
          elevation: r.elevation,
          type: r.type,
          services: r.services,
          cutoff_time: r.cutoff_time,
          position_order: i + 1,
        })
      );
      setFormData((prev) => ({ ...prev, aid_stations: aidStations }));
    } catch (err: any) {
      setParseError(err.response?.data?.detail || 'Erreur de parsing');
    } finally {
      setIsParsing(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.slug || !formData.gpx_content) {
      setSaveError('Nom, slug et GPX sont obligatoires');
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      if (editingRace) {
        await adminApi.updateRace(editingRace.id, formData);
      } else {
        await adminApi.createRace(formData);
      }
      setViewMode('list');
      loadRaces();
    } catch (err: any) {
      setSaveError(err.response?.data?.detail || 'Erreur de sauvegarde');
    } finally {
      setIsSaving(false);
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  };

  // Login form
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex flex-col pt-16">
        <div className="flex-1 flex items-center justify-center p-6">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5" />
                Administration PTP
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Mot de passe</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Entrez le mot de passe admin"
                    autoFocus
                  />
                </div>

                {authError && (
                  <div className="flex items-center gap-2 text-destructive text-sm">
                    <AlertCircle className="w-4 h-4" />
                    {authError}
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={isLoggingIn || !password}>
                  {isLoggingIn ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Connexion...
                    </>
                  ) : (
                    'Se connecter'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  // Create/Edit form
  if (viewMode === 'create' || viewMode === 'edit') {
    return (
      <div className="min-h-screen bg-background flex flex-col pt-16">
        <div className="flex-1 p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => setViewMode('list')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour
              </Button>
              <h1 className="text-2xl font-bold">
                {viewMode === 'create' ? 'Nouvelle course' : `Modifier: ${editingRace?.name}`}
              </h1>
            </div>

            <Card className="p-6">
              <div className="space-y-6">
                {/* Name & Slug */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Nom de la course *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => {
                        setFormData((prev) => ({
                          ...prev,
                          name: e.target.value,
                          slug: prev.slug || generateSlug(e.target.value),
                        }));
                      }}
                      className="w-full px-4 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="UTMB 2025"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Slug (URL) *</label>
                    <input
                      type="text"
                      value={formData.slug}
                      onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
                      className="w-full px-4 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="utmb-2025"
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                    className="w-full px-4 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    rows={2}
                    placeholder="Ultra-Trail du Mont-Blanc, 171km, 10000m D+"
                  />
                </div>

                {/* GPX Upload */}
                <div>
                  <label className="block text-sm font-medium mb-1">Fichier GPX *</label>
                  <div className="flex items-center gap-4">
                    <input
                      type="file"
                      accept=".gpx"
                      onChange={handleGpxUpload}
                      className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                    />
                    {gpxPreview && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Check className="w-4 h-4 text-green-500" />
                        {gpxPreview.distance} km | {gpxPreview.elevation} m D+
                      </div>
                    )}
                  </div>
                </div>

                {/* Ravito Table Parsing */}
                <div className="border-t pt-6">
                  <label className="block text-sm font-medium mb-1">
                    <FileText className="w-4 h-4 inline mr-1" />
                    Tableau des ravitaillements (copier-coller)
                  </label>
                  <textarea
                    value={ravitoText}
                    onChange={(e) => setRavitoText(e.target.value)}
                    className="w-full px-4 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
                    rows={6}
                    placeholder="Collez ici le tableau des ravitos depuis le site officiel..."
                  />
                  <div className="flex items-center gap-4 mt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleParseRavito}
                      disabled={isParsing || !ravitoText.trim()}
                    >
                      {isParsing ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Analyse en cours...
                        </>
                      ) : (
                        'Analyser avec IA'
                      )}
                    </Button>
                    {parseError && (
                      <span className="text-destructive text-sm">{parseError}</span>
                    )}
                  </div>
                </div>

                {/* Aid Stations Preview */}
                {formData.aid_stations && formData.aid_stations.length > 0 && (
                  <div className="border-t pt-6">
                    <h3 className="text-sm font-medium mb-2">
                      Ravitaillements détectés ({formData.aid_stations.length})
                    </h3>
                    <div className="max-h-60 overflow-y-auto border rounded-md">
                      <table className="w-full text-sm">
                        <thead className="bg-muted sticky top-0">
                          <tr>
                            <th className="text-left p-2">#</th>
                            <th className="text-left p-2">Nom</th>
                            <th className="text-right p-2">Km</th>
                            <th className="text-right p-2">Alt.</th>
                            <th className="text-left p-2">Type</th>
                          </tr>
                        </thead>
                        <tbody>
                          {formData.aid_stations.map((station, i) => (
                            <tr key={i} className="border-t">
                              <td className="p-2 text-muted-foreground">{i + 1}</td>
                              <td className="p-2">{station.name}</td>
                              <td className="p-2 text-right">{station.distance_km}</td>
                              <td className="p-2 text-right">{station.elevation || '-'}</td>
                              <td className="p-2">
                                {station.type === 'eau' && '💧'}
                                {station.type === 'bouffe' && '🍽️'}
                                {station.type === 'assistance' && '👥'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Published toggle */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_published"
                    checked={formData.is_published}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, is_published: e.target.checked }))
                    }
                    className="w-4 h-4"
                  />
                  <label htmlFor="is_published" className="text-sm">
                    Publier la course (visible sur la page roadbook)
                  </label>
                </div>

                {/* Save error */}
                {saveError && (
                  <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-md">
                    <AlertCircle className="w-4 h-4" />
                    {saveError}
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button variant="outline" onClick={() => setViewMode('list')}>
                    Annuler
                  </Button>
                  <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Enregistrement...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Enregistrer
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // List view
  return (
    <div className="min-h-screen bg-background flex flex-col pt-16">
      <div className="flex-1 p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Administration PTP</h1>
            <div className="flex items-center gap-3">
              <Button onClick={handleCreateNew}>
                <Plus className="w-4 h-4 mr-2" />
                Nouvelle course
              </Button>
              <Button variant="ghost" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Déconnexion
              </Button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-4 bg-destructive/10 text-destructive rounded-md">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : races.length === 0 ? (
                <div className="text-center p-8 text-muted-foreground">
                  Aucune course. Cliquez sur "Nouvelle course" pour commencer.
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-4">Course</th>
                      <th className="text-right p-4">Distance</th>
                      <th className="text-right p-4">D+</th>
                      <th className="text-center p-4">Ravitos</th>
                      <th className="text-center p-4">Status</th>
                      <th className="text-right p-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {races.map((race) => (
                      <tr key={race.id} className="border-t hover:bg-muted/50">
                        <td className="p-4">
                          <div className="font-medium">{race.name}</div>
                          <div className="text-sm text-muted-foreground">/{race.slug}</div>
                        </td>
                        <td className="p-4 text-right">
                          {race.total_distance_km ? `${race.total_distance_km} km` : '-'}
                        </td>
                        <td className="p-4 text-right">
                          {race.total_elevation_gain ? `${race.total_elevation_gain} m` : '-'}
                        </td>
                        <td className="p-4 text-center">{race.aid_stations.length}</td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => handleTogglePublish(race)}
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                              race.is_published
                                ? 'bg-green-500/20 text-green-600'
                                : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {race.is_published ? (
                              <>
                                <Eye className="w-3 h-3" /> Publié
                              </>
                            ) : (
                              <>
                                <EyeOff className="w-3 h-3" /> Brouillon
                              </>
                            )}
                          </button>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => handleEdit(race)}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(race)}>
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      <Footer />
    </div>
  );
}