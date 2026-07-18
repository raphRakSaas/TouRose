import { create } from 'zustand';

export type CompanyPreference = 'seul' | 'couple' | 'amis' | 'famille';

type PreferencesState = {
  company: CompanyPreference;
  setCompany: (company: CompanyPreference) => void;
};

export const usePreferencesStore = create<PreferencesState>((set) => ({
  company: 'couple',
  setCompany: (company) => set({ company }),
}));
