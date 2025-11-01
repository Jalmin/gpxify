import { useEffect, useRef } from 'react';
import L from 'leaflet';
import '@raruto/leaflet-elevation';
import '@raruto/leaflet-elevation/dist/leaflet-elevation.css';
import { Track } from '@/types/gpx';

interface ElevationProfileProps {
  track: Track;
  map?: L.Map;
}

export function ElevationProfile({ track, map }: ElevationProfileProps) {
  const elevationRef = useRef<HTMLDivElement>(null);
  const elevationControlRef = useRef<any>(null);

  useEffect(() => {
    if (!elevationRef.current || !map) return;

    // Clean up previous elevation control
    if (elevationControlRef.current) {
      elevationControlRef.current.remove();
      elevationControlRef.current = null;
    }

    // Create elevation control
    const elevationControl = (L.control as any).elevation({
      theme: 'steelblue-theme',
      position: 'bottomright',
      collapsed: false,
      detached: true,
      elevationDiv: '#elevation-div',
      width: elevationRef.current.offsetWidth,
      height: 200,
      margins: {
        top: 30,
        right: 30,
        bottom: 30,
        left: 50,
      },
      imperial: false,
      altitude: true,
      slope: true,
      speed: false,
      acceleration: false,
      time: false,
      legend: true,
      followMarker: true,
      autohide: false,
      downloadLink: false,
    });

    elevationControl.addTo(map);
    elevationControlRef.current = elevationControl;

    // Convert track to GeoJSON
    const coordinates = track.points.map((p) => [p.lon, p.lat, p.elevation || 0]);

    const geojson = {
      type: 'FeatureCollection' as const,
      features: [
        {
          type: 'Feature' as const,
          properties: {
            name: track.name || 'Track',
          },
          geometry: {
            type: 'LineString' as const,
            coordinates,
          },
        },
      ],
    };

    // Load data into elevation control
    elevationControl.load(geojson);

    return () => {
      if (elevationControlRef.current) {
        elevationControlRef.current.remove();
        elevationControlRef.current = null;
      }
    };
  }, [track, map]);

  return (
    <div className="w-full">
      <div id="elevation-div" ref={elevationRef} className="elevation-div bg-white rounded-lg shadow-md p-4" />
    </div>
  );
}
