// Bundesamt für Bevölkerungsschutz und Katastrophenhilfe – NINA API
// Server: https://warnung.bund.de/api31  (see openapi.yaml)
const NINA_BASE = 'https://warnung.bund.de/api31';

export interface NinaWarning {
  id: string;
  payload: {
    id: string;
    hash: string;
    data: {
      headline: string;
      msgType: 'Alert' | 'Update' | 'Cancel';
      severity: 'Minor' | 'Moderate' | 'Severe' | 'Extreme';
      urgency: 'Immediate' | 'Expected' | 'Future';
      event: string;
      description: string;
      instruction: string;
      web: string;
      area: Array<{ areaDesc: string; geocode: Array<{ valueName: string; value: string }> }>;
    };
    sent: string;
    effective: string;
    expires: string;
  };
  i18nTitle: Record<string, string>;
  sent: string;
}

// Pad any AGS/ARS prefix to the required 12-digit format (e.g. "15" → "150000000000")
function padArs(prefix: string): string {
  return prefix.replace(/\D/g, '').padEnd(12, '0').slice(0, 12);
}

export async function fetchNinaWarnings(arsOrPrefix?: string): Promise<NinaWarning[]> {
  if (!arsOrPrefix) return [];
  const ars = padArs(arsOrPrefix);
  const res = await fetch(`${NINA_BASE}/dashboard/${ars}.json`);
  if (!res.ok) throw new Error(`NINA dashboard: ${res.status}`);
  const data = await res.json() as NinaWarning[] | null;
  return Array.isArray(data) ? data : [];
}
