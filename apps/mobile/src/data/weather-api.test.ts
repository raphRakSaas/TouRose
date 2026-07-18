import { fetchToulouseWeather, formatWeatherLine, weatherCodeToLabel } from './weather-api';

describe('weatherCodeToLabel', () => {
  it('mappe les codes WMO connus', () => {
    expect(weatherCodeToLabel(0)).toBe('Ciel dégagé');
    expect(weatherCodeToLabel(1)).toBe('Ensoleillé');
    expect(weatherCodeToLabel(61)).toBe('Pluie légère');
    expect(weatherCodeToLabel(95)).toBe('Orage');
  });

  it('a un libellé de secours pour les codes inconnus', () => {
    expect(weatherCodeToLabel(1234)).toBe('Météo changeante');
  });
});

describe('formatWeatherLine', () => {
  it('arrondit la température et compose la phrase', () => {
    expect(formatWeatherLine({ temperatureCelsius: 17.6, label: 'Ensoleillé' })).toBe(
      '18° · Ensoleillé à Toulouse',
    );
  });
});

describe('fetchToulouseWeather', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('retourne la météo courante depuis Open-Meteo', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ current: { temperature_2m: 21.3, weather_code: 2 } }),
    }) as unknown as typeof fetch;

    const weather = await fetchToulouseWeather();
    expect(weather).toEqual({ temperatureCelsius: 21.3, label: 'Éclaircies' });
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('api.open-meteo.com'));
  });

  it('échoue proprement sur une réponse HTTP en erreur', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 503,
    }) as unknown as typeof fetch;

    await expect(fetchToulouseWeather()).rejects.toThrow('Météo indisponible (HTTP 503)');
  });

  it('échoue proprement sur une réponse invalide', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    }) as unknown as typeof fetch;

    await expect(fetchToulouseWeather()).rejects.toThrow('Réponse météo invalide');
  });
});
