export interface GeocodingResult {
  lat: number;
  lon: number;
  display_name: string;
  ags?: string; // Amtlicher Gemeindeschlüssel, wenn von OSM vorhanden
  city?: string;
  bbox?: [number, number, number, number]; // [south, north, west, east]
}

const USER_AGENT = 'PegelBoard/0.1 (Wasserrettungs-Kiosk; kontakt@pegelboard.local)';

export async function geocode(query: string): Promise<GeocodingResult[]> {
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', query);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('extratags', '1');
  url.searchParams.set('countrycodes', 'de');
  url.searchParams.set('limit', '5');

  const res = await fetch(url.toString(), {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Nominatim: ${res.status}`);

  const data = await res.json() as Array<Record<string, unknown>>;

  return data.map((item) => {
    const extratags = (item['extratags'] as Record<string, string> | undefined) ?? {};
    const address = (item['address'] as Record<string, string> | undefined) ?? {};

    // AGS kann in verschiedenen extratags-Feldern stecken
    const ags =
      extratags['ref:de:ags'] ??
      extratags['de:amtlicher_gemeindeschluessel'] ??
      undefined;

    const city =
      address['city'] ?? address['town'] ?? address['village'] ?? address['municipality'] ?? undefined;

    const rawBbox = item['boundingbox'] as string[] | undefined;
    const bbox: [number, number, number, number] | undefined = rawBbox?.length === 4
      ? [parseFloat(rawBbox[0]), parseFloat(rawBbox[1]), parseFloat(rawBbox[2]), parseFloat(rawBbox[3])]
      : undefined;

    return {
      lat: parseFloat(String(item['lat'])),
      lon: parseFloat(String(item['lon'])),
      display_name: String(item['display_name'] ?? ''),
      ags,
      city,
      bbox,
    };
  });
}
