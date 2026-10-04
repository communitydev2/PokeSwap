import type { Language, Translations } from '../i18n';

export interface UseLocalizationStoreType {
  language: Language;
  // Text for the current language, e.g. t.quantity
  t: Translations;
  setLanguage: (language: Language) => void;
}
