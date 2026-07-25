import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';

let client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey || supabaseAnonKey.includes('replace-with')) {
    return null;
  }

  if (!client) {
    client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        flowType: 'pkce',
      },
    });
  }

  return client;
}

export function getAuthRedirectUrl(): string {
  return Linking.createURL('/auth/callback');
}

export async function parseAuthSessionFromUrl(url: string): Promise<boolean> {
  const supabaseClient = getSupabaseClient();
  if (!supabaseClient) {
    return false;
  }

  const parsedUrl = Linking.parse(url);
  const queryParams = parsedUrl.queryParams ?? {};
  const accessToken =
    typeof queryParams.access_token === 'string' ? queryParams.access_token : null;
  const refreshToken =
    typeof queryParams.refresh_token === 'string' ? queryParams.refresh_token : null;
  const authCode = typeof queryParams.code === 'string' ? queryParams.code : null;

  if (accessToken && refreshToken) {
    const { error } = await supabaseClient.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    return !error;
  }

  if (authCode) {
    const { error } = await supabaseClient.auth.exchangeCodeForSession(authCode);
    return !error;
  }

  const hashIndex = url.indexOf('#');
  if (hashIndex >= 0) {
    const hashParams = new URLSearchParams(url.slice(hashIndex + 1));
    const hashAccessToken = hashParams.get('access_token');
    const hashRefreshToken = hashParams.get('refresh_token');
    if (hashAccessToken && hashRefreshToken) {
      const { error } = await supabaseClient.auth.setSession({
        access_token: hashAccessToken,
        refresh_token: hashRefreshToken,
      });
      return !error;
    }
  }

  return false;
}
