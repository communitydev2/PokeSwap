import { LIST_TYPE } from '../../constants'
import { supabase } from '../../supabaseClient'
import { useEffect,useState } from 'react'
import { usePokemonCardStore } from '../../store/pokemonCardsStore'
import { PokemonCard } from '../../types/PokemonCard'
import { PokeCard } from './PokeCard'
import { Button, Group, Text } from '@mantine/core'
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react'
import { useLocalizationStore } from '../../store/useLocalizationStore'

export function PokeList({listType}:{listType:string}) {
  const [loading, setLoading] = useState(true)
  const usePokeCard = usePokemonCardStore();
  // will contain either the search query or the full Pokémon cards It cannot be tampered with
  const [activeList,setActiveList] = useState<PokemonCard[]>([]);
  const pagesize = 10;
  const [currentPageNumber,setCurrentPageNumber] = useState<number>(1);
  const [currentPageItems,setCurrentPageItems] = useState<PokemonCard[]>([]);
  const t = useLocalizationStore((state) => state.t);
 
  // Logic to add card to database
    const [selectedCard,setSelectedCard] = useState<PokemonCard>();

    // set state


 

  // Search and catalogue changes reset only the add list.
  useEffect(() => {
    if (listType != LIST_TYPE.add) return
    setActiveList(usePokeCard.searchQuery.length > 0 ? usePokeCard.searchQuery : usePokeCard.pokemonCards)
    setCurrentPageNumber(1)
  }, [listType, usePokeCard.searchQuery, usePokeCard.pokemonCards])

  // Keep the selected list on its current page unless that page no longer exists.
  useEffect(() => {
    if (listType == LIST_TYPE.add) return
    setActiveList(usePokeCard.listCardsSelected)
    const lastPage = Math.max(1, Math.ceil(usePokeCard.listCardsSelected.length / pagesize))
    setCurrentPageNumber((page) => Math.min(page, lastPage))
  }, [listType, usePokeCard.listCardsSelected])


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


},[currentPageNumber,activeList])

  const pageCount = Math.ceil(activeList.length / pagesize)

  return (
    // {listType != LIST_TYPE.confirmAdd && (
    <>
    
   
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, width: '100%', display: 'flex', flexDirection: 'column', gap: 'var(--mantine-spacing-sm)' }}>
      {
        // only usestates get recognized here , not zustand
        // so this has to be called so that currentPageItems can be set
        // before trying to map
        currentPageItems.length > 0 && (
      
      

          
      (currentPageItems).map((card) => {

        if(card == null)return
        
        
        // The confirmation list (cards about to be added) is display-only:
        // no tap-to-select, highlight, hover zoom or buttons
        const isConfirmList = listType == LIST_TYPE.confirmAdd

        return isConfirmList ? (
          <li key={`${card.card_id}:${card.language ?? null}`} style={{ listStyleType: 'none' }}>
            <PokeCard currentCard={card} isCardSelected={false} pokeListType={listType}/>
          </li>
        ) : (
          <li key={`${card.card_id}:${card.language ?? null}`} style={{ listStyleType: 'none' }}>
            {/* Tap a card to select it; the selected card is outlined and shows its main button */}
            <div data-click-id="PokeList/card"
              onClick={() => setSelectedCard(card)}
              style={{
                cursor: 'pointer',
                padding: 'var(--mantine-spacing-sm)',
                borderRadius: 'var(--mantine-radius-md)',
                border: `1px solid ${selectedCard === card ? 'var(--mantine-color-blue-filled)' : 'var(--mantine-color-default-border)'}`,
                background: selectedCard === card ? 'var(--mantine-color-blue-light)' : 'var(--mantine-color-body)',
                transition: 'border-color 150ms ease, background 150ms ease',
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
      
      {pageCount > 1 && (
        <Group justify="space-between" mt="md" w="100%">
          <Button data-click-id="PokeList/previous-page" variant="default" leftSection={<IconChevronLeft size={16} />} disabled={currentPageNumber <= 1}
            onClick={() => setCurrentPageNumber(Math.max(1, currentPageNumber - 1))}>
            {t.previousPage}
          </Button>
          <Text size="sm" c="dimmed">{currentPageNumber} / {pageCount}</Text>
          <Button data-click-id="PokeList/next-page" variant="default" rightSection={<IconChevronRight size={16} />} disabled={currentPageNumber >= pageCount}
            onClick={() => setCurrentPageNumber(Math.min(pageCount, currentPageNumber + 1))}>
            {t.nextPage}
          </Button>
        </Group>
      )}
    </>
  // )} -- This is where I have to end the condition for the different list type
  ) 
}
