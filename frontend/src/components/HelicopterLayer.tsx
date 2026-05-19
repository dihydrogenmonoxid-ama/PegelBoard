import { useEffect, useRef } from 'react';
import type { Map as LeafletMap } from 'leaflet';
import L from 'leaflet';

export interface Helicopter {
  icao24: string;
  callsign: string;
  lat: number;
  lon: number;
  altitude: number;
  heading: number;
  velocity: number;
  display_name?: string;
}

interface Props {
  map: LeafletMap | null;
  helicopters: Helicopter[];
}

const heliIcon = L.divIcon({
  html: '<span style="font-size:20px;line-height:1">🚁</span>',
  className: '',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

export default function HelicopterLayer({ map, helicopters }: Props) {
  const markersRef = useRef<L.Marker[]>([]);

  useEffect(() => {
    if (!map) return;

    // Remove old markers
    for (const m of markersRef.current) m.remove();
    markersRef.current = [];

    for (const heli of helicopters) {
      const label = heli.display_name ?? heli.callsign;
      const marker = L.marker([heli.lat, heli.lon], { icon: heliIcon, zIndexOffset: 500 })
        .bindPopup(
          `<b>${label}</b>${heli.display_name ? `<br/><span style="opacity:.6">${heli.callsign}</span>` : ''}<br/>` +
          `Höhe: ${Math.round(heli.altitude)} m<br/>` +
          `Geschw.: ${Math.round(heli.velocity * 3.6)} km/h`
        );
      marker.addTo(map);
      markersRef.current.push(marker);
    }

    return () => {
      for (const m of markersRef.current) m.remove();
      markersRef.current = [];
    };
  }, [map, helicopters]);

  return null;
}
