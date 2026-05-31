import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import { useWebSocket } from '../hooks/useWebSocket';
import TopBar from '../components/TopBar';
import BottomBar from '../components/BottomBar';
import SunWidget from '../components/SunWidget';
import GaugeWidget, { type GaugeReading } from '../components/GaugeWidget';
import MapWidget, { type MapStation } from '../components/MapWidget';
import WeatherWidget from '../components/WeatherWidget';
import ForecastWidget from '../components/ForecastWidget';
import AaoWidget from '../components/AaoWidget';
import type { Helicopter } from '../components/HelicopterLayer';
import type { MarkStatus } from '../components/PegelBoardMark';

interface PublicConfig {
  show_map?: string;
  logo_base64?: string;
  color_warn_normal?: string;
  color_warn_elevated?: string;
  color_warn_critical?: string;
  color_warn_alarm?: string;
  location_lat?: string;
  location_lon?: string;
  location_bbox?: string;
  daynight_mode?: string;
  opensky_enabled?: string;
  slipways_enabled?: string;
  radar_enabled?: string;
  aao_position?: string;
  em_name_mode?: string;
  aao_enabled?: string;
  tagesnachricht?: string;
  map_style?: string;
}

export default function Dashboard() {
  const [config, setConfig] = useState<PublicConfig>({});
  const [mapStations, setMapStations] = useState<MapStation[]>([]);
  const [liveUpdates, setLiveUpdates] = useState<Map<string, number>>(new Map());
  const [wsConnected, setWsConnected] = useState(false);
  const [helicopters, setHelicopters] = useState<Helicopter[]>([]);
  const [markStatus, setMarkStatus] = useState<MarkStatus>('live');

  // Load public config on mount
  useEffect(() => {
    api.get<PublicConfig>('/api/config/public').then((cfg) => {
      setConfig(cfg);
      // Theme is set exclusively by TopBar (via daynight_mode) to avoid conflicts

      const root = document.documentElement;
      if (cfg.color_warn_normal)   root.style.setProperty('--color-warn-normal',   cfg.color_warn_normal);
      if (cfg.color_warn_elevated) root.style.setProperty('--color-warn-elevated', cfg.color_warn_elevated);
      if (cfg.color_warn_critical) root.style.setProperty('--color-warn-critical', cfg.color_warn_critical);
      if (cfg.color_warn_alarm)    root.style.setProperty('--color-warn-alarm',    cfg.color_warn_alarm);
    }).catch(() => {});
  }, []);

  // Helicopter polling (every 60 s when enabled)
  useEffect(() => {
    if (config.opensky_enabled !== 'true') return;
    const load = () => {
      api.get<Helicopter[]>('/api/helicopters').then(setHelicopters).catch(() => {});
    };
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, [config.opensky_enabled]);

  // WebSocket: live gauge updates
  useWebSocket(useCallback((event, data) => {
    if (event === 'connected') { setWsConnected(true); return; }
    if (event === 'gauge:update') {
      const d = data as {
        uuid?: string;
        timeseries?: Array<{ shortname: string; currentMeasurement?: { value: number } }>;
      };
      const value = d.timeseries?.find((t) => t.shortname === 'W')?.currentMeasurement?.value;
      if (d.uuid != null && value != null) {
        setLiveUpdates((prev) => new Map(prev).set(d.uuid!, value));
      }
    }
  }, []));

  const handleReadingsChange = useCallback((readings: GaugeReading[]) => {
    setMapStations(readings.map((r) => ({
      station_id: r.stationId,
      name:       r.name,
      river:      r.river,
      latitude:   r.latitude,
      longitude:  r.longitude,
      currentValue: r.value,
      warnLevel:  r.warnLevel,
    })));
    const hasAlarm = readings.some((r) => r.simulateAlarm || r.warnLevel === 'alarm');
    setMarkStatus(hasAlarm ? 'alarm' : 'live');
  }, []);

  const center = {
    lat: Number(config.location_lat ?? 51.0),
    lon: Number(config.location_lon ?? 10.5),
  };

  const locationBbox = config.location_bbox
    ? (config.location_bbox.split(',').map(Number) as [number, number, number, number])
    : undefined;

  const showMap = config.show_map !== 'false';
  const aaoLeft = config.aao_position === 'left';
  const aaoEnabled = config.aao_enabled !== 'false';
  const nameMode = (config.em_name_mode ?? 'klarname') as 'klarname' | 'name';

  const gridTemplateColumns = showMap ? '360px 1fr 340px' : '1fr 1fr';
  const gridTemplateAreas = showMap
    ? '"top top top" "left center right" "bottom bottom bottom"'
    : '"top top" "left right" "bottom bottom"';

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateRows: 'auto 1fr auto',
        gridTemplateColumns,
        gridTemplateAreas,
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        gap: '8px',
        padding: '8px',
        boxSizing: 'border-box',
      }}
    >
      {/* Top bar */}
      <TopBar
        wsConnected={wsConnected}
        daynightMode={config.daynight_mode ?? 'auto'}
        markStatus={markStatus}
        logo={config.logo_base64}
      />

      {/* Left panel: Gauges (+ AAO wenn aao_position=left) */}
      <div style={{ gridArea: 'left', overflow: 'hidden', minHeight: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <GaugeWidget onReadingsChange={handleReadingsChange} liveUpdates={liveUpdates} />
        </div>
        {aaoLeft && aaoEnabled && <AaoWidget nameMode={nameMode} />}
      </div>

      {/* Center: Map (nur wenn aktiviert) */}
      {showMap && (
        <div style={{ gridArea: 'center', overflow: 'hidden', minHeight: 0 }}>
          <MapWidget
            stations={mapStations}
            centerLat={center.lat}
            centerLon={center.lon}
            locationBbox={locationBbox}
            helicopters={helicopters}
            openskyEnabled={config.opensky_enabled === 'true'}
            slipwaysEnabled={config.slipways_enabled === 'true'}
            radarEnabled={config.radar_enabled === 'true'}
            mapStyle={(config.map_style as import('../components/MapWidget').MapStyle) ?? 'dark'}
          />
        </div>
      )}

      {/* Right panel: Sonne + Wetter/Vorhersage (+ AAO wenn aao_position=right) */}
      <div
        style={{
          gridArea: 'right',
          overflow: 'hidden',
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        <SunWidget />
        {/* Wetter + Vorhersage in einem gemeinsamen Glascontainer */}
        <div className="glass rounded-2xl flex-1 min-h-0 flex flex-col overflow-hidden">
          <div className="flex-1 min-h-0">
            <WeatherWidget embedded />
          </div>
          <div className="border-t mx-3" style={{ borderColor: 'var(--theme-border)' }} />
          <ForecastWidget embedded />
        </div>
        {!aaoLeft && aaoEnabled && <AaoWidget nameMode={nameMode} />}
      </div>

      {/* Bottom bar */}
      <BottomBar />
    </div>
  );
}
