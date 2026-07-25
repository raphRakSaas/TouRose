import type { Session, User } from '@supabase/supabase-js';

import { getAuthRedirectUrl, getSupabaseClient } from '@/src/lib/supabase';

export type AuthSessionState = {
  session: Session | null;
  user: User | null;
};

export async function getCurrentSession(): Promise<AuthSessionState> {
  const client = getSupabaseClient();
  if (!client) {
    return { session: null, user: null };
  }
  const { data } = await client.auth.getSession();
  return { session: data.session, user: data.session?.user ?? null };
}

export async function sendMagicLink(email: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase non configuré — lance `pnpm dev:up`.');
  }

  const { error } = await client.auth.signInWithOtp({
    email: email.trim().toLowerCase(),
    options: {
      emailRedirectTo: getAuthRedirectUrl(),
    },
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function signOut(): Promise<void> {
  const client = getSupabaseClient();
  if (!client) {
    return;
  }
  await client.auth.signOut();
}

export function subscribeToAuthChanges(
  listener: (state: AuthSessionState) => void,
): () => void {
  const client = getSupabaseClient();
  if (!client) {
    return () => undefined;
  }

  const { data } = client.auth.onAuthStateChange((_event, session) => {
    listener({ session, user: session?.user ?? null });
  });

  return () => {
    data.subscription.unsubscribe();
  };
}
