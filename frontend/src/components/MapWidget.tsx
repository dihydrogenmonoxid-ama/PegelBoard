import { useEffect, useRef } from 'react';
import L from 'leaflet';
import RainRadarLayer from './RainRadarLayer';
import HelicopterLayer, { type Helicopter } from './HelicopterLayer';
import SlipwayLayer from './SlipwayLayer';

export interface MapStation {
  station_id: string;
  name: string;
  river: string | null;
  latitude: number | null;
  longitude: number | null;
  currentValue?: number | null;
  warnLevel?: 'normal' | 'elevated' | 'critical' | 'alarm';
}

export type MapStyle = 'dark' | 'osm' | 'light' | 'contrast' | 'topo' | 'satellite' | 'humanitarian';

const TILE_LAYERS: Record<MapStyle, { url: string; attribution: string; subdomains?: string }> = {
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OSM</a> © <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
  },
  light: {
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OSM</a> © <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
  },
  osm: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    subdomains: 'abc',
  },
  contrast: {
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OSM</a> © <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
  },
  topo: {
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | © <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA)',
    subdomains: 'abc',
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles © Esri — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, GIS User Community',
  },
  humanitarian: {
    url: 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors, Tiles © <a href="https://www.hotosm.org/">Humanitarian OpenStreetMap Team</a>',
    subdomains: 'abc',
  },
};

interface Props {
  stations: MapStation[];
  centerLat?: number;
  centerLon?: number;
  locationBbox?: [number, number, number, number]; // [south, north, west, east]
  helicopters?: Helicopter[];
  openskyEnabled?: boolean;
  slipwaysEnabled?: boolean;
  mapStyle?: MapStyle;
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

const LEGEND_ITEMS = [
  { color: 'var(--color-warn-normal)',   label: 'Normal' },
  { color: 'var(--color-warn-elevated)', label: 'Erhöht' },
  { color: 'var(--color-warn-critical)', label: 'Kritisch' },
  { color: 'var(--color-warn-alarm)',    label: 'Alarm' },
];

function MapLegend({ slipwaysEnabled }: { slipwaysEnabled: boolean }) {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: '10px',
        left: '10px',
        zIndex: 1000,
        background: 'var(--theme-card)',
        border: '1px solid var(--theme-border)',
        borderRadius: '8px',
        padding: '8px 10px',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        pointerEvents: 'none',
      }}
    >
      {LEGEND_ITEMS.map(({ color, label }) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{
            display: 'inline-block',
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: color,
            border: '1.5px solid rgba(255,255,255,0.6)',
            flexShrink: 0,
          }} />
          <span style={{ fontSize: '11px', color: 'var(--theme-text-muted)', lineHeight: 1 }}>{label}</span>
        </div>
      ))}
      {slipwaysEnabled && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px', paddingTop: '4px', borderTop: '1px solid var(--theme-border)' }}>
          <span style={{
            display: 'inline-block',
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: '#06b6d4',
            border: '1.5px solid rgba(255,255,255,0.6)',
            flexShrink: 0,
          }} />
          <span style={{ fontSize: '11px', color: 'var(--theme-text-muted)', lineHeight: 1 }}>Slippstelle</span>
        </div>
      )}
    </div>
  );
}

export default function MapWidget({
  stations,
  centerLat = 51.0,
  centerLon = 10.5,
  locationBbox,
  helicopters = [],
  openskyEnabled = false,
  slipwaysEnabled = false,
  mapStyle = 'dark',
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersRef = useRef<L.CircleMarker[]>([]);
  const initialViewSetRef = useRef(false);

  // Karte initialisieren
  useEffect(() => {
    if (!containerRef.current) return;
    const map = L.map(containerRef.current, { zoomControl: false, attributionControl: true })
      .setView([centerLat, centerLon], 12);

    const style = TILE_LAYERS[mapStyle] ?? TILE_LAYERS.dark;
    tileLayerRef.current = L.tileLayer(style.url, {
      attribution: style.attribution,
      subdomains: style.subdomains ?? 'abc',
      maxZoom: 19,
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

  // Kartenstil wechseln ohne Neuinitialisierung
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (tileLayerRef.current) {
      tileLayerRef.current.remove();
    }
    const style = TILE_LAYERS[mapStyle] ?? TILE_LAYERS.dark;
    tileLayerRef.current = L.tileLayer(style.url, {
      attribution: style.attribution,
      subdomains: style.subdomains ?? 'abc',
      maxZoom: 19,
    }).addTo(map);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapStyle]);

  // Initialer Zoom auf Gebietskörperschaft sobald bbox bekannt ist
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !locationBbox || initialViewSetRef.current) return;
    const [south, north, west, east] = locationBbox;
    map.fitBounds([[south, west], [north, east]], { padding: [20, 20] });
    // Minimum zoom 12 – näher an den Heimatort heranzoomen
    if (map.getZoom() < 12) map.setZoom(12);
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
      {/* Slipway toggle button + layer */}
      {slipwaysEnabled && <SlipwayLayer map={mapRef.current} />}
      {/* Helicopter layer */}
      {openskyEnabled && <HelicopterLayer map={mapRef.current} helicopters={helicopters} />}
      {/* Map legend */}
      <MapLegend slipwaysEnabled={slipwaysEnabled} />
    </div>
  );
}
