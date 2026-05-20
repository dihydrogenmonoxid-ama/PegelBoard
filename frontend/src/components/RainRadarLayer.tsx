import { useEffect, useRef, useState } from 'react';
import type { Map as LeafletMap } from 'leaflet';
import L from 'leaflet';

interface RainViewerData {
  radar: {
    past: Array<{ time: number; path: string }>;
    nowcast?: Array<{ time: number; path: string }>;
  };
}

interface Props {
  map: LeafletMap | null;
}

export default function RainRadarLayer({ map }: Props) {
  const [enabled, setEnabled] = useState(false);
  const layerRef = useRef<L.TileLayer | null>(null);

  useEffect(() => {
    if (!map || !enabled) {
      if (layerRef.current) {
        layerRef.current.remove();
        layerRef.current = null;
      }
      return;
    }

    let cancelled = false;
    fetch('https://api.rainviewer.com/public/weather-maps.json')
      .then((r) => r.json())
      .then((data: RainViewerData) => {
        if (cancelled) return;
        const frames = data.radar.past;
        if (!frames || frames.length === 0) return;
        const latest = frames[frames.length - 1];
        const url = `https://tilecache.rainviewer.com${latest.path}/256/{z}/{x}/{y}/2/1_1.png`;

        if (layerRef.current) layerRef.current.remove();
        const layer = L.tileLayer(url, {
          opacity: 0.5,
          attribution: 'RainViewer',
          zIndex: 10,
          maxNativeZoom: 12,
          maxZoom: 19,
        });
        // Hard-clamp z to 12 regardless of Leaflet internals — RainViewer
        // returns "Zoom Level not supported" for z > 12 on the tile CDN.
        const origGetTileUrl = layer.getTileUrl.bind(layer);
        (layer as unknown as { getTileUrl: (c: L.Coords) => string }).getTileUrl =
          (coords: L.Coords) => origGetTileUrl(Object.assign(Object.create(coords), { z: Math.min(coords.z, 12) }) as L.Coords);
        layerRef.current = layer;
        layerRef.current.addTo(map);
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [map, enabled]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (layerRef.current) {
        layerRef.current.remove();
        layerRef.current = null;
      }
    };
  }, []);

  return (
    <button
      onClick={() => setEnabled((e) => !e)}
      title={enabled ? 'Regenradar ausblenden' : 'Regenradar einblenden'}
      style={{
        position: 'absolute',
        bottom: '90px',
        right: '10px',
        zIndex: 1000,
        background: enabled ? 'var(--color-pb-signal)' : 'var(--theme-card)',
        border: '1px solid var(--theme-border)',
        borderRadius: '6px',
        padding: '4px 8px',
        fontSize: '14px',
        cursor: 'pointer',
        color: enabled ? '#fff' : 'var(--theme-text-muted)',
        backdropFilter: 'blur(8px)',
      }}
    >
      🌧️
    </button>
  );
}
