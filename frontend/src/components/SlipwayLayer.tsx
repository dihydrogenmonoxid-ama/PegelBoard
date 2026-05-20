import { useEffect, useRef } from 'react';
import type { Map as LeafletMap } from 'leaflet';
import L from 'leaflet';

interface Slipway {
  id: number;
  lat: number;
  lon: number;
  name?: string;
}

interface Props {
  map: LeafletMap | null;
}

export default function SlipwayLayer({ map }: Props) {
  const markersRef = useRef<L.CircleMarker[]>([]);

  function clearMarkers() {
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
  }

  async function loadSlipways(currentMap: LeafletMap) {
    const b = currentMap.getBounds();
    const bbox = [
      b.getSouth().toFixed(5),
      b.getWest().toFixed(5),
      b.getNorth().toFixed(5),
      b.getEast().toFixed(5),
    ].join(',');

    let data: Slipway[];
    try {
      const resp = await fetch(`/api/slipways?bbox=${bbox}`);
      if (!resp.ok) return;
      data = await resp.json() as Slipway[];
    } catch { return; }

    clearMarkers();
    for (const s of data) {
      const marker = L.circleMarker([s.lat, s.lon], {
        radius: 7,
        fillColor: '#06b6d4',
        color: 'white',
        weight: 1.5,
        opacity: 0.9,
        fillOpacity: 0.85,
      });
      const label = s.name ? `<b>${s.name}</b><br>Slippstelle` : 'Slippstelle';
      marker.bindPopup(`<div style="font:13px system-ui;color:#0a1628">⚓ ${label}</div>`);
      marker.addTo(currentMap);
      markersRef.current.push(marker);
    }
  }

  useEffect(() => {
    if (!map) return;

    void loadSlipways(map);

    const onMoveEnd = () => void loadSlipways(map);
    map.on('moveend', onMoveEnd);
    return () => {
      map.off('moveend', onMoveEnd);
      clearMarkers();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  useEffect(() => () => clearMarkers(), []);

  return null;
}
