import fetch from 'node-fetch';

interface OverpassNode {
  type: 'node';
  id: number;
  lat: number;
  lon: number;
  tags?: Record<string, string>;
}

interface OverpassResult {
  elements: OverpassNode[];
}

export interface Slipway {
  id: number;
  lat: number;
  lon: number;
  name?: string;
}

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 h — slipways rarely change

// Round coordinates to 2 decimal places (~1 km) for cache key stability
function bboxKey(s: number, w: number, n: number, e: number) {
  return [s, w, n, e].map((v) => v.toFixed(2)).join(',');
}

const cache = new Map<string, { data: Slipway[]; ts: number }>();

export async function fetchSlipways(south: number, west: number, north: number, east: number): Promise<Slipway[]> {
  const key = bboxKey(south, west, north, east);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.ts < CACHE_TTL_MS) return hit.data;

  const query =
    `[out:json][timeout:25];` +
    `(node["leisure"="slipway"](${south},${west},${north},${east});` +
    `node["waterway"="boat_launch"](${south},${west},${north},${east}););` +
    `out body;`;

  const resp = await fetch(OVERPASS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
  });
  if (!resp.ok) throw new Error(`Overpass HTTP ${resp.status}`);

  const result = (await resp.json()) as OverpassResult;
  const data: Slipway[] = result.elements.map((el) => ({
    id: el.id,
    lat: el.lat,
    lon: el.lon,
    name: el.tags?.name,
  }));

  cache.set(key, { data, ts: Date.now() });
  return data;
}
