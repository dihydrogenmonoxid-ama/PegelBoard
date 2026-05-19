// Bright Sky – kostenlose DWD-Wetter-API, kein API-Key nötig
// https://brightsky.dev/
const BASE = 'https://api.brightsky.dev';

export interface BrightSkyWeather {
  timestamp: string;
  temperature: number | null;
  wind_speed: number | null;
  wind_direction: number | null;
  wind_gust_speed: number | null;
  wind_gust_direction: number | null;
  condition: 'dry' | 'fog' | 'rain' | 'sleet' | 'snow' | 'hail' | 'thunderstorm' | null;
  cloud_cover: number | null;
  relative_humidity: number | null;
  pressure_msl: number | null;
  precipitation_60: number | null;
  visibility: number | null;
  dew_point: number | null;
  sunshine_60: number | null;
}

export interface BrightSkySource {
  id: number;
  station_name: string;
  distance: number;
  lat: number;
  lon: number;
  dwd_station_id: string;
}

export async function fetchCurrentWeather(
  lat: number,
  lon: number
): Promise<{ weather: BrightSkyWeather; sources: BrightSkySource[] }> {
  const res = await fetch(`${BASE}/current_weather?lat=${lat}&lon=${lon}`, {
    headers: { 'User-Agent': 'PegelBoard/0.1 (Wasserrettung)' },
  });
  if (!res.ok) throw new Error(`Bright Sky: ${res.status}`);
  return res.json() as Promise<{ weather: BrightSkyWeather; sources: BrightSkySource[] }>;
}

export interface ForecastHour {
  timestamp: string;
  temperature: number | null;
  wind_speed: number | null;
  wind_direction: number | null;
  condition: BrightSkyWeather['condition'];
  precipitation_60: number | null;
}

export async function fetchForecast(
  lat: number,
  lon: number,
  hours = 24
): Promise<ForecastHour[]> {
  const now = new Date();
  const later = new Date(Date.now() + hours * 3_600_000);
  const url = `${BASE}/weather?lat=${lat}&lon=${lon}&date=${now.toISOString()}&last_date=${later.toISOString()}&units=dwd`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'PegelBoard/0.1 (Wasserrettung)' },
  });
  if (!res.ok) throw new Error(`Bright Sky forecast: ${res.status}`);
  const data = await res.json() as { weather: BrightSkyWeather[] };
  return (data.weather ?? []).map((w) => ({
    timestamp: w.timestamp,
    temperature: w.temperature,
    wind_speed: w.wind_speed,
    wind_direction: w.wind_direction,
    condition: w.condition,
    precipitation_60: w.precipitation_60,
  }));
}
