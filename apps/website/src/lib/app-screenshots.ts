export type AppScreenshot = {
  src: string;
  alt: string;
};

/** Captures réelles de l'app mobile TouRose (dossier public/app-screenshots). */
export const APP_SCREENSHOTS: readonly AppScreenshot[] = [
  {
    src: '/app-screenshots/trio-du-jour.png',
    alt: "Écran d'accueil TouRose — trio de suggestions du jour",
  },
  {
    src: '/app-screenshots/onboarding-interets.png',
    alt: "Onboarding TouRose — sélection des centres d'intérêt",
  },
] as const;
