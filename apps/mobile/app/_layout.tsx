import {
  Fraunces_600SemiBold,
  Fraunces_700Bold,
  useFonts as useFrauncesFonts,
} from '@expo-google-fonts/fraunces';
import {
  SourceSans3_400Regular,
  SourceSans3_600SemiBold,
  SourceSans3_700Bold,
  useFonts as useSourceSansFonts,
} from '@expo-google-fonts/source-sans-3';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as Linking from 'expo-linking';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import '../global.css';

import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { syncLocalCatalogWithCloud } from '@/src/data/catalog-sync';
import { subscribeToAuthChanges } from '@/src/lib/auth';
import { parseAuthSessionFromUrl } from '@/src/lib/supabase';
import { usePreferencesStore } from '@/src/store/preferences-store';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            retry: 1,
          },
        },
      }),
  );

  const [frauncesLoaded] = useFrauncesFonts({
    Fraunces_600SemiBold,
    Fraunces_700Bold,
  });
  const [sourceSansLoaded] = useSourceSansFonts({
    SourceSans3_400Regular,
    SourceSans3_600SemiBold,
    SourceSans3_700Bold,
  });

  const fontsLoaded = frauncesLoaded && sourceSansLoaded;
  const onboardingCompleted = usePreferencesStore((state) => state.onboardingCompleted);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges((authState) => {
      if (!authState.session) {
        return;
      }
      const company = usePreferencesStore.getState().company;
      const interests = usePreferencesStore.getState().interests;
      void syncLocalCatalogWithCloud({ company, interests: [...interests] }).catch(() => undefined);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const handleDeepLink = (incomingUrl: string | null): void => {
      if (!incomingUrl || !incomingUrl.includes('auth/callback')) {
        return;
      }
      void parseAuthSessionFromUrl(incomingUrl).then((success) => {
        if (success) {
          router.push('/auth/callback');
        }
      });
    };

    void Linking.getInitialURL().then(handleDeepLink);
    const subscription = Linking.addEventListener('url', (event) => {
      handleDeepLink(event.url);
    });
    return () => subscription.remove();
  }, [router]);

  useEffect(() => {
    if (!fontsLoaded) {
      return;
    }
    const onOnboarding = segments[0] === 'onboarding';
    if (!onboardingCompleted && !onOnboarding) {
      router.replace('/onboarding');
    } else if (onboardingCompleted && onOnboarding) {
      router.replace('/(tabs)');
    }
  }, [fontsLoaded, onboardingCompleted, router, segments]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="dark" />
      <OfflineBanner />
      <Stack>
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="auth/callback" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="place/[slug]"
          options={{
            headerShown: true,
            headerBackTitle: 'Retour',
            headerStyle: { backgroundColor: '#FBF8F4' },
            headerTintColor: '#1F1C19',
            headerTitleStyle: { fontFamily: 'Fraunces_700Bold' },
          }}
        />
        <Stack.Screen
          name="event/[slug]"
          options={{
            headerShown: true,
            headerBackTitle: 'Retour',
            headerStyle: { backgroundColor: '#FBF8F4' },
            headerTintColor: '#1F1C19',
            headerTitleStyle: { fontFamily: 'Fraunces_700Bold' },
          }}
        />
        {['settings/preferences', 'settings/notifications', 'settings/account', 'settings/privacy'].map(
          (settingsRoute) => (
            <Stack.Screen
              key={settingsRoute}
              name={settingsRoute}
              options={{
                headerShown: true,
                headerBackTitle: 'Retour',
                headerStyle: { backgroundColor: '#FBF8F4' },
                headerTintColor: '#1F1C19',
                headerTitleStyle: { fontFamily: 'Fraunces_700Bold' },
              }}
            />
          ),
        )}
      </Stack>
    </QueryClientProvider>
  );
}
