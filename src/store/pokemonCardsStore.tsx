import { create } from "zustand";
import { ANY_OPTION } from "../constants";
import type { PokemonCard } from "../types/PokemonCard";
import type { PokemonDBStoreType } from "../types/pokemonDBStoreType";
import { SupabaseRarityType } from "../types/SupabaseRarityType";
import { SupabaseExpansionType } from "../types/SupabaseExpansionType";

export const usePokemonCardStore = create<PokemonDBStoreType>((set) => ({
  pokemonCards: [],
  // Filter options come from the rarity / set tables (src/utils/searchOptions.ts);
  // these are only shown until those load, so they never go out of date.
  rarities: [ANY_OPTION],
  expansions: [ANY_OPTION],
  searchQuery: [],
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
      else pendingCards[card.card_id] = { ...card, quantity, language };
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
        const index = listCardsSelected.findIndex((selected) => selected.card_id === card.card_id);
        if (index === -1) {
          listCardsSelected.push({ ...card, language: card.language ?? defaultLanguage });
        } else {
          const existing = listCardsSelected[index];
          listCardsSelected[index] = { ...existing, quantity: (existing.quantity ?? 0) + (card.quantity ?? 0) };
        }
      }
      return { listCardsSelected, pendingCards: {} };
    }),

  setPokemonCards: (pokemonCards: PokemonCard[]) =>
    set(() => ({ pokemonCards })),
  setPokemonCardsSearchQuery: (searchQuery: PokemonCard[]) =>
    set(() => ({ searchQuery })),
  setSupabase_rarity: (supabase_rarity: SupabaseRarityType[]) =>
    set(() => ({ supabase_rarity })),
  setSupabase_expansion: (supabase_expansion: SupabaseExpansionType[]) =>
    set(() => ({ supabase_expansion })),
  setListCardsSelected: (listCardsSelected: PokemonCard[]) =>
    set(() => ({ listCardsSelected })),

}));
