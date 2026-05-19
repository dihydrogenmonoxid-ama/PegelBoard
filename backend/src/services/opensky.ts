export interface Helicopter {
  icao24: string;
  callsign: string;
  lat: number;
  lon: number;
  altitude: number;
  heading: number;
  velocity: number;
}

export async function fetchHelicopters(bbox: {
  lamin: number; lomin: number; lamax: number; lomax: number;
}, apiKey?: string): Promise<Helicopter[]> {
  const url = new URL('https://opensky-network.org/api/states/all');
  url.searchParams.set('lamin', String(bbox.lamin));
  url.searchParams.set('lomin', String(bbox.lomin));
  url.searchParams.set('lamax', String(bbox.lamax));
  url.searchParams.set('lomax', String(bbox.lomax));
  url.searchParams.set('extended', '1');

  const headers: Record<string, string> = {};
  if (apiKey) headers['Authorization'] = `Basic ${apiKey}`;

  const res = await fetch(url.toString(), { headers });
  if (!res.ok) throw new Error(`OpenSky: ${res.status}`);

  const data = await res.json() as { states?: unknown[][] | null };
  if (!data.states) return [];

  return data.states
    .filter((s) => {
      const onGround = s[8] as boolean;
      const callsign = (s[1] as string | null)?.trim();
      const lon = s[5] as number | null;
      const lat = s[6] as number | null;
      if (onGround || !callsign || lon == null || lat == null) return false;
      // index 17: ADS-B emitter category (extended=1 only)
      // 0 = no info, 8 = rotorcraft; exclude fixed-wing categories 2-7 when category is known
      const category = s[17] as number | null | undefined;
      if (category != null && category > 0 && category !== 8) return false;
      return true;
    })
    .map((s) => ({
      icao24:   (s[0] as string),
      callsign: ((s[1] as string).trim()),
      lat:      s[6] as number,
      lon:      s[5] as number,
      altitude: (s[7] as number | null) ?? 0,
      heading:  (s[10] as number | null) ?? 0,
      velocity: (s[9] as number | null) ?? 0,
    }));
}
