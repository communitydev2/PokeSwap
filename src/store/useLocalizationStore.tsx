import { create } from 'zustand';
import type { UseLocalizationStoreType } from '../types/UseLocalizationStoreType';
import { DEFAULT_LANGUAGE, translations } from '../i18n';

// Current language and its text. Components read text as useLocalizationStore().t.someKey
export const useLocalizationStore = create<UseLocalizationStoreType>((set) => ({
  language: DEFAULT_LANGUAGE,
  t: translations[DEFAULT_LANGUAGE],
  setLanguage: (language) => set(() => ({ language, t: translations[language] })),
}));
