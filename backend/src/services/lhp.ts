// LHP – Länderübergreifendes Hochwasser-Portal
// API v1.0: https://www.hochwasserzentralen.de/developers/api-docs
// Endpunkte werden beim ersten erfolgreichen Request bestätigt.

export interface LhpAlert {
  id: string;
  severity: number; // 1=minor 2=moderate 3=severe 4=extreme
  headline: string;
  description?: string;
  river?: string;
  region?: string;
  validFrom?: string;
  validUntil?: string;
}

const BASE_URLS = [
  'https://www.hochwasserzentralen.de/webxcms/app/webroot/API/v1',
  'https://www.hochwasserzentralen.de/api/v1',
  'https://api.hochwasserzentralen.de',
];

export async function fetchLhpAlerts(): Promise<LhpAlert[]> {
  for (const base of BASE_URLS) {
    try {
      const res = await fetch(`${base}/alarms`, {
        headers: { Accept: 'application/json', 'User-Agent': 'PegelBoard/0.1' },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) continue;
      const data = await res.json() as unknown;
      // Normalize whatever shape the API returns
      const d = data as Record<string, unknown>;
      const arr = Array.isArray(data) ? data : ((d['alarms'] ?? d['alerts'] ?? []) as unknown[]);
      return (arr as Array<Record<string, unknown>>).map((a) => ({
        id: String(a['id'] ?? Math.random()),
        severity: Number(a['severity'] ?? a['level'] ?? 1),
        headline: String(a['headline'] ?? a['title'] ?? a['message'] ?? ''),
        description: a['description'] ? String(a['description']) : undefined,
        river: a['river'] ? String(a['river']) : undefined,
        region: a['region'] ?? a['regionName'] ? String(a['region'] ?? a['regionName']) : undefined,
        validFrom: a['validFrom'] ? String(a['validFrom']) : undefined,
        validUntil: a['validUntil'] ?? a['end'] ? String(a['validUntil'] ?? a['end']) : undefined,
      }));
    } catch { /* try next base URL */ }
  }
  return []; // graceful empty when unavailable
}
