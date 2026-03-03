import type {PokemonCard} from "./PokemonCard.ts"


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
    
    setPokemonCards: (pokemonCards:PokemonCard[]) => void;
    setPokemonCardsSearchQuery : (searchQuery:PokemonCard[]) => void;
}