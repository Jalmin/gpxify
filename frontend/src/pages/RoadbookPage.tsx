import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams } from 'react-router-dom';
import {
  Mountain,
  Clock,
  Droplets,
  StickyNote,
  ChevronDown,
  Loader2,
  AlertCircle,
  Sun,
  Sunset,
  MapPin,
  Download,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ptpApi } from '@/services/api';
import { Race, RunnerConfig, SunTimes } from '@/types/ptp';
import { Footer } from '@/components/Footer';
import { PTPElevationProfile } from '@/components/PTPElevationProfile';
import { exportToPDF, ExportMode } from '@/utils/pdfExport';

// Build timestamp - evaluated at build time by Vite define
declare const __BUILD_TIME__: string;

export function RoadbookPage() {
  const { slug } = useParams<{ slug?: string }>();

  // Race selection
  const [races, setRaces] = useState<Race[]>([]);
  const [selectedRace, setSelectedRace] = useState<Race | null>(null);
  const [isLoadingRaces, setIsLoadingRaces] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Runner config
  const [config, setConfig] = useState<RunnerConfig>({
    departure_time: '',
    flask_capacity: 2,
    flask_capacities: {},
    notes: {},
  });

  // Sun times
  const [sunTimes, setSunTimes] = useState<SunTimes | null>(null);
  const [isLoadingSunTimes, setIsLoadingSunTimes] = useState(false);

  // PDF export
  const [isExporting, setIsExporting] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  // Load published races on mount
  useEffect(() => {
    loadRaces();
  }, []);

  // Load sun times when race and departure time are set
  useEffect(() => {
    if (selectedRace && config.departure_time && selectedRace.start_location_lat) {
      loadSunTimes();
    }
  }, [selectedRace, config.departure_time]);

  const loadRaces = async () => {
    setIsLoadingRaces(true);
    setError(null);
    try {
      const racesList = await ptpApi.getPublishedRaces();
      setRaces(racesList);

      // Auto-select race if slug is provided in URL
      if (slug && racesList.length > 0) {
        const matchingRace = racesList.find((r) => r.slug === slug);
        if (matchingRace) {
          // Load full race details including gpx_content
          const fullRace = await ptpApi.getRaceBySlug(slug);
          setSelectedRace(fullRace);
        } else {
          setError(`Course "${slug}" non trouvée`);
        }
      }
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      // Handle Pydantic validation errors which return an object/array
      const errorMsg = typeof detail === 'string'
        ? detail
        : detail?.msg || JSON.stringify(detail) || 'Erreur de chargement des courses';
      setError(errorMsg);
    } finally {
      setIsLoadingRaces(false);
    }
  };

  const loadSunTimes = async () => {
    if (!selectedRace?.start_location_lat || !config.departure_time) return;

    setIsLoadingSunTimes(true);
    try {
      const date = config.departure_time.split('T')[0];
      const response = await ptpApi.getSunTimes({
        lat: selectedRace.start_location_lat,
        lon: selectedRace.start_location_lon || 0,
        date,
      });
      if (response.success && response.data) {
        setSunTimes(response.data);
      }
    } catch (err) {
      console.error('Error loading sun times:', err);
    } finally {
      setIsLoadingSunTimes(false);
    }
  };

  const handleRaceSelect = async (raceId: string) => {
    const race = races.find((r) => r.id === raceId);
    if (!race) {
      setSelectedRace(null);
      return;
    }
    setSunTimes(null);
    setConfig((prev) => ({ ...prev, notes: {}, flask_capacities: {} }));

    // Load full race details including gpx_content
    try {
      const fullRace = await ptpApi.getRaceBySlug(race.slug);
      setSelectedRace(fullRace);
    } catch (err) {
      console.error('Error loading race details:', err);
      setSelectedRace(race);
    }
  };

  // Calculate estimated passage times based on Naismith formula
  const passageTimes = useMemo(() => {
    if (!selectedRace || !config.departure_time) return [];

    const departureDate = new Date(config.departure_time);
    if (isNaN(departureDate.getTime())) return [];

    // Base pace: ~5 km/h + adjustment for elevation
    const basePaceKmH = config.pace_override || 5;

    return selectedRace.aid_stations.map((station) => {
      // Simple Naismith: add 1 hour per 600m of climb
      const elevationPenaltyHours = (station.elevation || 0) / 600 / 2; // rough estimate
      const distanceHours = station.distance_km / basePaceKmH;
      const totalHours = distanceHours + elevationPenaltyHours;

      const arrivalTime = new Date(departureDate.getTime() + totalHours * 60 * 60 * 1000);

      return {
        station,
        arrival: arrivalTime,
        timeFromStart: Math.round(totalHours * 60), // minutes
      };
    });
  }, [selectedRace, config.departure_time, config.pace_override]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDuration = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h${m.toString().padStart(2, '0')}`;
  };

  const getStationIcon = (type: string) => {
    switch (type) {
      case 'eau':
        return '💧';
      case 'bouffe':
        return '🍽️';
      case 'assistance':
        return '👥';
      default:
        return '📍';
    }
  };

  const handleExportPDF = async (mode: ExportMode) => {
    if (!exportRef.current || !selectedRace) return;

    setIsExporting(true);
    try {
      await exportToPDF({
        raceName: selectedRace.name,
        mode,
        element: exportRef.current,
      });
    } catch (err) {
      console.error('Export error:', err);
      alert('Erreur lors de l\'export PDF');
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoadingRaces) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center pt-16">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col pt-16">
      <div className="flex-1 p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold flex items-center justify-center gap-2">
              <Mountain className="w-8 h-8 text-primary" />
              Roadbook
            </h1>
            <p className="text-muted-foreground">
              Prépare ton roadbook personnalisé avec temps de passage et notes
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-4 bg-destructive/10 text-destructive rounded-md">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          {/* Race Selector */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">1. Choisis ta course</CardTitle>
            </CardHeader>
            <CardContent>
              {races.length === 0 ? (
                <p className="text-muted-foreground">Aucune course disponible pour le moment.</p>
              ) : (
                <div className="relative">
                  <select
                    value={selectedRace?.id || ''}
                    onChange={(e) => handleRaceSelect(e.target.value)}
                    className="w-full px-4 py-3 bg-background border border-border rounded-md appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Sélectionne une course...</option>
                    {races.map((race) => (
                      <option key={race.id} value={race.id}>
                        {race.name} - {race.total_distance_km}km | {race.total_elevation_gain}m D+
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Runner Config */}
          {selectedRace && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">2. Configure ton départ</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Departure time */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium mb-1">
                      <Clock className="w-4 h-4" />
                      Heure de départ
                    </label>
                    <input
                      type="datetime-local"
                      value={config.departure_time}
                      onChange={(e) =>
                        setConfig((prev) => ({ ...prev, departure_time: e.target.value }))
                      }
                      onClick={(e) => {
                        // Force open picker on Chrome Mac
                        const input = e.target as HTMLInputElement;
                        if (input.showPicker) {
                          try {
                            input.showPicker();
                          } catch {
                            // Ignore if already open
                          }
                        }
                      }}
                      className="w-full px-4 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                    />
                  </div>

                  {/* Flask capacity - default for all segments */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium mb-1">
                      <Droplets className="w-4 h-4" />
                      Flasques par défaut
                    </label>
                    <select
                      value={config.flask_capacity}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          flask_capacity: parseInt(e.target.value),
                          flask_capacities: {}, // Reset per-segment when default changes
                        }))
                      }
                      className="w-full px-4 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value={2}>2 flasques (1L)</option>
                      <option value={3}>3 flasques (1.5L)</option>
                    </select>
                  </div>

                  {/* Pace override */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium mb-1">
                      <Mountain className="w-4 h-4" />
                      Allure moyenne (km/h)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="2"
                      max="15"
                      value={config.pace_override || ''}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          pace_override: e.target.value ? parseFloat(e.target.value) : undefined,
                        }))
                      }
                      placeholder="5 (Naismith par défaut)"
                      className="w-full px-4 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>

                {/* Sun times display */}
                {sunTimes && (
                  <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-md text-sm">
                    {isLoadingSunTimes ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <span className="flex items-center gap-1">
                          <Sun className="w-4 h-4 text-yellow-500" />
                          Lever: {sunTimes.sunrise.slice(0, 5)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Sunset className="w-4 h-4 text-orange-500" />
                          Coucher: {sunTimes.sunset.slice(0, 5)}
                        </span>
                        <span className="text-muted-foreground">
                          Durée du jour: {sunTimes.day_length}
                        </span>
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Export content wrapper - print-friendly theme with horizontal scroll */}
          <div className="overflow-x-auto">
          <div ref={exportRef} className="print-content space-y-6 bg-white p-4 rounded-lg min-w-[900px]">
          {/* Elevation Profile - show even without aid stations */}
          {selectedRace && selectedRace.gpx_content && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Mountain className="w-5 h-5" />
                  Profil altimétrique
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <PTPElevationProfile
                  gpxContent={selectedRace.gpx_content}
                  passageTimes={passageTimes}
                  departureTime={config.departure_time ? new Date(config.departure_time) : undefined}
                  sunTimes={sunTimes}
                  totalDistanceKm={selectedRace.total_distance_km || 0}
                />
                {/* Quick summary under profile */}
                {config.departure_time && passageTimes.length > 0 && (
                  <div className="flex flex-wrap items-center justify-center gap-6 pt-2 text-sm border-t border-border">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Départ:</span>
                      <span className="font-bold">{formatTime(new Date(config.departure_time))}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mountain className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Temps estimé:</span>
                      <span className="font-bold">{formatDuration(passageTimes[passageTimes.length - 1].timeFromStart)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-primary" />
                      <span className="text-muted-foreground">Arrivée:</span>
                      <span className="font-bold text-primary">{formatTime(passageTimes[passageTimes.length - 1].arrival)}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Roadbook Table */}
          {selectedRace && config.departure_time && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  3. Ton roadbook - {selectedRace.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left p-3">Ravito</th>
                        <th className="text-right p-3">Km</th>
                        <th className="text-right p-3">Alt.</th>
                        <th className="text-center p-3">Type</th>
                        <th className="text-center p-3">
                          <Droplets className="w-4 h-4 inline" /> Flasques
                        </th>
                        <th className="text-center p-3">Passage</th>
                        <th className="text-center p-3">Temps</th>
                        <th className="text-left p-3">
                          <StickyNote className="w-4 h-4 inline" /> Notes
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {passageTimes.map(({ station, arrival, timeFromStart }, i) => (
                        <tr key={station.position_order} className="border-t hover:bg-muted/50">
                          <td className="p-3 font-medium">{station.name}</td>
                          <td className="p-3 text-right">{station.distance_km}</td>
                          <td className="p-3 text-right">{station.elevation || '-'}</td>
                          <td className="p-3 text-center text-lg">{getStationIcon(station.type)}</td>
                          <td className="p-3">
                            <div className="flex justify-center">
                              <select
                                value={config.flask_capacities[i] ?? config.flask_capacity}
                                onChange={(e) =>
                                  setConfig((prev) => ({
                                    ...prev,
                                    flask_capacities: {
                                      ...prev.flask_capacities,
                                      [i]: parseInt(e.target.value),
                                    },
                                  }))
                                }
                                className="px-2 py-1 text-sm bg-background border border-border rounded text-center focus:outline-none focus:ring-1 focus:ring-primary"
                              >
                                <option value={2}>2</option>
                                <option value={3}>3</option>
                              </select>
                            </div>
                          </td>
                          <td className="p-3 text-center font-mono">{formatTime(arrival)}</td>
                          <td className="p-3 text-center text-muted-foreground">
                            +{formatDuration(timeFromStart)}
                          </td>
                          <td className="p-3">
                            <div className="flex justify-center">
                              <input
                                type="text"
                                value={config.notes[station.id || i.toString()] || ''}
                                onChange={(e) =>
                                  setConfig((prev) => ({
                                    ...prev,
                                    notes: {
                                      ...prev.notes,
                                      [station.id || i.toString()]: e.target.value,
                                    },
                                  }))
                                }
                                placeholder="Gel, sel, etc."
                                className="w-full max-w-[150px] px-2 py-1 text-sm bg-background border border-border rounded text-center focus:outline-none focus:ring-1 focus:ring-primary"
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Summary */}
                <div className="mt-4 p-4 bg-muted/50 rounded-md">
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Distance totale</span>
                      <div className="font-bold">{selectedRace.total_distance_km} km</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">D+ total</span>
                      <div className="font-bold">{selectedRace.total_elevation_gain} m</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Ravitaillements</span>
                      <div className="font-bold">{selectedRace.aid_stations.length}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Temps estimé</span>
                      <div className="font-bold">
                        {passageTimes.length > 0
                          ? formatDuration(passageTimes[passageTimes.length - 1].timeFromStart)
                          : '-'}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Arrivée estimée</span>
                      <div className="font-bold">
                        {passageTimes.length > 0
                          ? formatTime(passageTimes[passageTimes.length - 1].arrival)
                          : '-'}
                      </div>
                    </div>
                  </div>
                </div>

                </CardContent>
            </Card>
          )}
          </div>
          </div>
          {/* End export content wrapper */}

          {/* Export buttons */}
          {selectedRace && config.departure_time && (
            <div className="flex flex-wrap gap-3 justify-center">
              <Button
                onClick={() => handleExportPDF('runner')}
                disabled={isExporting}
                className="gap-2"
              >
                {isExporting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                Export PDF Coureur
              </Button>
              <Button
                variant="outline"
                onClick={() => handleExportPDF('assistance')}
                disabled={isExporting}
                className="gap-2"
              >
                {isExporting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                Export PDF Assistance
              </Button>
            </div>
          )}

          {/* Empty state */}
          {!selectedRace && races.length > 0 && (
            <Card className="p-8 text-center text-muted-foreground">
              <Mountain className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Sélectionne une course pour commencer à préparer ton roadbook</p>
            </Card>
          )}
        </div>
      </div>
      {/* Build version for debugging */}
      <div className="text-center text-xs text-muted-foreground/50 py-2">
        Build: {__BUILD_TIME__}
      </div>
      <Footer />
    </div>
  );
}