import type { CompanyPreference } from '@/src/store/preferences-store';

export type MockSuggestion = {
  id: string;
  title: string;
  reason: string;
};

export const MOCK_EVENTS = [
  {
    id: 'event-demo-1',
    title: 'Balade fictive sur les quais (DÉMO)',
    summary: 'Donnée de démonstration — ne pas confondre avec un événement réel.',
  },
  {
    id: 'event-demo-2',
    title: 'Atelier chocolatine imaginaire (DÉMO)',
    summary: 'Contenu fictif TouRose pour le bootstrap.',
  },
] as const;

export const MOCK_PLACES = [
  {
    id: 'place-demo-1',
    name: 'Jardin fictif des briques roses (DÉMO)',
    summary: 'Lieu inventé pour les tests locaux.',
  },
  {
    id: 'place-demo-2',
    name: 'Belvédère imaginaire Garonne (DÉMO)',
    summary: 'Point d’intérêt fictif — aucune licence tierce.',
  },
] as const;

export async function fetchMockSuggestions(company: CompanyPreference): Promise<MockSuggestion[]> {
  await new Promise((resolve) => setTimeout(resolve, 120));

  return [
    {
      id: 'suggestion-1',
      title: 'Flâner près de la Garonne (DÉMO)',
      reason: `Adapté pour une sortie ${company} · gratuit · extérieur`,
    },
    {
      id: 'suggestion-2',
      title: 'Pause culture au centre (DÉMO)',
      reason: 'Alternative à moins de 10 € · intérieur possible',
    },
    {
      id: 'suggestion-3',
      title: 'Coin moins connu du quartier (DÉMO)',
      reason: 'Proposition inattendue · à 15 minutes à pied',
    },
  ];
}
