import { createFileRoute } from '@tanstack/react-router'
import { supabase } from '../../supabaseClient'
import { useEffect,useState } from 'react'
import { usePokemonCardStore } from '../../store/pokemonCardsStore'
import { PokemonCard } from '../../types/PokemonCard'
import { PokeCard } from './PokeCard'
export const Route = createFileRoute('/pokeList/PokeList')({
  component: PokeList,
})

export function PokeList({listType}:{listType:string}) {
  const [loading, setLoading] = useState(true)
  const usePokeCard = usePokemonCardStore();
  // will contain either the search query or the full Pokémon cards It cannot be tampered with
  const [activeList,setActiveList] = useState<PokemonCard[]>([]);
  const pagesize = 10;
  const [currentPageNumber,setCurrentPageNumber] = useState<number>(1);
  const [currentPageItems,setCurrentPageItems] = useState<PokemonCard[]>([]);
 
  // Logic to add card to database
    const [selectedCard,setSelectedCard] = useState<PokemonCard>();

    // set state


 

  // every time the search query gets updated these user fact will determine what is the active list
  useEffect(()=> {
    // if the list is to add the cards then it's going to set the active list to either the search query or the Pokémon cards
    if (listType=="listAddCards"){
      usePokeCard.searchQuery.length >0 ? setActiveList(usePokeCard.searchQuery) : setActiveList(usePokeCard.pokemonCards);
      
    }else{
      // if the list is off list selected section then it will display the the list of the cards that are selected
      
      setActiveList(usePokeCard.listCardsSelected)
    }
    // console.log(`${listType} ${activeList}`)

// must reset the current page to one as now the search query has changed 
setCurrentPageNumber(1)


  },[usePokeCard.searchQuery,usePokeCard.listCardsSelected])


  // every time uh the page is changed it does the maths
  // it is being when there is a new page number and when the active list has been set because once you mount the active list has not been set yet so you have to wait for that to be set so that you can have the list to be displayed
useEffect(()=>{
 const totalItems = activeList.length

 let totalPages = Math.ceil(totalItems / pagesize)

 let startIndex = (currentPageNumber - 1) * pagesize

 let endIndex = startIndex + pagesize
// console.log(`${startIndex} and ${endIndex} and ${activeList}`)
if (activeList.length > 10){

  setCurrentPageItems(activeList.slice(startIndex,endIndex))
}else{
  // console.log(activeList)
  setCurrentPageItems(activeList)
}


},[currentPageNumber,activeList,usePokeCard.listCardsSelected])

  return (
    <>
    
   
      <ul>
      {
        // only usestates get recognized here , not zustand
        // so this has to be called so that currentPageItems can be set
        // before trying to map
        currentPageItems.length > 0 && (
      
      
      (currentPageItems).map((card,i) => {

        if(card == null)return
        
        
        return (
          <li key={i} style={{ listStyleType: 'none' }}>
            <div
              
              onClick={() => setSelectedCard(card)}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.02)'
                e.currentTarget.style.cursor = 'pointer'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)'
              }}
              style={{
                transition: 'transform 150ms ease',
                height: '300px',
                background: selectedCard === card ? '#735e5e' : 'transparent',
                border: 'none',
                padding: 0,
              }}
            >
              <PokeCard currentCard={card} isCardSelected={selectedCard === card} pokeListType={listType}/>
            </div>
          </li>
        )
      })
    
    
        )
    }
      </ul>
      {currentPageNumber >1 &&  (
<button onClick={()=> {

        setCurrentPageNumber(currentPageNumber>1 ?currentPageNumber-1 : currentPageNumber)

      }}>Previous</button>


      )}
      
      <button onClick={()=> {

 setCurrentPageNumber(currentPageNumber+1)

 }

      }>Next</button>

    
    
    
    <p>Test</p>
    </>
  ) 
}
