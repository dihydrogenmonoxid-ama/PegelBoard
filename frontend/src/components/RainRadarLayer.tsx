import { useEffect, useRef } from 'react';
import type { Map as LeafletMap } from 'leaflet';
import L from 'leaflet';

// DWD GeoServer WMS – CORS: Access-Control-Allow-Origin: * bestätigt
// Layer "dwd:Niederschlagsradar" wird alle 5 min vom DWD aktualisiert.
// WMS verwendet BBOX-basierte Anfragen statt Zoom-Kacheln → kein
// "Zoom Level not supported"-Problem bei näherer Zoomstufe.
const DWD_WMS_URL = 'https://maps.dwd.de/geoserver/dwd/wms';
const REFRESH_MS = 5 * 60 * 1000; // 5 min

interface Props {
  map: LeafletMap | null;
}

export default function RainRadarLayer({ map }: Props) {
  const layerRef = useRef<L.TileLayer.WMS | null>(null);

  useEffect(() => {
    if (!map) return;

    function addLayer() {
      if (layerRef.current) {
        layerRef.current.remove();
        layerRef.current = null;
      }
      layerRef.current = L.tileLayer.wms(DWD_WMS_URL, {
        layers: 'dwd:Niederschlagsradar',
        format: 'image/png',
        transparent: true,
        opacity: 0.65,
        attribution: '© <a href="https://www.dwd.de">Deutscher Wetterdienst</a>',
        version: '1.1.1',
        zIndex: 10,
        updateWhenIdle: false,
        // Zeitstempel verhindert Browser-Caching des alten Radars
        // @ts-expect-error: DWD WMS TIME-Parameter als custom option
        TIME: new Date(Math.floor(Date.now() / REFRESH_MS) * REFRESH_MS).toISOString(),
      });
      if (map) layerRef.current.addTo(map);
    }

    addLayer();
    const t = setInterval(addLayer, REFRESH_MS);

    return () => {
      clearInterval(t);
      layerRef.current?.remove();
      layerRef.current = null;
    };
  }, [map]);

  return null;
}
