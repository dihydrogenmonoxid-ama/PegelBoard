// DWD Open Data – Warnungen nach Region (JSONP, Record<regionKey, DwdWarning[]>)
const WARNINGS_URL =
  'https://www.dwd.de/DWD/warnungen/warnapp/json/warnings.json';

export interface DwdWarning {
  type: number;
  level: number;         // 1=Vorabinfo, 2=Warnung, 3=Schwere Warnung, 4=Extreme Warnung
  start: number;         // Unix ms
  end: number;           // Unix ms
  bn: boolean;
  description: string;
  headline: string;
  instruction: string;
  event: string;
  regionName: string;
  altitudeStart: number | null;
  altitudeEnd: number | null;
}

export interface DwdWarningsResponse {
  time: number;
  warnings: Record<string, DwdWarning[]>;
  vorabInformation: Record<string, DwdWarning[]>;
}

export async function fetchDwdWarnings(): Promise<DwdWarningsResponse> {
  const res = await fetch(WARNINGS_URL, {
    headers: { 'User-Agent': 'PegelBoard/0.1 (Wasserrettung)' },
  });
  if (!res.ok) throw new Error(`DWD warnings: ${res.status}`);
  const text = await res.text();
  // DWD liefert JSONP: warnWetter.loadWarnings({...});
  const match = text.match(/warnWetter\.loadWarnings\(([\s\S]+)\)\s*;?\s*$/);
  const jsonStr = match ? match[1] : text;
  return JSON.parse(jsonStr) as DwdWarningsResponse;
}
