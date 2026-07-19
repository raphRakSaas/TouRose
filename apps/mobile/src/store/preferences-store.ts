import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

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

export type NotificationSettings = {
  /** Idées de sorties pour le week-end (vendredi). */
  weekendIdeas: boolean;
  /** Rappel la veille d'un événement mis en favori. */
  favoriteReminders: boolean;
  /** Suggestions adaptées à la météo du jour. */
  weatherSuggestions: boolean;
};

type PreferencesState = {
  company: CompanyPreference;
  interests: InterestOption[];
  onboardingCompleted: boolean;
  notificationSettings: NotificationSettings;
  setCompany: (company: CompanyPreference) => void;
  toggleInterest: (interest: InterestOption) => void;
  setNotificationSetting: (settingKey: keyof NotificationSettings, enabled: boolean) => void;
  resetPreferences: () => void;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
};

const DEFAULT_COMPANY: CompanyPreference = 'couple';
const DEFAULT_INTERESTS: InterestOption[] = ['Balades', 'Terrasses', 'Nature'];
const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  weekendIdeas: true,
  favoriteReminders: true,
  weatherSuggestions: false,
};

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      company: DEFAULT_COMPANY,
      interests: DEFAULT_INTERESTS,
      onboardingCompleted: false,
      notificationSettings: DEFAULT_NOTIFICATION_SETTINGS,
      setCompany: (company) => set({ company }),
      toggleInterest: (interest) =>
        set((state) => ({
          interests: state.interests.includes(interest)
            ? state.interests.filter((item) => item !== interest)
            : [...state.interests, interest],
        })),
      setNotificationSetting: (settingKey, enabled) =>
        set((state) => ({
          notificationSettings: { ...state.notificationSettings, [settingKey]: enabled },
        })),
      resetPreferences: () =>
        set({
          company: DEFAULT_COMPANY,
          interests: DEFAULT_INTERESTS,
          notificationSettings: DEFAULT_NOTIFICATION_SETTINGS,
        }),
      completeOnboarding: () => set({ onboardingCompleted: true }),
      resetOnboarding: () => set({ onboardingCompleted: false }),
    }),
    {
      name: 'tourose.preferences',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        company: state.company,
        interests: state.interests,
        onboardingCompleted: state.onboardingCompleted,
        notificationSettings: state.notificationSettings,
      }),
    },
  ),
);
