import * as Linking from 'expo-linking';

import { getOrCreateInstallationId } from '@/src/lib/installation-id';
import { getSupabaseClient } from '@/src/lib/supabase';

import type { SupportAmountCents } from '@/src/lib/support-amounts';

export type { SupportAmountCents } from '@/src/lib/support-amounts';

export type SupportCheckoutResult =
  | { ok: true; checkoutUrl: string }
  | { ok: false; errorMessage: string };

export async function createSupportCheckoutSession(
  amountCents: SupportAmountCents,
): Promise<SupportCheckoutResult> {
  const supabaseClient = getSupabaseClient();
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseClient || !supabaseUrl || !anonKey) {
    return { ok: false, errorMessage: 'Supabase mobile non configuré (URL ou clé anon manquante).' };
  }

  const installationId = await getOrCreateInstallationId();
  const successUrl = Linking.createURL('/support/success');
  const cancelUrl = Linking.createURL('/support/cancel');

  let response: Response;
  try {
    response = await fetch(`${supabaseUrl}/functions/v1/create-support-checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${anonKey}`,
        apikey: anonKey,
      },
      body: JSON.stringify({
        installationId,
        amountCents,
        platform: 'mobile',
        successUrl,
        cancelUrl,
      }),
    });
  } catch {
    return {
      ok: false,
      errorMessage: 'Impossible de joindre les Edge Functions. Vérifie que `pnpm dev:up` tourne.',
    };
  }

  const body = (await response.json().catch(() => ({}))) as {
    checkoutUrl?: string;
    error?: string;
    code?: string;
  };

  if (!response.ok) {
    return {
      ok: false,
      errorMessage:
        body.error ??
        `Erreur serveur (${response.status}). Redémarre \`pnpm dev:up\` après avoir modifié supabase/functions/.env.`,
    };
  }

  if (!body.checkoutUrl) {
    return { ok: false, errorMessage: 'Réponse Stripe invalide (checkoutUrl manquant).' };
  }

  return { ok: true, checkoutUrl: body.checkoutUrl };
}
