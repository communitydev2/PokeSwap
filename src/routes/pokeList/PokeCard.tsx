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




export function PokeCard(
  {
    currentCard, isCardSelected,pokeListType
  }:
  {
  currentCard:PokemonCard,
  isCardSelected:boolean, 
  pokeListType:string}
) {
  const [quantity, setQuantity] = useState(0)
  const useLocStore = useLocalizationStore();
  const useStateHandler = useStateStore();
  const usePokeCard = usePokemonCardStore();
  const activeButtonText = pokeListType == "listAddCards" ? "Add to Selected" : "Remove from selected";
  const activeButtonColor =  pokeListType == "listAddCards" ? '#089bdf' : '#df0808'
  const thisCardInSelectedCardsList = pokeListType == "listAddCards" ? "nothing" : usePokeCard.listCardsSelected.find(card => currentCard.card_id == card.card_id)
  const activeCardQuantity =  pokeListType == "listAddCards" ? quantity : thisCardInSelectedCardsList.quantity;


  


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
    Quantity {activeCardQuantity}{' '}
    <br></br>
    <button type="button" style={{background: '#df0808' ,width:'50px'}} onClick={decrementQuantity}>-</button>{' '}
    <button type="button" style={{background: '#3adf08' ,width:'50px'}}  onClick={incrementQuantity}>+</button>
  </p>

  {isCardSelected && (
    <>
    
    <button type="button" style={{background: `${activeButtonColor}` ,width:'200px'}} 
    onClick={()=>{

      // does card added already exist in list cards selected
      const isCardAlreadyAdded = usePokeCard.listCardsSelected.find(card => currentCard.card_id == card.card_id)
      console.log(isCardAlreadyAdded)
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
          console.log("adding card")
          usePokeCard.setListCardsSelected(
            [
              ...usePokeCard.listCardsSelected,
              cardToBeAdded
            ]
          )
          
        }else{
          usePokeCard.setListCardsSelected(
            usePokeCard.listCardsSelected.map((card) =>
              card.card_id === currentCard.card_id
                ? { ...card, quantity: card.quantity + quantity }
                : card
            )
          )

          
        }
    }
    }
    >{activeButtonText}</button>
    </>
  )}
  




</div>



  )
}
