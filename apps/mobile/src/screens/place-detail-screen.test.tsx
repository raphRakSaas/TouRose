import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

const mockRouterBack = jest.fn();

jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  router: { back: () => mockRouterBack() },
  useLocalSearchParams: () => ({ slug: 'musee-test' }),
}));

jest.mock('@/src/data/catalog-api', () => ({
  fetchPublicPlaceBySlug: jest.fn(),
  fetchPlaceMedia: jest.fn(),
}));

jest.mock('@/src/data/local-catalog', () => ({
  isFavorite: jest.fn(async () => false),
  isVisited: jest.fn(async () => false),
  toggleFavorite: jest.fn(async () => true),
  toggleVisited: jest.fn(async () => true),
}));

jest.mock('@/src/lib/directions', () => ({
  openDirections: jest.fn(),
}));

import PlaceDetailScreen from '../../app/place/[slug]';
import { fetchPlaceMedia, fetchPublicPlaceBySlug } from '@/src/data/catalog-api';
import { openDirections } from '@/src/lib/directions';

const PLACE_ROW = {
  id: '66666666-6666-6666-6666-666666666601',
  slug: 'musee-test',
  name: 'Musée des Augustins',
  summary: 'Un musée au cœur de Toulouse.',
  description: '**Musée historique** avec une collection de sculptures.',
  place_type: 'museum',
  latitude: 43.6005,
  longitude: 1.446,
  city: 'Toulouse',
  postal_code: '31000',
  address: '21 rue de Metz',
  price_type: 'paid',
  price_details: 'Tarif plein 9 €, gratuit le premier dimanche.',
  indoor_outdoor: 'indoor',
  status: 'published',
  last_verified_at: '2026-07-19T12:00:00.000Z',
  website_url: 'https://example.com/musee',
  phone: '05 61 22 21 82',
  recommended_duration_minutes: 90,
  family_friendly: true,
  dog_friendly: false,
  accessible: true,
  details: {
    access: 'Métro A, station Esquirol.',
    email: 'contact@example.com',
    best_moment: 'Après-midi',
    tips: ['Vérifiez les jours de gratuité municipale.'],
    links: [{ label: 'Programme', url: 'https://example.com/programme' }],
  },
  image_url: 'https://cdn.openagenda.com/main/musee.jpg',
  image_alt: 'Façade du musée',
  image_attribution: 'Photo : OpenAgenda',
  image_source_url: 'https://openagenda.com/location/1',
};

const PLACE_MEDIA = [
  {
    position: 0,
    is_cover: true,
    remote_url: 'https://cdn.openagenda.com/main/musee.jpg',
    alt_text: 'Façade du musée',
    attribution_text: 'Photo : OpenAgenda',
  },
  {
    position: 1,
    is_cover: false,
    remote_url: 'https://cdn.openagenda.com/main/musee-interieur.jpg',
    alt_text: 'Intérieur du musée',
    attribution_text: 'Photo : OpenAgenda',
  },
];

function renderScreen() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 47, left: 0, right: 0, bottom: 34 },
      }}
    >
      <QueryClientProvider client={queryClient}>
        <PlaceDetailScreen />
      </QueryClientProvider>
    </SafeAreaProvider>,
  );
}

describe('PlaceDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fetchPublicPlaceBySlug as jest.Mock).mockResolvedValue(PLACE_ROW);
    (fetchPlaceMedia as jest.Mock).mockResolvedValue(PLACE_MEDIA);
  });

  it('affiche les détails réels du lieu et ses informations pratiques', async () => {
    renderScreen();

    await waitFor(() => expect(screen.getByText('Musée des Augustins')).toBeTruthy());

    expect(screen.getByText('21 rue de Metz, 31000 Toulouse')).toBeTruthy();
    expect(screen.getByText('Durée conseillée : 1 h 30')).toBeTruthy();
    expect(screen.getByText('Métro A, station Esquirol.')).toBeTruthy();
    expect(screen.getByText('Tarif plein 9 €, gratuit le premier dimanche.')).toBeTruthy();
    expect(screen.getByText('Adapté aux familles')).toBeTruthy();
    expect(screen.getByText('Programme')).toBeTruthy();
  });

  it('affiche un carrousel lorsque plusieurs photos sont liées', async () => {
    renderScreen();
    await waitFor(() => expect(screen.getByTestId('place-carousel')).toBeTruthy());
  });

  it('ouvre l’itinéraire depuis l’adresse et le CTA fixe', async () => {
    renderScreen();
    await waitFor(() => expect(screen.getByTestId('place-address')).toBeTruthy());

    fireEvent.press(screen.getByTestId('place-address'));
    fireEvent.press(screen.getByTestId('place-cta-directions'));

    expect(openDirections).toHaveBeenCalledTimes(2);
    expect(openDirections).toHaveBeenCalledWith(
      expect.objectContaining({ label: 'Musée des Augustins' }),
    );
  });

  it('revient en arrière avec le bouton flottant', async () => {
    renderScreen();
    await waitFor(() => expect(screen.getByTestId('place-back')).toBeTruthy());
    fireEvent.press(screen.getByTestId('place-back'));
    expect(mockRouterBack).toHaveBeenCalledTimes(1);
  });
});
