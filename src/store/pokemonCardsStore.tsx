import { create } from "zustand";
import { useAuthStore } from "./userStore";
import { ANY_OPTION } from "../constants";
import type { PokemonCard } from "../types/PokemonCard";
import type { PokemonDBStoreType } from "../types/pokemonDBStoreType";
import { SupabaseRarityType } from "../types/SupabaseRarityType";
import { SupabaseExpansionType } from "../types/SupabaseExpansionType";

// Keep stored codes unchanged; jp/kr/ch are the app's legacy language codes.
const languageLocales: Record<string, string> = { jp: 'ja', kr: 'ko', ch: 'zh' };
export const cardLanguageOptions = (languages: string[]) => languages.map((value) => {
  const locale = languageLocales[value] ?? value;
  const name = new Intl.DisplayNames([locale], { type: 'language' }).of(locale) ?? value;
  return { value, label: name.charAt(0).toLocaleUpperCase(locale) + name.slice(1) };
});

export const usePokemonCardStore = create<PokemonDBStoreType & { searchActive: boolean }>((set) => ({
  pokemonCards: [],
  // Filter options come from the rarity / set tables (src/utils/searchOptions.ts);
  // these are only shown until those load, so they never go out of date.
  rarities: [ANY_OPTION],
  expansions: [ANY_OPTION],
  searchQuery: [],
  searchActive: false,
  splitSearchPokemonNameCharacters: [" ","-"],
  languages: [
    "en" , "es" ,"fr" , "de", "it" , "pt", "jp" ,"kr", "ch"


  ],
  supabase_rarity: [],
  supabase_expansion: [],
  listCardsSelected : [],
  pendingCards: {},
  setPendingCard: (card, quantity, language) =>
    set((state) => {
      const pendingCards = { ...state.pendingCards };
      if (quantity <= 0) delete pendingCards[card.card_id];
      else pendingCards[card.card_id] = { ...card, quantity: Math.min(9999, Math.floor(quantity)), language };
      return { pendingCards };
    }),
  removePendingCard: (cardId) =>
    set((state) => {
      const pendingCards = { ...state.pendingCards };
      delete pendingCards[cardId];
      return { pendingCards };
    }),
  addPendingToSelected: (defaultLanguage) =>
    set((state) => {
      const listCardsSelected = [...state.listCardsSelected];
      for (const card of Object.values(state.pendingCards)) {
        const language = card.language ?? defaultLanguage;
        const index = listCardsSelected.findIndex((selected) => selected.card_id === card.card_id && (selected.language ?? null) === (language ?? null));
        if (index === -1) {
          listCardsSelected.push({ ...card, language });
        } else {
          const existing = listCardsSelected[index];
          listCardsSelected[index] = { ...existing, quantity: Math.min(9999, (existing.quantity ?? 0) + (card.quantity ?? 0)) };
        }
      }
      return { listCardsSelected, pendingCards: {} };
    }),

  setPokemonCards: (pokemonCards: PokemonCard[]) =>
    set(() => ({ pokemonCards })),
  setPokemonCardsSearchQuery: (searchQuery: PokemonCard[]) =>
    set(() => ({ searchQuery, searchActive: true })),
  setSupabase_rarity: (supabase_rarity: SupabaseRarityType[]) =>
    set(() => ({ supabase_rarity })),
  setSupabase_expansion: (supabase_expansion: SupabaseExpansionType[]) =>
    set(() => ({ supabase_expansion })),
  setListCardsSelected: (listCardsSelected: PokemonCard[]) =>
    set(() => ({ listCardsSelected })),

}));

// A draft belongs to the signed-in player, even when this menu is unmounted.
useAuthStore.subscribe((state, previous) => {
  if (state.session?.user.id !== previous.session?.user.id) {
    usePokemonCardStore.setState({ listCardsSelected: [], pendingCards: {} });
  }
});
