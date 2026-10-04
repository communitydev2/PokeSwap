import { CARD_CATEGORY, LIST_TYPE, MENU_MODE } from '../../constants'
import type{ PokemonCard } from '../../types/PokemonCard'
import { useState } from 'react'
import { background } from 'storybook/theming'
import {  Avatar,  Anchor, Stack, Modal } from '@mantine/core';
import { useLocalizationStore } from '../../store/useLocalizationStore'
import { usePokemonCardStore } from '../../store/pokemonCardsStore'
import { useAuthStore } from '../../store/userStore'
import { useStateStore } from '../../store/useStateStore'
import { useDisclosure } from '@mantine/hooks';
import { Popover, Text, Button,List,Select,Group, Space,Title, ComboboxItem,UnstyledButton} from '@mantine/core';
import { ManageCardsMainMenu } from '../managecards/ManageCardsMainMenu';




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
  const useStateWrapper = useStateStore();
  const listTypeAdd = LIST_TYPE.add
  const listTypeSelected = LIST_TYPE.selected
  const listTypeExclusiveTrade = LIST_TYPE.exclusiveTrade
  const thisCardInSelectedCardsList = pokeListType == listTypeAdd ? "nothing" : usePokeCard.listCardsSelected.find(card => currentCard.card_id == card.card_id)

    const [quantity, setQuantity] = useState(pokeListType == listTypeAdd ? 0 : thisCardInSelectedCardsList != null ? 0+ thisCardInSelectedCardsList.quantity : 0)
    const activeButtonText = pokeListType == listTypeAdd ? "Add to Selected" : "Remove from selected";
    const activeButtonColor =  pokeListType == listTypeAdd ? '#089bdf' : '#df0808'
    
    const [selectedLanguageDropdownChoice,setSelectedLanguageDropdownChoice] = useState<string | null>(usePokeCard.languages[0]);
    const [opened, { open, close }] = useDisclosure(false);
    function Menu_ExclusiveTrade() {
    
      return (
        <>
          <Modal opened={opened} onClose={close} title={useLocStore.t.setUpExclusiveTrade} centered>
            {/* Modal content */}
            <ManageCardsMainMenu callComponent={MENU_MODE.exclusiveTrade} exclusiveCardSelected={currentCard}/>
          </Modal>
        {useStateWrapper.addingCardsSector == CARD_CATEGORY.trade && (
          <Button data-click-id="PokeCard/open-exclusive-trade" variant="default" onClick={
            ()=> {
            //   useStateWrapper.setStateBooleanArray(useStateWrapper.stateBooleanArray.map((v,i)=>{
            //     return  i == 0 ? true : v
            //   })
            // )
            open()
          }
          
          
          
          }>
            {useLocStore.t.setUpExclusiveTrade}
          </Button>

        )}
        </>
      );
    }

    function LanguageSelectionDropdown() {
    
      return (
        <Select data-click-id="PokeCard/language-select"
          label={useLocStore.t.pickLanguage}
          placeholder={useLocStore.t.pickValue}
          data={usePokeCard.languages}
          value={selectedLanguageDropdownChoice}
          onChange={(e)=> {
            setSelectedLanguageDropdownChoice(e.value)
            useStateWrapper.setManageCardsSelectedLanguage(e.value)
          }
          }
        />
      );
    }


  const incrementQuantity = () => {
    setQuantity((prev) => prev + 1)
  }

  const decrementQuantity = () => {
    setQuantity((prev) => Math.max(0, prev - 1))
  }

  return (
  <div data-click-context={`card: ${currentCard.card_name}`} style={{width:'1000px',height:'150px'}}>
    <img

    src={`${currentCard.card_image}/low.png`}

    alt={currentCard.card_name}

    width={150}

    style={{ display: "block", marginTop: "8px",float:"left" }} />


  <p>{currentCard.card_name}</p>

  {/* This is NOT an exclusive trade AND NOT the confirmation of cards I'm adding AND I will show things for other listTypes */}
  {/* Quantity is hidden in ExclusiveTrade PokeCard Selected on Top */}
  {pokeListType!=listTypeExclusiveTrade && pokeListType != LIST_TYPE.confirmAdd &&(

<>






  


    
    {useLocStore.t.quantity} : {quantity}{' '}
    <br></br>

    <button data-click-id="PokeCard/quantity-minus" type="button" style={{background: '#df0808' ,width:'50px'}} onClick={decrementQuantity}>-</button>{' '}
    <button data-click-id="PokeCard/quantity-plus" type="button" style={{background: '#3adf08' ,width:'50px'}}  onClick={incrementQuantity}>+</button>

  </>
          )
          }

    
      {/* only display if add Cards menu is shown  */}
    {useStateWrapper.showManageCardsMainMenu && (

      <>
      {/* if it's in the adding selection AND youre adding to the cards you have for trade You are going display language dropdown choice */}
      {pokeListType==listTypeAdd&& useStateWrapper.addingCardsSector ==CARD_CATEGORY.trade && (
        
        <>
      <LanguageSelectionDropdown/>
        
        
        </>

      )}
      
      </>


    )}
    {/* this is when I am confirming the cards I'm adding to my library and displayed in the modal */}
  {pokeListType == LIST_TYPE.confirmAdd && (

<>




    {useLocStore.t.quantity} : {quantity}{' '}
    {currentCard.language && (
      <>
        <br></br>
        Language : {currentCard.language}
      </>
    )}

  </>
          )
          }


      {/* only display if add Cards menu is shown  */}
    {useStateWrapper.showManageCardsMainMenu && (

      <>
      {/* if it's in the adding selection AND youre adding to the cards you have for trade You are going display language dropdown choice */}
      {pokeListType==listTypeAdd&& useStateWrapper.addingCardsSector ==CARD_CATEGORY.trade && (
        
        <>
      <LanguageSelectionDropdown/>
        
        
        </>

      )}
      
      </>


    )}
    
    
    

      
    {pokeListType == listTypeSelected && usePokeCard.listCardsSelected.length >0 &&(
      <>
      <Text> Language : {usePokeCard.listCardsSelected.find(card => currentCard.card_id == card.card_id)?.language} </Text>

      
      {/* button for setting up exclusive trade */}
      {/* <Menu_ExclusiveTrade/> */}
      </>
    )}





  {isCardSelected && (
    <>
    
    <button data-click-id="PokeCard/add-or-remove-card" type="button"
    // Adding needs at least 1 copy; removing is always allowed
    disabled={pokeListType == listTypeAdd && quantity < 1}
    title={pokeListType == listTypeAdd && quantity < 1 ? 'Choose a quantity first' : undefined}
    style={{background: `${activeButtonColor}` ,width:'200px', opacity: pokeListType == listTypeAdd && quantity < 1 ? 0.5 : 1, cursor: pokeListType == listTypeAdd && quantity < 1 ? 'not-allowed' : 'pointer'}} 
    onClick={()=>{


      if (pokeListType ==listTypeAdd ){


      // does card added already exist in list cards selected
      const isCardAlreadyAdded = usePokeCard.listCardsSelected.find(card => currentCard.card_id == card.card_id)
      const cardToBeAdded = {
            ...currentCard,
            language: useStateWrapper.manageCardsSelectedLanguage,
            quantity : quantity,
          }

          
          // console.log({
          //   ...currentCard,
          //   language: useStateWrapper.manageCardsSelectedLanguage
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


    
    
  }else if(pokeListType ==listTypeSelected){
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
