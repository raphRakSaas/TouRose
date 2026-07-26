export const SITE_TAGLINE = 'Toulouse à voir, à vivre, à aimer.';

export const SITE_CONTACT_EMAIL = 'raphael.rakotonaivo.saas@gmail.com';

/** Page build Expo (dashboard) — peut nécessiter une connexion. */
export const APP_BUILD_PAGE_URL =
  'https://expo.dev/accounts/raphaelrak/projects/tourose/builds/3caf6c18-8642-4e24-bc85-ac12922efcd9';

/** Lien direct APK (profil preview EAS). */
export const APP_APK_DOWNLOAD_URL =
  'https://expo.dev/artifacts/eas/mqiPl-Xl-AqsLZdxvKsYHwQFv7O07Y5paEwfhVfDYOQ.apk';

export type SupportAmountCents = 100 | 500 | 1000;

export type SupportAmountOption = {
  label: string;
  amount: string;
  amountCents: SupportAmountCents;
  description: string;
};

export const SUPPORT_AMOUNT_OPTIONS: readonly SupportAmountOption[] = [
  {
    label: 'Une gorgée de café',
    amount: '1 €',
    amountCents: 100,
    description: 'De quoi garder le créateur éveillé pendant trois lignes de code.',
  },
  {
    label: 'Une chocolatine de compétition',
    amount: '5 €',
    amountCents: 500,
    description: 'Oui, ici on dit chocolatine. Tu viens de financer une pause très toulousaine.',
  },
  {
    label: 'Une brique rose',
    amount: '10 €',
    amountCents: 1000,
    description: 'Une brique symbolique pour construire la prochaine fonctionnalité.',
  },
] as const;
