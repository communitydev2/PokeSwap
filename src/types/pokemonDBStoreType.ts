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
    
    setPokemonCards: (pokemonCards:PokemonCard[]) => void;
    setPokemonCardsSearchQuery : (searchQuery:PokemonCard[]) => void;
    setSupabase_rarity: (supabase_rarity: SupabaseRarityType[])=> void;
    setSupabase_expansion: (supbase_expansion: SupabaseExpansionType[])=> void;
    setListCardsSelected: (listCardsSelected: PokemonCard[])=> void;
}