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
  resetPreferences: () => void;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
};

const DEFAULT_COMPANY: CompanyPreference = 'couple';
const DEFAULT_INTERESTS: InterestOption[] = ['Balades', 'Terrasses', 'Nature'];

export const usePreferencesStore = create<PreferencesState>((set) => ({
  company: DEFAULT_COMPANY,
  interests: DEFAULT_INTERESTS,
  onboardingCompleted: false,
  setCompany: (company) => set({ company }),
  toggleInterest: (interest) =>
    set((state) => ({
      interests: state.interests.includes(interest)
        ? state.interests.filter((item) => item !== interest)
        : [...state.interests, interest],
    })),
  resetPreferences: () => set({ company: DEFAULT_COMPANY, interests: DEFAULT_INTERESTS }),
  completeOnboarding: () => set({ onboardingCompleted: true }),
  resetOnboarding: () => set({ onboardingCompleted: false }),
}));
