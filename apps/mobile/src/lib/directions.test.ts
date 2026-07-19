/**
 * Tests du helper itinéraire (Plans / Google Maps / Waze).
 */
import { Alert, Platform } from 'react-native';

import { appleMapsUrl, googleMapsUrl, openDirections, wazeUrl } from './directions';

const TARGET = { latitude: 43.6045, longitude: 1.4442, label: 'Capitole' };

describe('directions urls', () => {
  it('construit les URLs Plans, Google Maps et Waze', () => {
    expect(appleMapsUrl(TARGET)).toBe('http://maps.apple.com/?daddr=43.6045,1.4442&q=Capitole');
    expect(googleMapsUrl(TARGET)).toBe(
      'https://www.google.com/maps/dir/?api=1&destination=43.6045,1.4442',
    );
    expect(wazeUrl(TARGET)).toBe('https://waze.com/ul?ll=43.6045,1.4442&navigate=yes');
  });
});

describe('openDirections', () => {
  it('affiche une alerte native avec les choix de navigation', () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);

    openDirections(TARGET);

    expect(alertSpy).toHaveBeenCalledTimes(1);
    const [title, message, buttons] = alertSpy.mock.calls[0];
    expect(title).toBe('Y aller');
    expect(message).toBe('Capitole');
    const labels = (buttons ?? []).map((button) => button.text);
    expect(labels).toContain('Google Maps');
    expect(labels).toContain('Waze');
    expect(labels).toContain('Annuler');
    if (Platform.OS === 'ios') {
      expect(labels).toContain('Plans');
    }

    alertSpy.mockRestore();
  });
});
