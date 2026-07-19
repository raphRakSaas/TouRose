import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import ForMeScreen from '../../app/(tabs)/for-me';
import NotificationsSettingsScreen from '../../app/settings/notifications';
import PreferencesSettingsScreen from '../../app/settings/preferences';
import { usePreferencesStore } from '@/src/store/preferences-store';

const mockRouterPush = jest.fn();
const mockRouterReplace = jest.fn();

jest.mock('expo-router', () => ({
  router: {
    push: (...args: unknown[]) => mockRouterPush(...args),
    replace: (...args: unknown[]) => mockRouterReplace(...args),
  },
  Link: ({ children }: { children: React.ReactNode }) => children,
  Stack: {
    Screen: () => null,
  },
  useFocusEffect: (callback: () => void) => {
    const React = jest.requireActual<typeof import('react')>('react');
    React.useEffect(() => {
      callback();
    }, [callback]);
  },
}));

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (callback: () => void) => {
    const React = jest.requireActual<typeof import('react')>('react');
    React.useEffect(() => {
      callback();
    }, [callback]);
  },
}));

function renderWithSafeArea(children: React.ReactElement) {
  return render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 47, left: 0, right: 0, bottom: 34 },
      }}
    >
      {children}
    </SafeAreaProvider>,
  );
}

describe('ForMeScreen menu', () => {
  beforeEach(() => {
    mockRouterPush.mockClear();
  });

  it('opens each settings screen from the menu', async () => {
    renderWithSafeArea(<ForMeScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('me-menu-Préférences')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('me-menu-Préférences'));
    expect(mockRouterPush).toHaveBeenCalledWith('/settings/preferences');

    fireEvent.press(screen.getByTestId('me-menu-Notifications'));
    expect(mockRouterPush).toHaveBeenCalledWith('/settings/notifications');

    fireEvent.press(screen.getByTestId('me-menu-Compte (facultatif)'));
    expect(mockRouterPush).toHaveBeenCalledWith('/settings/account');

    fireEvent.press(screen.getByTestId('me-menu-Sources & confidentialité'));
    expect(mockRouterPush).toHaveBeenCalledWith('/settings/privacy');
  });

  it('still opens the support flow', async () => {
    renderWithSafeArea(<ForMeScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('me-menu-Soutenir TouRose')).toBeTruthy();
    });
    fireEvent.press(screen.getByTestId('me-menu-Soutenir TouRose'));
    expect(
      screen.getByText("Aucun avantage, juste un coup de pouce sympa pour continuer à construire l'app."),
    ).toBeTruthy();
  });
});

describe('PreferencesSettingsScreen', () => {
  it('toggles an interest in the store', () => {
    usePreferencesStore.setState({ interests: ['Balades'] });
    renderWithSafeArea(<PreferencesSettingsScreen />);

    fireEvent.press(screen.getByTestId('pref-interest-Musées'));
    expect(usePreferencesStore.getState().interests).toContain('Musées');

    fireEvent.press(screen.getByTestId('pref-interest-Balades'));
    expect(usePreferencesStore.getState().interests).not.toContain('Balades');
  });

  it('changes the company preference', () => {
    usePreferencesStore.setState({ company: 'couple' });
    renderWithSafeArea(<PreferencesSettingsScreen />);

    fireEvent.press(screen.getByTestId('pref-company-famille'));
    expect(usePreferencesStore.getState().company).toBe('famille');
  });
});

describe('NotificationsSettingsScreen', () => {
  it('persists a notification toggle in the store', () => {
    usePreferencesStore.setState({
      notificationSettings: {
        weekendIdeas: true,
        favoriteReminders: true,
        weatherSuggestions: false,
      },
    });
    renderWithSafeArea(<NotificationsSettingsScreen />);

    fireEvent(screen.getByTestId('notif-switch-weatherSuggestions'), 'valueChange', true);
    expect(usePreferencesStore.getState().notificationSettings.weatherSuggestions).toBe(true);

    fireEvent(screen.getByTestId('notif-switch-weekendIdeas'), 'valueChange', false);
    expect(usePreferencesStore.getState().notificationSettings.weekendIdeas).toBe(false);
  });
});
