/**
 * Test d'intégration de la fiche événement (carrousel, infos clés, CTA fixe).
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

const mockRouterBack = jest.fn();

jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  router: { back: (...backArgs: unknown[]) => mockRouterBack(...backArgs) },
  useLocalSearchParams: () => ({ slug: 'concert-openagenda' }),
}));

jest.mock('@/src/data/catalog-api', () => ({
  fetchPublicEventBySlug: jest.fn(),
  fetchEventMedia: jest.fn(async () => []),
  fetchPublicPlaceById: jest.fn(),
}));

jest.mock('@/src/data/local-catalog', () => ({
  isFavorite: jest.fn(async () => false),
  toggleFavorite: jest.fn(async () => true),
}));

jest.mock('@/src/lib/directions', () => ({
  openDirections: jest.fn(),
}));

import EventDetailScreen from '../../app/event/[slug]';
import {
  fetchEventMedia,
  fetchPublicEventBySlug,
  fetchPublicPlaceById,
} from '@/src/data/catalog-api';
import { openDirections } from '@/src/lib/directions';

const nextSaturdayEvening = new Date('2026-07-25T18:00:00.000Z').toISOString();
const nextSaturdayNight = new Date('2026-07-25T20:00:00.000Z').toISOString();

const EVENT_ROW = {
  id: '55555555-5555-5555-5555-555555555501',
  slug: 'concert-openagenda',
  title: 'Concert OpenAgenda',
  summary: 'Un résumé court.',
  place_id: '66666666-6666-6666-6666-666666666601',
  latitude: 43.6,
  longitude: 1.44,
  price_type: 'free',
  indoor_outdoor: 'outdoor',
  status: 'published',
  next_starts_at: nextSaturdayEvening,
  next_ends_at: nextSaturdayNight,
  official_url: 'https://billetterie.example.com/concert',
  last_verified_at: null,
  image_url: 'https://cdn.openagenda.com/main/concert.full.image.jpg',
  image_alt: 'Concert OpenAgenda',
  image_attribution: 'Photo : OpenAgenda',
  image_source_url: 'https://openagenda.com/agendas/1/events/1',
  categories: ['spectacle'],
  description: 'Une description complète de la soirée avec tous les détails pratiques.',
  details: {
    conditions: 'Plein tarif 12 €, réduit 8 €',
    age_min: 6,
    age_max: null,
    accessibility: ['mi'],
    attendance_mode: 'onsite',
    online_access_link: null,
    keywords: ['concert', 'plein air'],
    registration: [
      { type: 'link', value: 'https://billetterie.example.com/concert' },
      { type: 'phone', value: '05 61 00 00 00' },
    ],
    timezone: 'Europe/Paris',
  },
  upcoming_occurrences: [
    { starts_at: nextSaturdayEvening, ends_at: nextSaturdayNight },
    { starts_at: '2026-07-26T18:00:00.000Z', ends_at: '2026-07-26T20:00:00.000Z' },
    { starts_at: '2026-07-27T18:00:00.000Z', ends_at: '2026-07-27T20:00:00.000Z' },
  ],
};

const PLACE_ROW = {
  id: '66666666-6666-6666-6666-666666666601',
  slug: 'halle-aux-grains',
  name: 'Halle aux Grains',
  summary: null,
  place_type: 'culture',
  latitude: 43.601,
  longitude: 1.452,
  city: 'Toulouse',
  price_type: 'unknown',
  indoor_outdoor: 'indoor',
  status: 'published',
  last_verified_at: null,
  address: '1 Place Dupuy',
};

const MEDIA_LIST = [
  {
    position: 0,
    is_cover: true,
    remote_url: 'https://cdn.openagenda.com/main/concert.full.image.jpg',
    alt_text: 'Scène principale',
    attribution_text: 'Photo : OpenAgenda',
  },
  {
    position: 1,
    is_cover: false,
    remote_url: 'https://cdn.openagenda.com/main/concert-2.full.image.jpg',
    alt_text: 'Le public',
    attribution_text: null,
  },
];

function renderScreen() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 47, left: 0, right: 0, bottom: 34 },
      }}
    >
      <QueryClientProvider client={queryClient}>
        <EventDetailScreen />
      </QueryClientProvider>
    </SafeAreaProvider>,
  );
}

describe('EventDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fetchPublicEventBySlug as jest.Mock).mockResolvedValue(EVENT_ROW);
    (fetchPublicPlaceById as jest.Mock).mockResolvedValue(PLACE_ROW);
    (fetchEventMedia as jest.Mock).mockResolvedValue(MEDIA_LIST);
  });

  it('affiche le titre, la date formatée, le lieu et la description', async () => {
    renderScreen();

    await waitFor(() => {
      expect(screen.getByText('Concert OpenAgenda')).toBeTruthy();
    });

    // Présent dans le bloc infos clés ET la liste des prochaines dates.
    expect(screen.getAllByText('Samedi 25 juillet').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Halle aux Grains')).toBeTruthy();
    expect(screen.getByText('1 Place Dupuy, Toulouse')).toBeTruthy();
    expect(screen.getByText('Gratuit')).toBeTruthy();
    expect(
      screen.getByText('Une description complète de la soirée avec tous les détails pratiques.'),
    ).toBeTruthy();
  });

  it('affiche le carrousel quand plusieurs photos existent', async () => {
    renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId('event-carousel')).toBeTruthy();
    });
  });

  it('ouvre le choix de navigation au clic sur l’adresse et via le CTA fixe', async () => {
    renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId('event-address')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('event-address'));
    expect(openDirections).toHaveBeenCalledWith(
      expect.objectContaining({ label: 'Halle aux Grains' }),
    );

    fireEvent.press(screen.getByTestId('event-cta-directions'));
    expect(openDirections).toHaveBeenCalledTimes(2);
  });

  it('affiche les détails OpenAgenda : dates, tarifs, accessibilité, contact, mots-clés', async () => {
    renderScreen();

    await waitFor(() => {
      expect(screen.getByText('Prochaines dates')).toBeTruthy();
    });

    expect(screen.getByText('Infos pratiques')).toBeTruthy();
    expect(screen.getByText('Plein tarif 12 €, réduit 8 €')).toBeTruthy();
    expect(screen.getByText('À partir de 6 ans')).toBeTruthy();
    expect(screen.getByText('Accessible aux personnes à mobilité réduite')).toBeTruthy();
    expect(screen.getByText('Réservation & contact')).toBeTruthy();
    expect(screen.getByText('05 61 00 00 00')).toBeTruthy();
    expect(screen.getByText('#concert')).toBeTruthy();
    expect(screen.getByText('Dimanche 26 juillet')).toBeTruthy();
  });

  it('affiche un bouton retour flottant qui revient en arrière', async () => {
    renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId('event-back')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('event-back'));
    expect(mockRouterBack).toHaveBeenCalledTimes(1);
  });

  it('affiche le CTA Réserver quand un lien officiel existe', async () => {
    renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId('event-cta-booking')).toBeTruthy();
    });
    expect(screen.getByText('Réserver')).toBeTruthy();
  });
});
