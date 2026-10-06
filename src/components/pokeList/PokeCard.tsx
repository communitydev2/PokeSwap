import { CARD_CATEGORY, LIST_TYPE, MENU_MODE } from '../../constants'
import type{ PokemonCard } from '../../types/PokemonCard'
import { useState } from 'react'
import { ActionIcon, Badge, Stack, Modal } from '@mantine/core';
import { IconMinus, IconPlus, IconTrash } from '@tabler/icons-react';
import { useLocalizationStore } from '../../store/useLocalizationStore'
import { usePokemonCardStore } from '../../store/pokemonCardsStore'
import { useAuthStore } from '../../store/userStore'
import { useStateStore } from '../../store/useStateStore'
import { CardPicture } from '../CardPicture'
import { CardMeta } from '../CardMeta'
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

    // A plain element (not a component defined inside PokeCard), so selecting the
    // card doesn't remount it and close the dropdown while it's open
    const languageSelectionDropdown = (
        <Select data-click-id="PokeCard/language-select"
          label={useLocStore.t.pickLanguage}
          placeholder={useLocStore.t.pickValue}
          data={usePokeCard.languages}
          value={selectedLanguageDropdownChoice}
          size="sm"
          allowDeselect={false}
          onChange={(value)=> {
            if (!value) return
            setSelectedLanguageDropdownChoice(value)
            useStateWrapper.setManageCardsSelectedLanguage(value)
          }
          }
        />
    );


  const incrementQuantity = () => {
    setQuantity((prev) => prev + 1)
  }

  const decrementQuantity = () => {
    setQuantity((prev) => Math.max(0, prev - 1))
  }

  const isAddList = pokeListType == listTypeAdd
  const isSelectedList = pokeListType == listTypeSelected
  const showStepper = pokeListType != listTypeExclusiveTrade && pokeListType != LIST_TYPE.confirmAdd
  const showLanguageSelect = useStateWrapper.showManageCardsMainMenu && isAddList && useStateWrapper.addingCardsSector == CARD_CATEGORY.trade
  const selectedEntry = isSelectedList ? usePokeCard.listCardsSelected.find(card => currentCard.card_id == card.card_id) : undefined
  const cannotAdd = isAddList && quantity < 1

  function handleAddOrRemove() {
    if (isAddList) {
      // does card added already exist in list cards selected
      const isCardAlreadyAdded = usePokeCard.listCardsSelected.find(card => currentCard.card_id == card.card_id)
      const cardToBeAdded = {
        ...currentCard,
        language: useStateWrapper.manageCardsSelectedLanguage,
        quantity : quantity,
      }
      if (typeof isCardAlreadyAdded === "undefined") {
        // adds card if it doesn't exist
        usePokeCard.setListCardsSelected([...usePokeCard.listCardsSelected, cardToBeAdded])
      } else {
        // card already selected: add to its quantity
        usePokeCard.setListCardsSelected(
          usePokeCard.listCardsSelected.map((card) =>
            card.card_id === currentCard.card_id ? { ...card, quantity: card.quantity + quantity } : card
          )
        )
      }
      setQuantity(0);
    } else if (isSelectedList) {
      usePokeCard.setListCardsSelected(
        usePokeCard.listCardsSelected.filter((card) => !(isCardSelected && card.card_id === currentCard.card_id))
      )
    }
  }

  return (
    <Group data-click-context={`card: ${currentCard.card_name}`} wrap="nowrap" align="flex-start" gap="md">
      <CardPicture cardImage={currentCard.card_image} alt={currentCard.card_name} width="clamp(90px, 28vw, 120px)" />

      <Stack gap="xs" style={{ flex: 1, minWidth: 0 }}>
        <div>
          <Text fw={600} size="lg" lineClamp={2}>{currentCard.card_name}</Text>
          <CardMeta card={currentCard} />
        </div>

        {/* Cards already selected: show what was chosen */}
        {isSelectedList && selectedEntry && (
          <Group gap="xs">
            <Badge variant="filled" radius="sm">× {selectedEntry.quantity}</Badge>
            {selectedEntry.language && <Badge variant="light" color="gray" radius="sm">{selectedEntry.language.toUpperCase()}</Badge>}
          </Group>
        )}

        {/* Quantity stepper (hidden in Exclusive Trade and the confirmation list) */}
        {showStepper && !isSelectedList && (
          <Group gap="xs" wrap="nowrap">
            <Text size="sm" c="dimmed">{useLocStore.t.quantity}</Text>
            <ActionIcon data-click-id="PokeCard/quantity-minus" variant="default" radius="md" size="lg" aria-label={useLocStore.t.decreaseQuantity} disabled={quantity < 1} onClick={decrementQuantity}>
              <IconMinus size={16} />
            </ActionIcon>
            <Text fw={600} w="2ch" ta="center">{quantity}</Text>
            <ActionIcon data-click-id="PokeCard/quantity-plus" variant="default" radius="md" size="lg" aria-label={useLocStore.t.increaseQuantity} onClick={incrementQuantity}>
              <IconPlus size={16} />
            </ActionIcon>
          </Group>
        )}

        {/* Adding cards for trade: pick the card's language */}
        {showLanguageSelect && languageSelectionDropdown}

        {isCardSelected && (isAddList || isSelectedList) && (
          <Button
            data-click-id="PokeCard/add-or-remove-card"
            radius="md"
            color={isAddList ? 'blue' : 'red'}
            variant={isAddList ? 'filled' : 'light'}
            leftSection={isAddList ? <IconPlus size={16} /> : <IconTrash size={16} />}
            disabled={cannotAdd}
            title={cannotAdd ? useLocStore.t.chooseQuantityFirst : undefined}
            onClick={(e) => {
              e.stopPropagation()
              handleAddOrRemove()
            }}
            style={{ alignSelf: 'flex-start' }}
          >
            {isAddList ? useLocStore.t.addToSelected : useLocStore.t.removeFromSelected}
          </Button>
        )}
      </Stack>
    </Group>
  )
}
