import { create } from 'zustand';

export type CompanyPreference = 'seul' | 'couple' | 'amis' | 'famille';

export const INTEREST_OPTIONS = [
  'Balades',
  'Musées',
  'Terrasses',
  'Concerts',
  'Marchés',
  'Nature',
  'Histoire',
] as const;

export type InterestOption = (typeof INTEREST_OPTIONS)[number];

type PreferencesState = {
  company: CompanyPreference;
  interests: InterestOption[];
  onboardingCompleted: boolean;
  setCompany: (company: CompanyPreference) => void;
  toggleInterest: (interest: InterestOption) => void;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
};

export const usePreferencesStore = create<PreferencesState>((set) => ({
  company: 'couple',
  interests: ['Balades', 'Terrasses', 'Nature'],
  onboardingCompleted: false,
  setCompany: (company) => set({ company }),
  toggleInterest: (interest) =>
    set((state) => ({
      interests: state.interests.includes(interest)
        ? state.interests.filter((item) => item !== interest)
        : [...state.interests, interest],
    })),
  completeOnboarding: () => set({ onboardingCompleted: true }),
  resetOnboarding: () => set({ onboardingCompleted: false }),
}));
