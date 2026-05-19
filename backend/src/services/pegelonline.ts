const BASE_URL = 'https://www.pegelonline.wsv.de/webservices/rest-api/v2';

export interface Station {
  uuid: string;
  number: string;
  shortname: string;
  longname: string;
  km: number;
  agency: string;
  longitude: number;
  latitude: number;
  water: { shortname: string; longname: string };
}

export interface CurrentMeasurement {
  timestamp: string;
  value: number;
  trend: number;       // -1 | 0 | 1
  stateMnwMhw: string;
  stateNswHsw: string;
}

export interface StationWithMeasurement extends Station {
  timeseries: Array<{
    shortname: string;
    unit: string;
    currentMeasurement: CurrentMeasurement;
  }>;
}

export async function fetchStations(): Promise<Station[]> {
  const res = await fetch(`${BASE_URL}/stations.json`);
  if (!res.ok) throw new Error(`PEGELONLINE stations: ${res.status}`);
  return res.json() as Promise<Station[]>;
}

export async function fetchStationCurrent(stationId: string): Promise<StationWithMeasurement> {
  const res = await fetch(
    `${BASE_URL}/stations/${stationId}.json?includeTimeseries=true&includeCurrentMeasurement=true`
  );
  if (!res.ok) throw new Error(`PEGELONLINE station ${stationId}: ${res.status}`);
  return res.json() as Promise<StationWithMeasurement>;
}

export interface CharacteristicValue {
  shortname: string;
  longname: string;
  unit: string;
  value: number;
}

// Richtwerte (MNW, MHW, HSW etc.) – HQ100 falls verfügbar
export async function fetchCharacteristicValues(stationId: string): Promise<CharacteristicValue[]> {
  const res = await fetch(`${BASE_URL}/stations/${stationId}/W/characteristicValues.json`);
  if (!res.ok) throw new Error(`PEGELONLINE characteristicValues ${stationId}: ${res.status}`);
  return res.json() as Promise<CharacteristicValue[]>;
}

export async function fetchStationHistory(
  stationId: string,
  hours = 48
): Promise<Array<{ timestamp: string; value: number }>> {
  const start = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
  const res = await fetch(
    `${BASE_URL}/stations/${stationId}/W/measurements.json?start=${start}`
  );
  if (!res.ok) throw new Error(`PEGELONLINE history ${stationId}: ${res.status}`);
  return res.json() as Promise<Array<{ timestamp: string; value: number }>>;
}

export interface ForecastPoint { timestamp: string; value: number }

export async function fetchStationForecast(stationId: string): Promise<ForecastPoint[]> {
  const res = await fetch(`${BASE_URL}/stations/${stationId}/W/forecasts.json`);
  if (!res.ok) return [];
  return res.json() as Promise<ForecastPoint[]>;
}
