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
