import { useEffect } from "react";
import { supabase } from "../supabaseClient";

export function wait(duration: number) {
  return new Promise((resolve) => setTimeout(resolve, duration));
}










   //  function for finding the matching string value that is the original rarity and expansion table

    //  type will return the weather if it's Rarity or Expansion and basically return the ones I need

export function returnMatchingRarityAndExpansion(pokeCardStore,currentPokemonCard,type){

  // type condition

  if(type=="rarity"){

    // Compare Pokémon card to the rarity ID to the table rarityid in zustand

    for(let i=0;i<pokeCardStore.supabase_rarity.length-1;i++){

      if(currentPokemonCard.rarity_id == pokeCardStore.supabase_rarity[i]['rarity_id']){

        // return the name

        // console.log(pokeCardStore.supabase_rarity[i]['name'])

          return pokeCardStore.supabase_rarity[i]['name']




      }

    }

  }else if(type=="expansion"){

    for(let i=0;i<pokeCardStore.supabase_expansion.length-1;i++){


      if(currentPokemonCard.set_id == pokeCardStore.supabase_expansion[i]['set_id']){


        // return the name


//         console.log(pokeCardStore.supabase_expansion[i]['set_name'])

        return pokeCardStore.supabase_expansion[i]['set_name']




      }


    }



  }

}




export function useSearchFunction(
  searchString: string,
  pokeCardStore,
  useLocStore,
  currentRaritySelected,
  currentSetSelected
) {
  
  // ? search function
  // when one letter is written, you search for a word in the pokemon card
  // search function will search by words.

  // divide query

  // add

  //query 1  return list of cards whose name start with letterr
  // take in consideration rarity and expansion

  function checkWordMatch(searchString: string, currentPokemonCard) {
    // output - true or false
    // goal of this app
    // return all cards whose words match at least one of the words in a card
    // example - altaria - output altaria, mega altaria
    // using some to check if at least one of the words separated by spaces returns your card

    //  currentPokemonCard?.name?.substring(0, 1).toLowerCase() ===
    //       searchString

    //   console.log(searchString.split(" ").length)
    // if you've put spaces in your search

    // loop through differnt split characters to find growth in quick-growth extract for example by using pokeCardStore.splitSearchPokemonNameCharacters
// ^ Does bulbasaur have more than 1 word
    try{
      let separateWordsSearchString = searchString.split(" ");
      // console.log(separateWordsSearchString)

      // CONDITION - if search quety has more than 1 word
      
      // output true or false
      // in current pokemon card, does ANY of the words in the search query fulfill the following conditions:
      
      // - does the current length of letters in AT LEAST (some) of the words that's been writtern in the search query match ONE of the words in the current PokemonCardName
      
      
      
      
      
  
      
      let resultOfQuery:boolean = separateWordsSearchString.every((currentSearchQueryWord) => {
        
        // altaria ex 
        
        // altaria 
        
        // altaria ex
        // word1
        /* be part of one of the words in the pokemon name
        AND
        word2 be part of one of the words in the pokemon name
        
        
        I have to get all search word query to happen in SAME LOOP
        
        
        
        loop through words broke apart by characters
        
        
        
        
        AND word2 have to be true
        */
       
       
       //  for(let w=0; w<=pokeCardStore.splitSearchPokemonNameCharacters.length; w++){
        //    let currentSplitSearchPokemonNameCharacters = pokeCardStore.splitSearchPokemonNameCharacters[w];
        
        // console.log(`${currentSearchQueryWord}`)
        return currentPokemonCard.card_name.split(" ").some((currentPokemonCardWord,idx,arr) => {
          // console.log(`${currentPokemonCardWord}`)
          // console.log(currentSearchQueryWord.toLowerCase() ==currentPokemonCardWord           .substring(0, currentSearchQueryWord.length)           .toLowerCase());
          return currentSearchQueryWord.toLowerCase() ==
          currentPokemonCardWord
          .substring(0, currentSearchQueryWord.length)
          .toLowerCase();
        });
        // }
      });
      
      
      return resultOfQuery;
    }catch(err){
      // it means it's only 1 word
      // I get value
      // try splitting poke card name, and return true if it matches first letter
      try{
        // Does bulbasaur name have more than 1 word?
        console.log("Does current Pokemon card name name have more than 1 word?")
        return currentPokemonCard.card_name.split(" ").some((currentPokemonCardWord,idx,arr) => {
            // console.log(`${typeof currentSearchQueryWord} ${arr}`)
            return searchString.toLowerCase() ==
            currentPokemonCardWord
            .substring(0, searchString.length)
            .toLowerCase();
          });
      }catch(err){
        // Does bulbasaur name have 1 word?
        // It compares searchString to Bulbasaur name
        // console.log(`test ${currentPokemonCard}`)
        // console.log(`test2 ${currentPokemonCard.card_name}`)
        return searchString.toLowerCase() ==
            currentPokemonCard.card_name
            .substring(0, searchString.length)
            .toLowerCase();
      }
    }
    }
    
    // if you're typing just one word "a ". the more characters you write it will keep looking until your word is different from the original word (alk in search term altaria will no longer return it)
    
 



  function filterSearchQuery(currentPokemonCard) {
    let textValueRarity =
      currentRaritySelected;
      // console.log(textValueRarity)
    let textValueSet = currentSetSelected
    // console.log(currentPokemonCard)
    const currentPokeCardRarity = returnMatchingRarityAndExpansion(pokeCardStore,currentPokemonCard,"rarity");
    // 
    const currentPokeCardExpansion = returnMatchingRarityAndExpansion(pokeCardStore,currentPokemonCard,"expansion");



    // console.log(supabaseRarityTable)
    // console.log(supabaseExpansionTable)

    //  3 - search, rarity set and expansion set
    if (
      currentRaritySelected.toString() != useLocStore.localizationArray[10] &&
      currentSetSelected.toString() != useLocStore.localizationArray[10] &&
      searchString.length >0
    ) {
      return (
        currentPokeCardRarity === textValueRarity &&
        currentPokeCardExpansion === textValueSet &&
        checkWordMatch(searchString, currentPokemonCard)
      );

      // 2 - search query, rarity set and expansion any AND search string must be MORE THAN 0 letters
    } else if (
      currentRaritySelected.toString() != useLocStore.localizationArray[10] &&
      currentSetSelected.toString() === useLocStore.localizationArray[10] &&
      searchString.length >0
    ) {
      return (
        currentPokeCardRarity === textValueRarity &&
        checkWordMatch(searchString, currentPokemonCard)
      );

      // 1 - only search query, rarity any and expansion set
    } else if (
      currentRaritySelected.toString() === useLocStore.localizationArray[10] &&
      currentSetSelected.toString() != useLocStore.localizationArray[10] &&
      searchString.length >0
    ) {
      return (
        currentPokeCardExpansion === textValueSet &&
        checkWordMatch(searchString, currentPokemonCard)
      );
      // rarity and set are any and SEARCH STRING ISN'T empty
    } else if (
      currentRaritySelected.toString() == useLocStore.localizationArray[10] &&
      currentSetSelected.toString() == useLocStore.localizationArray[10] &&
      searchString.length >0
    ) {

      return (
        // console.log("triggering"),
        checkWordMatch(searchString, currentPokemonCard)
      );
    }else if(
      // rarity is selected , set is any and SEARCH STRING is empty
      currentRaritySelected.toString() !=useLocStore.localizationArray[10] &&
      currentSetSelected.toString() == useLocStore.localizationArray[10] &&
      searchString.length==0
    ){
      // console.log(`${currentPokemonCard.rarity.toLowerCase()} ${textValueRarity.toLowerCase()}`)
      
      return currentPokeCardRarity.toLowerCase() == textValueRarity.toLowerCase();
    }else if(
      // rarity is any , set is selected and SEARCH STRING is empty
      currentRaritySelected.toString() ==useLocStore.localizationArray[10] &&
      currentSetSelected.toString() != useLocStore.localizationArray[10] &&
      searchString.length==0
      
    ){
      
      return currentPokeCardExpansion.toLowerCase() == textValueSet.toLowerCase();
    }else if(
      // rarity is set , expansion is set and SEARCH STRING is empty
      currentRaritySelected.toString() !=useLocStore.localizationArray[10] &&
      currentSetSelected.toString() != useLocStore.localizationArray[10] &&
      searchString.length==0
      
    ){
      return currentPokeCardExpansion.toLowerCase() == textValueSet.toLowerCase() &&
      currentPokeCardRarity.toLowerCase() == textValueRarity.toLowerCase();

    }

  }
  const query1 = pokeCardStore.pokemonCards.filter(filterSearchQuery);
  console.log(query1)
    return query1;
}
