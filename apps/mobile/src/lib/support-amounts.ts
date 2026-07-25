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
