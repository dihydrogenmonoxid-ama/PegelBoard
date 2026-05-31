import { useEffect, useRef, useState } from 'react';
import { api, ApiError } from '../../api';

interface GeoResult {
  lat: number;
  lon: number;
  display_name: string;
  ags?: string;
  city?: string;
  bbox?: [number, number, number, number];
}

const TAGESSCHAU_EILMELDUNGEN_URL = 'https://www.tagesschau.de/infoservices/eilmeldungen-100~rss2.xml';

const SYSTEM_FIELDS = [
  { key: 'nina_ags_prefix',    label: 'NINA Gemeindeschlüssel (AGS/ARS)', placeholder: 'z. B. 15 für Sachsen-Anhalt', hint: '2-stellig = Bundesland, 5-stellig = Landkreis (wird auf 12 Stellen aufgefüllt)' },
  { key: 'dwd_region_filter',  label: 'DWD Regionsfilter',          placeholder: 'z. B. Magdeburg', hint: 'Filtert DWD-Warnungen auf Regionen, die diesen Text im Namen enthalten' },
  { key: 'poll_interval_ms',   label: 'Pegel-Aktualisierungsintervall (ms)', placeholder: '120000', hint: '120000 = 2 Minuten' },
];

const DISPLAY_FIELDS = [
  { key: 'color_warn_normal',   label: 'Warnfarbe: Normal',   type: 'color', hint: 'Grün = alles OK' },
  { key: 'color_warn_elevated', label: 'Warnfarbe: Erhöht',   type: 'color', hint: 'Gelb = erhöhte Aufmerksamkeit' },
  { key: 'color_warn_critical', label: 'Warnfarbe: Kritisch', type: 'color', hint: 'Orange = kritisch' },
  { key: 'color_warn_alarm',    label: 'Warnfarbe: Alarm',    type: 'color', hint: 'Rot = Einsatzrelevant' },
];

const inputCls = 'bg-white/5 border border-white/10 rounded-lg px-3 h-10 text-white text-sm outline-none focus:border-pb-blue-light/60 focus:ring-1 focus:ring-pb-blue-light/40 transition-colors w-full';

export default function ConfigPage() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);
  const logoRef = useRef<HTMLInputElement>(null);

  // Geocoding state
  const [geoQuery, setGeoQuery] = useState('');
  const [geoResults, setGeoResults] = useState<GeoResult[]>([]);
  const [geoLoading, setGeoLoading] = useState(false);

  // Callsign mapping state
  interface CallsignMap { id: number; icao24: string | null; callsign_pattern: string | null; display_name: string }
  const [callsigns, setCallsigns] = useState<CallsignMap[]>([]);
  const [newCallsign, setNewCallsign] = useState({ icao24: '', callsign_pattern: '', display_name: '' });
  const loadCallsigns = () => api.get<CallsignMap[]>('/api/admin/callsign-map').then(setCallsigns).catch(() => {});

  useEffect(() => {
    api.get<Record<string, string>>('/api/admin/config').then(setValues).finally(() => setLoading(false));
    loadCallsigns();
  }, []);

  async function handleGeoSearch() {
    if (geoQuery.trim().length < 2) return;
    setGeoLoading(true);
    setGeoResults([]);
    try {
      const results = await api.get<GeoResult[]>(`/api/admin/geocode?q=${encodeURIComponent(geoQuery)}`);
      setGeoResults(results);
    } catch { /* ignore */ } finally {
      setGeoLoading(false);
    }
  }

  function applyGeoResult(r: GeoResult) {
    setValues((v) => ({
      ...v,
      location_lat: String(r.lat),
      location_lon: String(r.lon),
      location_name: r.city ?? r.display_name.split(',')[0].trim(),
      ...(r.ags ? { nina_ags_prefix: r.ags.slice(0, 5) } : {}),
      ...(r.bbox ? { location_bbox: r.bbox.join(',') } : {}),
    }));
    setGeoResults([]);
    setGeoQuery('');
  }

  function set(key: string, value: string) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function handleLogoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const b64 = ev.target?.result as string;
      set('logo_base64', b64);
    };
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setFeedback(null);
    try {
      await api.put('/api/admin/config', values);
      setFeedback({ ok: true, msg: 'Konfiguration gespeichert' });
    } catch (err) {
      setFeedback({ ok: false, msg: err instanceof ApiError ? err.message : 'Fehler' });
    } finally { setSaving(false); }
  }

  const MAP_STYLE_OPTIONS = [
    { value: 'dark',         label: 'Carto Dark (Standard)' },
    { value: 'light',        label: 'Carto Light' },
    { value: 'osm',          label: 'OSM Standard' },
    { value: 'contrast',     label: 'Hochkontrast (Voyager)' },
    { value: 'topo',         label: 'Topografisch (OpenTopoMap)' },
    { value: 'satellite',    label: 'Satellit (ESRI World Imagery)' },
    { value: 'humanitarian', label: 'Humanitär (OSM-HOT)' },
  ];

  if (loading) return <div className="text-white/30 text-sm">Lade …</div>;

  return (
    <div className="flex flex-col gap-4 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Konfiguration</h1>
        <p className="text-white/40 text-sm mt-1">Standort, API-Keys und Darstellung</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">

        {/* 2-column grid layout */}
        <div className="grid grid-cols-2 gap-4 items-start">

        {/* ── Spalte 1 ── */}
        <div className="flex flex-col gap-4">

        {/* Heimatstandort */}
        <section className="glass rounded-2xl p-4 flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider -mb-1">Heimatstandort</h2>
          <p className="text-xs text-white/30 -mt-3">Basis für Karte, Wetter, Sonnenzeiten und NINA-Warnungen</p>

          {/* Geocoding-Suche */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-white/60 uppercase tracking-wider">Ort oder Adresse suchen</span>
            <div className="flex gap-2">
              <input
                className={inputCls}
                type="text"
                placeholder="z. B. Magdeburg, Elbe oder Wolfsburg"
                value={geoQuery}
                onChange={(e) => setGeoQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleGeoSearch())}
              />
              <button type="button" onClick={handleGeoSearch} disabled={geoLoading}
                className="h-10 px-4 rounded-lg bg-pb-signal text-white text-sm font-medium hover:bg-pb-signal/80 disabled:opacity-50 transition-colors flex-shrink-0">
                {geoLoading ? '…' : 'Suchen'}
              </button>
            </div>
            {geoResults.length > 0 && (
              <div className="flex flex-col gap-1 rounded-xl overflow-hidden border" style={{ borderColor: 'var(--theme-border)' }}>
                {geoResults.map((r, i) => (
                  <button key={i} type="button" onClick={() => applyGeoResult(r)}
                    className="text-left px-4 py-2.5 text-sm hover:bg-white/10 transition-colors"
                    style={{ color: 'var(--theme-text)' }}>
                    <span className="font-medium">{r.city ?? r.display_name.split(',')[0]}</span>
                    <span className="text-xs ml-2" style={{ color: 'var(--theme-text-faint)' }}>
                      {r.display_name.split(',').slice(1, 3).join(',')}
                    </span>
                    {r.ags && (
                      <span className="text-xs ml-2" style={{ color: 'var(--color-pb-blue-light)' }}>AGS: {r.ags.slice(0, 5)}</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Aktuell gesetzter Standort */}
          {(values['location_lat'] || values['location_lon']) && (
            <div className="rounded-xl p-3 text-xs flex flex-col gap-1" style={{ background: 'var(--theme-card)', border: '1px solid var(--theme-border)' }}>
              <span className="font-semibold" style={{ color: 'var(--theme-text)' }}>
                {values['location_name'] || 'Standort gesetzt'}
              </span>
              <span style={{ color: 'var(--theme-text-muted)' }}>
                {values['location_lat']}, {values['location_lon']}
                {values['nina_ags_prefix'] && ` · AGS: ${values['nina_ags_prefix']}`}
              </span>
            </div>
          )}

          {/* Manuelle Feineingabe */}
          <details className="group">
            <summary className="text-xs text-white/40 cursor-pointer select-none hover:text-white/60 transition-colors">
              Koordinaten manuell überschreiben
            </summary>
            <div className="flex flex-col gap-3 mt-3">
              {[
                { key: 'location_lat', label: 'Breitengrad (lat)', placeholder: '52.13' },
                { key: 'location_lon', label: 'Längengrad (lon)',  placeholder: '11.62' },
              ].map(({ key, label, placeholder }) => (
                <label key={key} className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-white/60 uppercase tracking-wider">{label}</span>
                  <input className={inputCls} type="text" placeholder={placeholder}
                    value={values[key] ?? ''} onChange={(e) => set(key, e.target.value)} />
                </label>
              ))}
            </div>
          </details>
        </section>

        {/* System / API */}
        <section className="glass rounded-2xl p-4 flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider -mb-1">System & API</h2>
          {SYSTEM_FIELDS.map(({ key, label, placeholder, hint }) => (
            <label key={key} className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-white/60 uppercase tracking-wider">{label}</span>
              <input className={inputCls} type="text"
                placeholder={placeholder} value={values[key] ?? ''}
                onChange={(e) => set(key, e.target.value)} />
              <span className="text-xs text-white/30">{hint}</span>
            </label>
          ))}

          {/* RSS Eilmeldungen */}
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-white/60 uppercase tracking-wider">RSS-Feed (Eilmeldungen)</span>
            <div className="flex gap-2">
              <input className={inputCls} type="text"
                placeholder={TAGESSCHAU_EILMELDUNGEN_URL}
                value={values['news_feed_url'] ?? ''}
                onChange={(e) => set('news_feed_url', e.target.value)} />
              <button type="button"
                onClick={() => set('news_feed_url', TAGESSCHAU_EILMELDUNGEN_URL)}
                className="h-10 px-3 rounded-lg bg-white/5 text-white/60 text-xs whitespace-nowrap hover:bg-white/10 hover:text-white transition-colors flex-shrink-0">
                Tagesschau
              </button>
            </div>
            <span className="text-xs text-white/30">RSS 2.0 Feed – leer = Tagesschau Eilmeldungen</span>
          </label>
        </section>

        {/* Darstellung */}
        <section className="glass rounded-2xl p-4 flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider -mb-1">Darstellung</h2>

          {/* Toggle: Show map */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-white/60 uppercase tracking-wider">Karte anzeigen</p>
              <p className="text-xs text-white/30 mt-0.5">Leaflet-Karte auf dem Dashboard</p>
            </div>
            <button type="button"
              onClick={() => set('show_map', values['show_map'] === 'false' ? 'true' : 'false')}
              className={`relative w-11 h-6 rounded-full transition-colors ${values['show_map'] === 'false' ? 'bg-white/10' : 'bg-pb-signal'}`}>
              <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${values['show_map'] === 'false' ? 'left-1' : 'left-6'}`} />
            </button>
          </div>

          {/* Toggle: Show news */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-white/60 uppercase tracking-wider">Nachrichtenticker</p>
              <p className="text-xs text-white/30 mt-0.5">Tagesschau-Eilmeldungen am unteren Rand</p>
            </div>
            <button type="button"
              onClick={() => set('show_news', values['show_news'] === 'true' ? 'false' : 'true')}
              className={`relative w-11 h-6 rounded-full transition-colors ${values['show_news'] === 'true' ? 'bg-pb-signal' : 'bg-white/10'}`}>
              <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${values['show_news'] === 'true' ? 'left-6' : 'left-1'}`} />
            </button>
          </div>

          {/* Logo upload */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-white/60 uppercase tracking-wider">Logo (optional)</span>
            {values['logo_base64'] && (
              <div className="flex items-center gap-3">
                <img src={values['logo_base64']} alt="Logo" className="h-10 object-contain" />
                <button type="button" onClick={() => set('logo_base64', '')}
                  className="text-xs text-red-400/60 hover:text-red-400 transition-colors">Entfernen</button>
              </div>
            )}
            <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={handleLogoFile} />
            <button type="button" onClick={() => logoRef.current?.click()}
              className="h-9 px-4 w-fit rounded-lg bg-white/5 text-white/60 text-sm hover:text-white hover:bg-white/10 transition-colors">
              {values['logo_base64'] ? 'Anderes Logo wählen' : 'Bild hochladen'}
            </button>
            <span className="text-xs text-white/30">Wird zentriert im Dashboard-Header angezeigt (PNG/SVG empfohlen)</span>
          </div>

          {/* Kartenstil */}
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-white/60 uppercase tracking-wider">Kartenstil</span>
            <select className={inputCls} value={values['map_style'] ?? 'dark'} onChange={(e) => set('map_style', e.target.value)}>
              {MAP_STYLE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>

          {/* Regenradar */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-white/60 uppercase tracking-wider">Regenradar anzeigen</p>
              <p className="text-xs text-white/30 mt-0.5">DWD Niederschlagsradar als WMS-Overlay (kein API-Key nötig)</p>
            </div>
            <button type="button"
              onClick={() => set('radar_enabled', values['radar_enabled'] === 'true' ? 'false' : 'true')}
              className={`relative w-11 h-6 rounded-full transition-colors ${values['radar_enabled'] === 'true' ? 'bg-pb-signal' : 'bg-white/10'}`}>
              <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${values['radar_enabled'] === 'true' ? 'left-6' : 'left-1'}`} />
            </button>
          </div>

          {/* Slippstellen */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-white/60 uppercase tracking-wider">Slippstellen anzeigen</p>
              <p className="text-xs text-white/30 mt-0.5">Bootsrampen aus OSM via Overpass</p>
            </div>
            <button type="button"
              onClick={() => set('slipways_enabled', values['slipways_enabled'] === 'true' ? 'false' : 'true')}
              className={`relative w-11 h-6 rounded-full transition-colors ${values['slipways_enabled'] === 'true' ? 'bg-pb-signal' : 'bg-white/10'}`}>
              <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${values['slipways_enabled'] === 'true' ? 'left-6' : 'left-1'}`} />
            </button>
          </div>

          {/* AAO aktivieren */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-white/60 uppercase tracking-wider">AAO-Widget anzeigen</p>
              <p className="text-xs text-white/30 mt-0.5">Blendet das AAO-Widget im Dashboard aus</p>
            </div>
            <button type="button"
              onClick={() => set('aao_enabled', values['aao_enabled'] === 'false' ? 'true' : 'false')}
              className={`relative w-11 h-6 rounded-full transition-colors ${values['aao_enabled'] !== 'false' ? 'bg-pb-signal' : 'bg-white/10'}`}>
              <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${values['aao_enabled'] !== 'false' ? 'left-6' : 'left-1'}`} />
            </button>
          </div>

          {/* AAO-Position */}
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-white/60 uppercase tracking-wider">AAO-Position</span>
            <select className={inputCls} value={values['aao_position'] ?? 'right'} onChange={(e) => set('aao_position', e.target.value)}>
              <option value="right">Rechts (unter Wetter & Vorhersage)</option>
              <option value="left">Links (unter Pegelstände)</option>
            </select>
          </label>

          {/* Einsatzmittel-Namensanzeige */}
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-white/60 uppercase tracking-wider">Einsatzmittel-Bezeichnung</span>
            <select className={inputCls} value={values['em_name_mode'] ?? 'klarname'} onChange={(e) => set('em_name_mode', e.target.value)}>
              <option value="klarname">Kurzname / Klarname</option>
              <option value="name">Vollständiger Funkrufname</option>
            </select>
            <span className="text-xs text-white/30">Gilt für AAO-Sektion im Dashboard</span>
          </label>

          {/* Warn colors */}
          <div className="flex flex-col gap-3">
            <span className="text-xs font-medium text-white/60 uppercase tracking-wider">Warnfarben</span>
            <div className="grid grid-cols-2 gap-3">
              {DISPLAY_FIELDS.map(({ key, label, hint }) => (
                <label key={key} className="flex items-center gap-3 glass rounded-xl p-3 cursor-pointer">
                  <input type="color" value={values[key] ?? '#22c55e'}
                    onChange={(e) => set(key, e.target.value)}
                    className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent" />
                  <div>
                    <p className="text-xs font-medium text-white">{label}</p>
                    <p className="text-xs text-white/30">{hint}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </section>

        {/* Tag/Nacht-Modus */}
        <section className="glass rounded-2xl p-4 flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider -mb-1">Tag / Nacht</h2>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-white/60 uppercase tracking-wider">Modus</span>
            <select className={inputCls} value={values['daynight_mode'] ?? 'auto'} onChange={(e) => set('daynight_mode', e.target.value)}>
              <option value="auto">Automatisch (Sonnenaufgang / -untergang)</option>
              <option value="dark">Immer dunkel</option>
              <option value="light">Immer hell</option>
            </select>
            <span className="text-xs text-white/30">Automatisch erfordert konfigurierten Standort (lat/lon)</span>
          </label>
        </section>

        {/* Tagesnachricht */}
        <section className="glass rounded-2xl p-4 flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider -mb-1">Tagesnachricht</h2>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-white/60 uppercase tracking-wider">Nachricht (optional)</span>
            <input className={inputCls} type="text"
              placeholder="z. B. Schicht A – Bootsführer: Müller"
              value={values['tagesnachricht'] ?? ''}
              onChange={(e) => set('tagesnachricht', e.target.value)} />
            <span className="text-xs text-white/30">Wird im Dashboard-Footer angezeigt (neben Warnungen). Leer = keine Anzeige.</span>
          </label>
        </section>

        </div>{/* Ende Spalte 1 */}

        {/* ── Spalte 2 ── */}
        <div className="flex flex-col gap-4">

        {/* GPIO */}
        <section className="glass rounded-2xl p-4 flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider -mb-1">GPIO / Signalturm (Raspberry Pi)</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-white/60 uppercase tracking-wider">GPIO aktiviert</p>
              <p className="text-xs text-white/30 mt-0.5">Nur auf Raspberry Pi mit GPIO-Zugriff</p>
            </div>
            <button type="button"
              onClick={() => set('gpio_enabled', values['gpio_enabled'] === 'true' ? 'false' : 'true')}
              className={`relative w-11 h-6 rounded-full transition-colors ${values['gpio_enabled'] === 'true' ? 'bg-pb-signal' : 'bg-white/10'}`}>
              <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${values['gpio_enabled'] === 'true' ? 'left-6' : 'left-1'}`} />
            </button>
          </div>
          {[
            { key: 'gpio_pin_green',  label: 'GPIO-Pin Grün (Normal)',   placeholder: 'z. B. 17' },
            { key: 'gpio_pin_yellow', label: 'GPIO-Pin Gelb (Erhöht)',   placeholder: 'z. B. 27' },
            { key: 'gpio_pin_red',    label: 'GPIO-Pin Rot (Kritisch/Alarm)', placeholder: 'z. B. 22' },
          ].map(({ key, label, placeholder }) => (
            <label key={key} className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-white/60 uppercase tracking-wider">{label}</span>
              <input className={inputCls} type="number" min="0" max="40" placeholder={placeholder}
                value={values[key] ?? ''} onChange={(e) => set(key, e.target.value)} />
            </label>
          ))}
        </section>

        {/* Hubschrauber */}
        <section className="glass rounded-2xl p-4 flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider -mb-1">Hubschrauber-Tracking (OpenSky)</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-white/60 uppercase tracking-wider">Tracking aktiviert</p>
              <p className="text-xs text-white/30 mt-0.5">Zeigt Luftfahrzeuge auf der Karte an</p>
            </div>
            <button type="button"
              onClick={() => set('opensky_enabled', values['opensky_enabled'] === 'true' ? 'false' : 'true')}
              className={`relative w-11 h-6 rounded-full transition-colors ${values['opensky_enabled'] === 'true' ? 'bg-pb-signal' : 'bg-white/10'}`}>
              <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${values['opensky_enabled'] === 'true' ? 'left-6' : 'left-1'}`} />
            </button>
          </div>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-white/60 uppercase tracking-wider">OpenSky API-Key (optional)</span>
            <input className={inputCls} type="password" placeholder="Leer = anonymer Zugriff (begrenzte Anfragen)"
              value={values['opensky_api_key'] ?? ''} onChange={(e) => set('opensky_api_key', e.target.value)} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-white/60 uppercase tracking-wider">Bounding Box (JSON)</span>
            <input className={inputCls} type="text"
              placeholder='{"lamin":47,"lomin":5.5,"lamax":55.5,"lomax":15.5}'
              value={values['opensky_bbox'] ?? ''} onChange={(e) => set('opensky_bbox', e.target.value)} />
            <span className="text-xs text-white/30">Leer = ganz Deutschland. JSON: lamin, lomin, lamax, lomax</span>
          </label>
        </section>

        {/* Callsign-Mapping */}
        <section className="glass rounded-2xl p-6 flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider -mb-1">Callsign-Mapping</h2>
          <p className="text-xs text-white/30">Verknüpft ICAO24-Adresse oder Callsign-Präfix mit einem Klarnamen.</p>
          <div className="grid gap-2" style={{ gridTemplateColumns: '1fr 1fr 1fr auto' }}>
            <input className={inputCls} placeholder="ICAO24 (z.B. 3e4ab1)" value={newCallsign.icao24}
              onChange={(e) => setNewCallsign((p) => ({ ...p, icao24: e.target.value }))} />
            <input className={inputCls} placeholder="Callsign-Präfix (z.B. CJT)" value={newCallsign.callsign_pattern}
              onChange={(e) => setNewCallsign((p) => ({ ...p, callsign_pattern: e.target.value }))} />
            <input className={inputCls} placeholder="Klarname *" value={newCallsign.display_name}
              onChange={(e) => setNewCallsign((p) => ({ ...p, display_name: e.target.value }))} />
            <button type="button"
              disabled={!newCallsign.display_name.trim()}
              onClick={async () => {
                await api.post('/api/admin/callsign-map', {
                  icao24: newCallsign.icao24 || null,
                  callsign_pattern: newCallsign.callsign_pattern || null,
                  display_name: newCallsign.display_name,
                });
                setNewCallsign({ icao24: '', callsign_pattern: '', display_name: '' });
                loadCallsigns();
              }}
              className="h-10 px-4 rounded-xl bg-pb-signal text-white text-sm font-medium hover:bg-pb-signal/80 disabled:opacity-40 transition-colors whitespace-nowrap">
              + Hinzufügen
            </button>
          </div>
          {callsigns.length > 0 && (
            <table className="w-full text-xs mt-1" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr className="text-white/40 text-left">
                  <th className="pb-1 pr-4">ICAO24</th>
                  <th className="pb-1 pr-4">Callsign-Präfix</th>
                  <th className="pb-1 pr-4">Klarname</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {callsigns.map((c) => (
                  <tr key={c.id} className="border-t" style={{ borderColor: 'var(--theme-border)' }}>
                    <td className="py-1.5 pr-4 font-mono text-white/60">{c.icao24 ?? '—'}</td>
                    <td className="py-1.5 pr-4 font-mono text-white/60">{c.callsign_pattern ?? '—'}</td>
                    <td className="py-1.5 pr-4 text-white">{c.display_name}</td>
                    <td className="py-1.5">
                      <button type="button" onClick={async () => { await api.del(`/api/admin/callsign-map/${c.id}`); loadCallsigns(); }}
                        className="text-xs px-2 py-0.5 rounded" style={{ background: 'var(--color-warn-alarm)', color: '#fff' }}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {callsigns.length === 0 && (
            <p className="text-xs text-white/20">Noch keine Mappings konfiguriert.</p>
          )}
        </section>

        </div>{/* Ende Spalte 2 */}
        </div>{/* Ende Grid */}


        {feedback && (
          <p className={`text-sm rounded-lg px-4 py-2.5 ${feedback.ok ? 'text-green-400 bg-green-400/10' : 'text-red-400 bg-red-400/10'}`}>
            {feedback.msg}
          </p>
        )}

        <button type="submit" disabled={saving}
          className="h-10 rounded-xl bg-pb-signal text-white text-sm font-semibold hover:bg-pb-signal/80 disabled:opacity-50 transition-colors">
          {saving ? 'Speichern …' : 'Speichern'}
        </button>
      </form>
    </div>
  );
}
