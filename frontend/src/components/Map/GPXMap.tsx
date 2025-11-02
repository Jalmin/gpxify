import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Track } from '@/types/gpx';

// Fix Leaflet default icon issue with Vite
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

interface GPXMapProps {
  tracks: Track[];
  onMapReady?: (map: L.Map) => void;
}

export function GPXMap({ tracks, onMapReady }: GPXMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const polylineLayersRef = useRef<L.Polyline[]>([]);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Initialize map only once
    if (!mapRef.current) {
      const map = L.map(mapContainerRef.current).setView([46.5, 6.5], 10);

      // Add OpenTopoMap - colorful, high contrast topographic map for outdoor activities
      L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        attribution:
          'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, ' +
          '<a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)',
        maxZoom: 17,
      }).addTo(map);

      mapRef.current = map;

      if (onMapReady) {
        onMapReady(map);
      }
    }

    return () => {
      // Cleanup only when component unmounts
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update tracks when they change
  useEffect(() => {
    if (!mapRef.current || tracks.length === 0) return;

    // Remove old polylines
    polylineLayersRef.current.forEach((layer) => {
      mapRef.current?.removeLayer(layer);
    });
    polylineLayersRef.current = [];

    // Vibrant colors that stand out on dark background (red first for better visibility)
    const colors = ['#ef4444', '#a855f7', '#22c55e', '#f97316', '#ec4899'];
    const allBounds: L.LatLngBounds[] = [];

    // Add new tracks
    tracks.forEach((track, index) => {
      const points: [number, number][] = track.points.map((p) => [p.lat, p.lon]);

      if (points.length === 0) return;

      const color = colors[index % colors.length];
      const polyline = L.polyline(points, {
        color,
        weight: 4,
        opacity: 0.9,
      }).addTo(mapRef.current!);

      polylineLayersRef.current.push(polyline);

      // Add popup with track info
      const stats = track.statistics;
      const popupContent = `
        <div class="text-sm">
          <strong>${track.name || 'Sans nom'}</strong><br/>
          Distance: ${(stats.total_distance / 1000).toFixed(2)} km<br/>
          D+: ${Math.round(stats.total_elevation_gain)} m<br/>
          D-: ${Math.round(stats.total_elevation_loss)} m
        </div>
      `;
      polyline.bindPopup(popupContent);

      allBounds.push(polyline.getBounds());
    });

    // Fit map to show all tracks
    if (allBounds.length > 0) {
      const combinedBounds = allBounds.reduce((acc, bounds) => acc.extend(bounds));
      mapRef.current.fitBounds(combinedBounds, { padding: [50, 50] });
    }
  }, [tracks]);

  return (
    <div
      ref={mapContainerRef}
      className="w-full h-full rounded-lg overflow-hidden shadow-md"
      style={{ minHeight: '400px' }}
    />
  );
}
