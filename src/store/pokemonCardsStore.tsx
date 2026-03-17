import { create } from "zustand";
import type { PokemonCard } from "../types/PokemonCard";
import type { PokemonDBStoreType } from "../types/pokemonDBStoreType";
import { SupabaseRarityType } from "../types/SupabaseRarityType";
import { SupabaseExpansionType } from "../types/SupabaseExpansionType";

export const usePokemonCardStore = create<PokemonDBStoreType>((set) => ({
  pokemonCards: [],
  rarities: [
    "Any",
    "One Diamond",
    "Two Diamond",
    "Three Diamond",
    "Four Diamond",
    "One Star",
    "Two Star",
    "One Shiny",
    "Two Shiny",
  ],
  expansions: [
    "Any",
    "Genetic Apex",
    "Mythical Island",
    "Space-Time Smackdown",
    "Triumphant Light",
    "Shining Revelry",
    "Celestial Guardians",
    "Extradimensional Crisis",
    "Eevee Grove",
    "Wisdom of Sea and Sky",
    "Secluded Springs",
    "Mega Rising",
    "Crimson Blaze",
  ],
  searchQuery: [],
  splitSearchPokemonNameCharacters: [" ","-"],
  languages: [
    "en" , "es" ,"fr" , "de", "it" , "pt", "jp" ,"kr", "ch"


  ],
  supabase_rarity: [],
  supabase_expansion: [],

  setPokemonCards: (pokemonCards: PokemonCard[]) =>
    set(() => ({ pokemonCards })),
  setPokemonCardsSearchQuery: (searchQuery: PokemonCard[]) =>
    set(() => ({ searchQuery })),
  setSupabase_rarity: (supabase_rarity: SupabaseRarityType[]) =>
    set(() => ({ supabase_rarity })),
  setSupabase_expansion: (supabase_expansion: SupabaseExpansionType[]) =>
    set(() => ({ supabase_expansion })),

}));
