import { createFileRoute } from '@tanstack/react-router'
import type{ PokemonCard } from '../../types/PokemonCard'
import { useState } from 'react'
import { background } from 'storybook/theming'
import { useLocalizationStore } from '../../store/uselocalizationStore'
import { usePokemonCardStore } from '../../store/pokemonCardsStore'
import { useAuthStore } from '../../store/userStore'
import { useStateStore } from '../../store/useStateStore'
export const Route = createFileRoute('/pokeList/PokeCard')({
  component: PokeCard,
})

/*



the quantity is updated the reset to 0 on different conditions:
- when you press add to select the quantity becomes 0 
- when you make a new search query you will reset the quantity of cards in the add list section
- when you change pagination page


*/


export function PokeCard(
  {
    currentCard, isCardSelected,pokeListType
  }:
  {
  currentCard:PokemonCard,
  isCardSelected:boolean, 
  pokeListType:string}
) {
  const usePokeCard = usePokemonCardStore();
  const useLocStore = useLocalizationStore();
  const useStateHandler = useStateStore();
  const thisCardInSelectedCardsList = pokeListType == "listAddCards" ? "nothing" : usePokeCard.listCardsSelected.find(card => currentCard.card_id == card.card_id)

    const [quantity, setQuantity] = useState(pokeListType == "listAddCards" ? 0 : thisCardInSelectedCardsList != null ? 0+ thisCardInSelectedCardsList.quantity : 0)
    const activeButtonText = pokeListType == "listAddCards" ? "Add to Selected" : "Remove from selected";
    const activeButtonColor =  pokeListType == "listAddCards" ? '#089bdf' : '#df0808'


  


  const incrementQuantity = () => {
    setQuantity((prev) => prev + 1)
  }

  const decrementQuantity = () => {
    setQuantity((prev) => Math.max(0, prev - 1))
  }

  return (
  <div style={{width:'1000px',height:'150px'}}>
    <img

    src={`${currentCard.card_image}/low.png`}

    alt={currentCard.card_name}

    width={150}

    style={{ display: "block", marginTop: "8px",float:"left" }} />


  <p>{currentCard.card_name}</p>
  <p>
    Quantity : {quantity}{' '}
    <br></br>
    <button type="button" style={{background: '#df0808' ,width:'50px'}} onClick={decrementQuantity}>-</button>{' '}
    <button type="button" style={{background: '#3adf08' ,width:'50px'}}  onClick={incrementQuantity}>+</button>
  </p>
    {pokeListType == "listSelectedSection" && usePokeCard.listCardsSelected.length >0 &&(
      
      <p> Language : {usePokeCard.listCardsSelected.find(card => currentCard.card_id == card.card_id)?.language} </p>
    )}

  {isCardSelected && (
    <>
    
    <button type="button" style={{background: `${activeButtonColor}` ,width:'200px'}} 
    onClick={()=>{


      if (pokeListType =="listAddCards" ){


      // does card added already exist in list cards selected
      const isCardAlreadyAdded = usePokeCard.listCardsSelected.find(card => currentCard.card_id == card.card_id)
      const cardToBeAdded = {
            ...currentCard,
            language: useStateHandler.manageCardsSelectedLanguage,
            quantity : quantity,
          }

          
          // console.log({
          //   ...currentCard,
          //   language: useStateHandler.manageCardsSelectedLanguage
          // })
        if (typeof isCardAlreadyAdded === "undefined"){
          // ads card if doesn't exist
          usePokeCard.setListCardsSelected(
            [
              ...usePokeCard.listCardsSelected,
              cardToBeAdded
            ]
          )
          
        }else{
          // adds quantity to existing card
          usePokeCard.setListCardsSelected(
            usePokeCard.listCardsSelected.map((card) => 
            
              card.card_id === currentCard.card_id
                ? { ...card, quantity: card.quantity + quantity }
                : card
            )
          )

          
        }

        // reset Quantity to zero
        setQuantity(0);


    
    
  }else if(pokeListType =="listSelectedSection"){
    // by not selecting the current card it will remove this card from the list of current cards selected

      usePokeCard.setListCardsSelected(
        usePokeCard.listCardsSelected.filter((card)=> {
          return !(isCardSelected && card.card_id === currentCard.card_id)        
        }
        
      
    )
  )
  }

    
    
}
}
    
    >
    
    
    
    
      
      
      {activeButtonText}</button>
    </>
  )}
  




</div>



  )
}
