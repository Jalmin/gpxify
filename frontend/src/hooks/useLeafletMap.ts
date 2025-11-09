/**
 * Custom hook for managing Leaflet map instance
 */
import { useState } from 'react';
import L from 'leaflet';

export const useLeafletMap = () => {
  const [map, setMap] = useState<L.Map | null>(null);

  return {
    map,
    setMap,
  };
};
