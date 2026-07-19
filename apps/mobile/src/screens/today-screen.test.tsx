/**
 * Test d'intégration de l'écran Aujourd'hui (feed catégories + modal).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import TodayScreen, { resetStackedPicksSessionFlagForTests } from '../../app/(tabs)/index';
import { usePreferencesStore } from '../store/preferences-store';

const mockRouterPush = jest.fn();

jest.mock('expo-router', () => ({
  Link: ({ children }: { children: ReactNode }) => children,
  router: { push: (...pushArgs: unknown[]) => mockRouterPush(...pushArgs) },
  useLocalSearchParams: () => ({}),
}));

jest.mock('@react-native-community/datetimepicker', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- mock Jest
  const ReactNative = require('react-native') as typeof import('react-native');
  return {
    __esModule: true,
    default: function MockDateTimePicker() {
      return (
        <ReactNative.View testID="native-date-picker">
          <ReactNative.Text>DateTimePicker</ReactNative.Text>
        </ReactNative.View>
      );
    },
  };
});

jest.mock('@/src/data/catalog-api', () => ({
  fetchUpcomingEvents: jest.fn(),
  fetchPublicPlaces: jest.fn(),
  fetchPublicCollections: jest.fn(),
  fetchRecommendationPicks: jest.fn(async () => []),
  logRecommendationImpression: jest.fn(async () => undefined),
}));

jest.mock('@/src/data/weather-api', () => {
  const actual = jest.requireActual('@/src/data/weather-api') as Record<string, unknown>;
  return { ...actual, fetchToulouseWeather: jest.fn() };
});

import { fetchUpcomingEvents } from '@/src/data/catalog-api';
import { fetchToulouseWeather } from '@/src/data/weather-api';
import { hideStackedPicksForToday } from '@/src/lib/stacked-picks-pref';

const inTenMinutes = new Date(Date.now() + 10 * 60 * 1000).toISOString();
const inTwentyMinutes = new Date(Date.now() + 20 * 60 * 1000).toISOString();
const inThirtyMinutes = new Date(Date.now() + 30 * 60 * 1000).toISOString();

const EVENTS = [
  {
    id: '55555555-5555-5555-5555-555555555501',
    slug: 'concert-openagenda',
    title: 'Concert OpenAgenda',
    summary: null,
    place_id: null,
    latitude: 43.6,
    longitude: 1.44,
    price_type: 'paid',
    indoor_outdoor: 'outdoor',
    status: 'published',
    next_starts_at: inTenMinutes,
    next_ends_at: null,
    official_url: null,
    last_verified_at: null,
    image_url: 'https://cdn.openagenda.com/main/concert.full.image.jpg',
    image_alt: 'Concert OpenAgenda',
    image_attribution: 'Photo : Renaud Monfourny · OpenAgenda',
    image_source_url: 'https://openagenda.com/agendas/1/events/1',
    categories: ['spectacle'],
  },
  {
    id: '55555555-5555-5555-5555-555555555502',
    slug: 'balade-gratuite',
    title: 'Balade gratuite sur les quais',
    summary: null,
    place_id: null,
    latitude: 43.61,
    longitude: 1.45,
    price_type: 'free',
    indoor_outdoor: 'outdoor',
    status: 'published',
    next_starts_at: inTwentyMinutes,
    next_ends_at: null,
    official_url: null,
    last_verified_at: null,
    categories: ['visite'],
  },
  {
    id: '55555555-5555-5555-5555-555555555503',
    slug: 'expo-musee',
    title: 'Exposition au musée des Augustins',
    summary: null,
    place_id: null,
    latitude: 43.6,
    longitude: 1.44,
    price_type: 'paid',
    indoor_outdoor: 'indoor',
    status: 'published',
    next_starts_at: inThirtyMinutes,
    next_ends_at: null,
    official_url: null,
    last_verified_at: null,
    categories: ['exposition'],
  },
];

function renderTodayScreen(): ReturnType<typeof render> {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 47, left: 0, right: 0, bottom: 34 },
      }}
    >
      <QueryClientProvider client={queryClient}>
        <TodayScreen />
      </QueryClientProvider>
    </SafeAreaProvider>,
  );
}

beforeEach(async () => {
  jest.clearAllMocks();
  resetStackedPicksSessionFlagForTests();
  await AsyncStorage.clear();
  usePreferencesStore.setState({
    company: 'couple',
    interests: ['Balades', 'Terrasses', 'Nature'],
  });
  (fetchUpcomingEvents as jest.Mock).mockResolvedValue(EVENTS);
  (fetchToulouseWeather as jest.Mock).mockResolvedValue({
    temperatureCelsius: 21.3,
    label: 'Éclaircies',
    weatherCode: 2,
  });
});

async function dismissStackedModal(): Promise<void> {
  const modal = await screen.findByTestId('stacked-picks-modal');
  expect(modal).toBeTruthy();
  fireEvent.press(screen.getByText('Fermer'));
  await waitFor(() => {
    expect(screen.queryByTestId('stacked-picks-modal')).toBeNull();
  });
}

describe('TodayScreen', () => {
  it('affiche météo, sections et liste d’événements OpenAgenda', async () => {
    renderTodayScreen();

    expect(await screen.findByText('21° · Éclaircies à Toulouse')).toBeTruthy();
    await dismissStackedModal();
    expect(await screen.findByText('Tous les événements')).toBeTruthy();
    expect(screen.getAllByText('Concert OpenAgenda').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Balade gratuite/).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Photo : Renaud Monfourny · OpenAgenda').length).toBeGreaterThan(0);
  });

  it('ouvre le modal des 3 cartes une fois les données chargées', async () => {
    renderTodayScreen();
    expect(await screen.findByTestId('stacked-picks-modal')).toBeTruthy();
    expect(screen.getByText('Nos 3 idées du moment')).toBeTruthy();
  });

  it('ne réaffiche pas le modal si masqué pour aujourd’hui', async () => {
    await hideStackedPicksForToday();
    renderTodayScreen();
    await screen.findByText('Tous les événements');
    expect(screen.queryByTestId('stacked-picks-modal')).toBeNull();
  });

  it('ferme le modal via le CTA Fermer', async () => {
    renderTodayScreen();
    await dismissStackedModal();
  });

  it('filtre par prix gratuit', async () => {
    renderTodayScreen();
    await dismissStackedModal();

    fireEvent.press(screen.getByTestId('open-filter-price'));
    fireEvent.press(screen.getByTestId('price-filter-free'));

    await waitFor(() => {
      expect(screen.queryByText('Concert OpenAgenda')).toBeNull();
    });
    expect(screen.getAllByText('Balade gratuite sur les quais').length).toBeGreaterThan(0);
  });

  it('filtre la catégorie Exposition', async () => {
    renderTodayScreen();
    await dismissStackedModal();

    fireEvent.press(screen.getByTestId('open-filter-category'));
    fireEvent.press(screen.getByTestId('category-filter-exposition'));

    await waitFor(() => {
      expect(screen.getAllByText('Exposition au musée des Augustins').length).toBeGreaterThan(0);
    });
    expect(screen.queryByText('Concert OpenAgenda')).toBeNull();
  });

  it('bascule entre affichage cartes (par défaut) et liste', async () => {
    renderTodayScreen();
    await dismissStackedModal();
    await screen.findByText('Tous les événements');

    const cardsToggle = screen.getByTestId('display-mode-cards');
    const listToggle = screen.getByTestId('display-mode-list');
    expect(cardsToggle.props.accessibilityState?.selected).toBe(true);
    expect(listToggle.props.accessibilityState?.selected).toBe(false);

    fireEvent.press(listToggle);
    await waitFor(() => {
      expect(screen.getByTestId('display-mode-list').props.accessibilityState?.selected).toBe(
        true,
      );
    });
    expect(screen.getAllByText('Concert OpenAgenda').length).toBeGreaterThan(0);

    fireEvent.press(screen.getByTestId('display-mode-cards'));
    await waitFor(() => {
      expect(screen.getByTestId('display-mode-cards').props.accessibilityState?.selected).toBe(
        true,
      );
    });
  });

  it('ouvre le date picker natif', async () => {
    renderTodayScreen();
    await dismissStackedModal();

    fireEvent.press(screen.getByTestId('open-filter-moment'));
    fireEvent.press(screen.getByTestId('moment-filter-custom-date'));
    expect(await screen.findByTestId('native-date-picker')).toBeTruthy();
  });

  it("l'avatar ouvre l'onglet Pour moi", async () => {
    renderTodayScreen();
    await dismissStackedModal();

    fireEvent.press(screen.getByLabelText('Mon profil'));
    expect(mockRouterPush).toHaveBeenCalledWith('/(tabs)/for-me');
  });

  it('le sheet Affiner change la compagnie et se réinitialise', async () => {
    renderTodayScreen();
    await dismissStackedModal();

    fireEvent.press(screen.getByText('Affiner mes envies'));
    fireEvent.press(screen.getByText('Famille'));
    expect(usePreferencesStore.getState().company).toBe('famille');

    fireEvent.press(screen.getByText('Réinitialiser'));
    expect(usePreferencesStore.getState().company).toBe('couple');
  });
});
