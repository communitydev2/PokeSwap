import { en, type Translations } from './en';

// Every supported language. Add new ones here once their file exists.
export const translations = { en } satisfies Record<string, Translations>;

export type Language = keyof typeof translations;
export const DEFAULT_LANGUAGE: Language = 'en';
export type { Translations };
