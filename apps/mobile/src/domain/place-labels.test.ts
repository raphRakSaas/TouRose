import { formatDistanceLabel, placeTypeLabel } from './place-labels';

describe('place-labels', () => {
  it('maps place types to French labels', () => {
    expect(placeTypeLabel('park')).toBe('Parc');
    expect(placeTypeLabel('permanent_tip')).toBe('Bon plan');
  });

  it('formats short distances in meters', () => {
    expect(formatDistanceLabel(0.35)).toBe('350 m');
  });

  it('formats longer distances in kilometers', () => {
    expect(formatDistanceLabel(2.4)).toBe('2,4 km');
  });
});
