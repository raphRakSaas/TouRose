const TOULOUSE_LATITUDE = 43.6045;
const TOULOUSE_LONGITUDE = 1.444;

export type CurrentWeather = {
  temperatureCelsius: number;
  label: string;
  weatherCode: number;
};

/** Codes météo WMO (Open-Meteo) → libellés français courts. */
const WEATHER_CODE_LABELS: Record<number, string> = {
  0: 'Ciel dégagé',
  1: 'Ensoleillé',
  2: 'Éclaircies',
  3: 'Nuageux',
  45: 'Brouillard',
  48: 'Brouillard givrant',
  51: 'Bruine légère',
  53: 'Bruine',
  55: 'Bruine dense',
  61: 'Pluie légère',
  63: 'Pluie',
  65: 'Pluie forte',
  66: 'Pluie verglaçante',
  67: 'Pluie verglaçante',
  71: 'Neige légère',
  73: 'Neige',
  75: 'Neige forte',
  77: 'Grésil',
  80: 'Averses légères',
  81: 'Averses',
  82: 'Averses fortes',
  85: 'Averses de neige',
  86: 'Averses de neige',
  95: 'Orage',
  96: 'Orage avec grêle',
  99: 'Orage avec grêle',
};

export function weatherCodeToLabel(weatherCode: number): string {
  return WEATHER_CODE_LABELS[weatherCode] ?? 'Météo changeante';
}

export function formatWeatherLine(weather: CurrentWeather): string {
  return `${Math.round(weather.temperatureCelsius)}° · ${weather.label} à Toulouse`;
}

/** Météo temps réel de Toulouse via Open-Meteo (gratuit, sans clé API). */
export async function fetchToulouseWeather(): Promise<CurrentWeather> {
  const url =
    'https://api.open-meteo.com/v1/forecast' +
    `?latitude=${TOULOUSE_LATITUDE}&longitude=${TOULOUSE_LONGITUDE}` +
    '&current=temperature_2m,weather_code&timezone=Europe%2FParis';

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Météo indisponible (HTTP ${response.status})`);
  }

  const payload = (await response.json()) as {
    current?: { temperature_2m?: number; weather_code?: number };
  };

  const temperature = payload.current?.temperature_2m;
  const weatherCode = payload.current?.weather_code;
  if (typeof temperature !== 'number' || typeof weatherCode !== 'number') {
    throw new Error('Réponse météo invalide');
  }

  return {
    temperatureCelsius: temperature,
    label: weatherCodeToLabel(weatherCode),
    weatherCode,
  };
}
