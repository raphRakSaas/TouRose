import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import MapScreen from '../../app/(tabs)/map';

const mockRouterPush = jest.fn();

jest.mock('expo-router', () => ({
  router: { push: (...args: unknown[]) => mockRouterPush(...args) },
  Link: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('@/src/lib/location', () => ({
  getUserCoordinatesOrToulouse: jest.fn(async () => ({
    latitude: 43.6045,
    longitude: 1.444,
  })),
}));

jest.mock('@/src/data/catalog-api', () => ({
  fetchUpcomingEvents: jest.fn(async () => [
    {
      id: 'event-1',
      slug: 'concert-briques',
      title: 'Concert des briques',
      summary: null,
      price_type: 'free',
      indoor_outdoor: 'outdoor',
      status: 'published',
      latitude: 43.6,
      longitude: 1.44,
      city: 'Toulouse',
      place_id: null,
      place_name: null,
      official_url: null,
      next_starts_at: '2026-07-20T18:00:00Z',
      next_ends_at: null,
      image_url: null,
      image_alt: null,
      image_attribution: null,
      image_source_url: null,
      categories: [],
      description: null,
      address: null,
      details: null,
      upcoming_occurrences: [],
    },
  ]),
  fetchPublicPlaces: jest.fn(async () => [
    {
      id: 'place-1',
      slug: 'place-du-capitole',
      name: 'Place du Capitole',
      summary: null,
      place_type: 'square',
      latitude: 43.6045,
      longitude: 1.4443,
      city: 'Toulouse',
      price_type: 'free',
      indoor_outdoor: 'outdoor',
      status: 'published',
      last_verified_at: null,
      details: { links: [], tips: [] },
      image_url: null,
      image_alt: null,
      image_attribution: null,
      image_source_url: null,
    },
  ]),
}));

function renderMapScreen() {
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
        <MapScreen />
      </QueryClientProvider>
    </SafeAreaProvider>,
  );
}

describe('MapScreen', () => {
  beforeEach(() => {
    mockRouterPush.mockClear();
  });

  it('renders the map with the results carousel', async () => {
    renderMapScreen();

    await waitFor(() => {
      expect(screen.getByTestId('map-carousel')).toBeTruthy();
    });
    expect(screen.getByTestId('map-webview')).toBeTruthy();
    expect(screen.getByText('Concert des briques')).toBeTruthy();
    expect(screen.getByText('Place du Capitole')).toBeTruthy();
  });

  it('opens the detail page when a carousel card is pressed', async () => {
    renderMapScreen();

    await waitFor(() => {
      expect(screen.getByTestId('map-card-concert-briques')).toBeTruthy();
    });
    fireEvent.press(screen.getByTestId('map-card-concert-briques'));
    expect(mockRouterPush).toHaveBeenCalledWith('/event/concert-briques');
  });

  it('filters pins with the places segment', async () => {
    renderMapScreen();

    await waitFor(() => {
      expect(screen.getByTestId('map-segment-places')).toBeTruthy();
    });
    fireEvent.press(screen.getByTestId('map-segment-places'));

    await waitFor(() => {
      expect(screen.queryByText('Concert des briques')).toBeNull();
    });
    expect(screen.getByText('Place du Capitole')).toBeTruthy();
  });
});
