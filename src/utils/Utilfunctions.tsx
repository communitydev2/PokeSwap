export function wait(duration: number) {
  return new Promise((resolve) => setTimeout(resolve, duration));
}

export function useSearchFunction(
  searchString: string,
  pokeCardStore,
  currentRaritySelected,
  currentSetSelected
) {
  
  // console.log(`${typeof searchString} ${pokeCardStore.rarities[currentRaritySelected]} ${currentSetSelected.toString()}`)
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

    // console.log(`split ${pokeCardStore.splitSearchPokemonNameCharacters}`)
    
    let separateWordsSearchString = searchString.split(" ");
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

      return currentPokemonCard.name.split(" ").some((currentPokemonCardWord,idx,arr) => {
        // console.log(`${typeof currentSearchQueryWord} ${arr}`)
        return currentSearchQueryWord.toLowerCase() ==
          currentPokemonCardWord
            .substring(0, currentSearchQueryWord.length)
            .toLowerCase();
      });
    // }
    });

    
    return resultOfQuery;
}

  // if you're typing just one word "a ". the more characters you write it will keep looking until your word is different from the original word (alk in search term altaria will no longer return it)

 

  function filterSearchQuery(currentPokemonCard) {
    let textValueRarity =
      pokeCardStore.rarities[parseInt(currentRaritySelected)];
    let textValueSet = pokeCardStore.expansions[parseInt(currentSetSelected)];




    //  3 - search, rarity set and expansion set
    if (
      currentRaritySelected.toString() != "0" &&
      currentSetSelected.toString() != "0" &&
      searchString.length >0
    ) {
      return (
        currentPokemonCard.rarity === textValueRarity &&
        currentPokemonCard.set.name === textValueSet &&
        checkWordMatch(searchString, currentPokemonCard)
      );

      // 2 - search query, rarity set and expansion any AND search string must be MORE THAN 0 letters
    } else if (
      currentRaritySelected.toString() != "0" &&
      currentSetSelected.toString() === "0" &&
      searchString.length >0
    ) {
      return (
        currentPokemonCard.rarity === textValueRarity &&
        checkWordMatch(searchString, currentPokemonCard)
      );

      // 1 - only search query, rarity any and expansion set
    } else if (
      currentRaritySelected.toString() === "0" &&
      currentSetSelected.toString() != "0" &&
      searchString.length >0
    ) {
      return (
        currentPokemonCard.set.name === textValueSet &&
        checkWordMatch(searchString, currentPokemonCard)
      );
      // rarity and set are any and SEARCH STRING ISN@T empty
    } else if (
      currentRaritySelected.toString() == "0" &&
      currentSetSelected.toString() == "0" &&
      searchString.length >0
    ) {
      return (
        // console.log("condition"),
        checkWordMatch(searchString, currentPokemonCard)
      );
    }else if(
      // rarity is selected , set is any and SEARCH STRING is empty
      currentRaritySelected.toString() !="0" &&
      currentSetSelected.toString() == "0" &&
      searchString.length==0
    ){
      // console.log(`${currentPokemonCard.rarity.toLowerCase()} ${textValueRarity.toLowerCase()}`)
      
      return currentPokemonCard.rarity.toLowerCase() == textValueRarity.toLowerCase();
    }else if(
      // rarity is any , set is selected and SEARCH STRING is empty
      currentRaritySelected.toString() =="0" &&
      currentSetSelected.toString() != "0" &&
      searchString.length==0
      
    ){
      
      return currentPokemonCard.set.name.toLowerCase() == textValueSet.toLowerCase();
    }else if(
      // rarity is set , expansion is set and SEARCH STRING is empty
      currentRaritySelected.toString() !="0" &&
      currentSetSelected.toString() != "0" &&
      searchString.length==0
      
    ){
      return currentPokemonCard.set.name.toLowerCase() == textValueSet.toLowerCase() &&
      currentPokemonCard.rarity.toLowerCase() == textValueRarity.toLowerCase();

    }

  }
  const query1 = pokeCardStore.pokemonCards.filter(filterSearchQuery);
  // console.log(query1)
    return query1;
}
