import type {PokemonCard} from "./PokemonCard.ts"
import { SupabaseExpansionType } from "./SupabaseExpansionType.ts";
import { SupabaseRarityType } from "./SupabaseRarityType.ts";


/*

{
name:string
language:{
"en":string,
"es":string,
"fr:string"

}

}




*/




export type PokemonDBStoreType ={
    pokemonCards: PokemonCard[];
    rarities: string[];
    expansions : string[];
    searchQuery: PokemonCard[];
    splitSearchPokemonNameCharacters: string[];
    languages : string[];
    supabase_rarity: SupabaseRarityType[];
    supabase_expansion: SupabaseExpansionType[];
    listCardsSelected : PokemonCard[];
    // Add-list cards with a quantity set, keyed by card_id, awaiting selection.
    pendingCards: Record<string, PokemonCard>;
    setPendingCard: (card: PokemonCard, quantity: number, language?: string | null) => void;
    removePendingCard: (cardId: string) => void;
    addPendingToSelected: (defaultLanguage: string | null) => void;
    
    setPokemonCards: (pokemonCards:PokemonCard[]) => void;
    setPokemonCardsSearchQuery : (searchQuery:PokemonCard[]) => void;
    setSupabase_rarity: (supabase_rarity: SupabaseRarityType[])=> void;
    setSupabase_expansion: (supbase_expansion: SupabaseExpansionType[])=> void;
    setListCardsSelected: (listCardsSelected: PokemonCard[])=> void;
}