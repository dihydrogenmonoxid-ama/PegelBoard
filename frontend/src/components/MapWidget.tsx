import { useEffect, useRef } from 'react';
import L from 'leaflet';
import RainRadarLayer from './RainRadarLayer';
import HelicopterLayer, { type Helicopter } from './HelicopterLayer';

export interface MapStation {
  station_id: string;
  name: string;
  river: string | null;
  latitude: number | null;
  longitude: number | null;
  currentValue?: number | null;
  warnLevel?: 'normal' | 'elevated' | 'critical' | 'alarm';
}

interface Props {
  stations: MapStation[];
  centerLat?: number;
  centerLon?: number;
  locationBbox?: [number, number, number, number]; // [south, north, west, east]
  helicopters?: Helicopter[];
  openskEnabled?: boolean;
}

const LEVEL_COLOR: Record<string, string> = {
  normal:   '#22c55e',
  elevated: '#fbbf24',
  critical: '#f97316',
  alarm:    '#E30613',
};

const WARN_LEVEL_RANK: Record<string, number> = {
  normal: 0, elevated: 1, critical: 2, alarm: 3,
};

export default function MapWidget({
  stations,
  centerLat = 51.0,
  centerLon = 10.5,
  locationBbox,
  helicopters = [],
  openskEnabled = false,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.CircleMarker[]>([]);
  const initialViewSetRef = useRef(false);

  // Karte initialisieren — ohne initiales setView, da fitBounds den ersten Zoom übernimmt
  useEffect(() => {
    if (!containerRef.current) return;
    const map = L.map(containerRef.current, { zoomControl: false, attributionControl: true })
      .setView([centerLat, centerLon], 8);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OSM</a> © <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 18,
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);
    mapRef.current = map;
    initialViewSetRef.current = false;

    return () => {
      map.remove();
      mapRef.current = null;
      initialViewSetRef.current = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Initialer Zoom auf Gebietskörperschaft sobald bbox bekannt ist
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !locationBbox || initialViewSetRef.current) return;
    const [south, north, west, east] = locationBbox;
    map.fitBounds([[south, west], [north, east]], { padding: [20, 20] });
    initialViewSetRef.current = true;
  }, [locationBbox]);

  // Marker aktualisieren + Auto-Zoom auf kritische Station
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const valid = stations.filter((s) => s.latitude != null && s.longitude != null);
    valid.forEach((s) => {
      const color = LEVEL_COLOR[s.warnLevel ?? 'normal'];
      const marker = L.circleMarker([s.latitude!, s.longitude!], {
        radius: 10,
        fillColor: color,
        color: 'white',
        weight: 1.5,
        opacity: 0.9,
        fillOpacity: 0.85,
      }).addTo(map);

      const value = s.currentValue != null ? `<b>${s.currentValue} cm</b>` : 'Keine Daten';
      marker.bindPopup(`<div style="font:13px system-ui;color:#0a1628"><b>${s.name}</b><br>${s.river ?? ''}<br>${value}</div>`);
      markersRef.current.push(marker);
    });

    // Bei Alarm/Kritisch auf die betroffene Station zoomen
    const criticalStation = [...valid].sort(
      (a, b) => (WARN_LEVEL_RANK[b.warnLevel ?? 'normal'] ?? 0) - (WARN_LEVEL_RANK[a.warnLevel ?? 'normal'] ?? 0)
    )[0];

    if (criticalStation && (criticalStation.warnLevel === 'critical' || criticalStation.warnLevel === 'alarm')) {
      map.flyTo([criticalStation.latitude!, criticalStation.longitude!], 12, { duration: 1.5, animate: true });
      initialViewSetRef.current = true;
    } else if (valid.length > 0 && !locationBbox && !initialViewSetRef.current) {
      // Fallback: alle Stationen einpassen wenn keine Gebietskörperschaft-BBox vorhanden
      const bounds = L.latLngBounds(valid.map((s) => [s.latitude!, s.longitude!]));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
      initialViewSetRef.current = true;
    }
  }, [stations, locationBbox]);

  return (
    <div className="glass rounded-2xl overflow-hidden h-full w-full relative" style={{ gridArea: 'center' }}>
      <div ref={containerRef} className="h-full w-full" />
      {stations.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="text-sm" style={{ color: 'var(--theme-text-faint)' }}>Keine Stationen konfiguriert</p>
        </div>
      )}
      {/* Rain radar toggle button + layer */}
      <RainRadarLayer map={mapRef.current} />
      {/* Helicopter layer */}
      {openskEnabled && <HelicopterLayer map={mapRef.current} helicopters={helicopters} />}
    </div>
  );
}
