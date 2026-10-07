import { CARD_CATEGORY, LIST_TYPE, MENU_MODE } from '../../constants'
import { Popover, Text, Button,List,Select,Group, Space,Title, ComboboxItem,UnstyledButton,Alert

 } from '@mantine/core';
import { Stack, Modal, Paper, SimpleGrid } from '@mantine/core';
import { useState,useEffect ,type ChangeEvent} from 'react';
import { supabase } from '../../supabaseClient';
import { useAuthStore } from '../../store/userStore';
import { ManageTCGAccountsMenu } from './ManageTCGAccountsMenu';
import { useStateStore } from '../../store/useStateStore';
import { UseLocalizationStoreType } from '../../types/UseLocalizationStoreType';
import { useLocalizationStore } from '../../store/useLocalizationStore';
import { usePokemonCardStore } from '../../store/pokemonCardsStore';
import { useDisclosure } from '@mantine/hooks';
import SearchBar from '../reusableComponents/SearchBar';
import { PokeList } from '../pokeList/PokeList';
import { PokeCard } from '../pokeList/PokeCard';
import { PokemonCard } from '../../types/PokemonCard';
import { ConfirmCardsList } from '../ConfirmCardsList/ConfirmCardsList';
import { MyCards } from './MyCards';

type tcgAccountType =  {
  available_cards_for_trade : string,
  created_at : string,
  exclusive_trade_id : string,
  tcg_account_id : string,
  tcg_id : string,
  tcg_id_username : string,
  user_id : string,
  wishlist_id : string,

  
}


type genericDropdownType ={
  label: string,
  placeholder : string,
  data: string[],
  value:number,
  onChange: any,
}


function ComponentTitle({props}){

  /*
0 - callcomponent
1 - useLocStore
  */
  // console.log(props)
  return (
    <>
      {/* Main Menu? show Main Menu text or Exclusive trade */}
  {props[0]==MENU_MODE.mainMenu ? (
    <>
    <Text size="sm">{props[1].t.manageCardsMainMenuTitle}</Text>
    </>
  ):(
    <>
    <Text size="sm">{props[1].t.addCardsExclusiveTradeTitle}</Text>
    </>
  )
}
    </>
  )

}

// 0 - "Confirm Cards"
// 'listSelectedSection' - 1
//  2 - open modal button text


// onConfirm saves the selected cards and returns an error message, or null on success
function Menu_ConfirmCards({props, onConfirm}:{props:any[], onConfirm?:() => Promise<string|null>}) {
const [opened, { open, close }] = useDisclosure(false);
const t = useLocalizationStore((state) => state.t);
const [saving, setSaving] = useState(false);
const [saveError, setSaveError] = useState<string|null>(null);

async function submitCardsToSupabase(){
  if (!onConfirm) return close();
  setSaving(true);
  setSaveError(null);
  const error = await onConfirm();
  setSaving(false);
  if (error) setSaveError(error);
  else close();
}



  return (
    <>
      <Modal opened={opened} onClose={close} title={props[0]} centered size={props[1]==LIST_TYPE.confirmAdd ? 'md' : undefined}>
        {/* Modal content */}
        {props[1]==LIST_TYPE.selected && (
          <>
          <title>retsdf</title>
          <PokeList listType={props[1]}/>
          </>
        )}
        {props[1]==LIST_TYPE.exclusiveTrade && (
          
          // add something here
          <PokeList listType={props[1]}/>
          
          
        )}
        {props[1]==LIST_TYPE.confirmAdd && (
          <>
            <ConfirmCardsList />
            {saveError && (
              <Alert color="red" mt="md">{saveError}</Alert>
            )}
            <Group justify="flex-end" gap="sm" mt="md">
              <Button data-click-id="ManageCardsMainMenu/confirm-modal-change" variant="default" onClick={close} disabled={saving}>
                {t.confirmChange}
              </Button>
              <Button data-click-id="ManageCardsMainMenu/confirm-modal-confirm" onClick={submitCardsToSupabase} loading={saving}>
                {t.confirmAddCards}
              </Button>
            </Group>
          </>
        )}

      </Modal>

      <Button data-click-id={`ManageCardsMainMenu/modal-button:${props[1]}`} variant="default" onClick={open}>
        {/* 20 for listSelectedSection*/}
        
        {props[2]}
      </Button>
    </>
  );
}



export function ManageCardsMainMenu({callComponent,exclusiveCardSelected}:{callComponent:string,exclusiveCardSelected:PokemonCard}) {
  const useAuthStoreWrapper = useAuthStore();
  const useLocStore = useLocalizationStore();
  const usePokeCardStore = usePokemonCardStore();
  const useStateStoreWrapper = useStateStore();
  const [loading , setLoading] = useState(false)
  const [hasTcgAccounts,setHasTcgAccounts] = useState(false)
  // Bumped after new TCG accounts are saved, to reload the list
  const [tcgAccountsReload,setTcgAccountsReload] = useState(0)
  // tcgAccounts Selection Dropdown
  const [tcgAccounts,setTcgAccounts ] = useState<tcgAccountType[]>()
  const [selectedTcgAccount,setSelectedTcgAccount] = useState<string|null>()
  // value is the account's tcg_account_id, label is what the player sees
  const [comboData_accountUsernames,setComboData_accountUsernames] = useState<ComboboxItem[]|null>(null)
  // Shown above the card search after cards are saved
  const [savedMessage,setSavedMessage] = useState<string|null>(null)
  // "My cards" view of the selected account's saved cards, and which tab it opens on
  const [showMyCards,setShowMyCards] = useState(false)
  const [myCardsCategory,setMyCardsCategory] = useState<typeof CARD_CATEGORY[keyof typeof CARD_CATEGORY]>(CARD_CATEGORY.wishlist)
  const [activeVarables,setActiveVariables] = useState()

  // its true by default, and set to false when pressing anything inside the main menu
  const [showManageCardsMainMenuOptions,setShowManageCardsMainMenuOptions] = useState(true);
  // dropdown card card category
  const cardCategoryOptions = [
    { value: CARD_CATEGORY.wishlist, label: useLocStore.t.addToWishlist },
    { value: CARD_CATEGORY.trade, label: useLocStore.t.addToTradeCards },
  ]
  const [selectedCardCategory,setSelectedCardCategory] = useState<ComboboxItem | null>(null);
  //  dropdown language selection category
const [selectedLanguageDropdownChoice,setSelectedLanguageDropdownChoice] = useState<string | null>(usePokeCardStore.languages[0]);

  /*
function handleChangeSearchBar(event:ChangeEvent<HTMLInputElement>){


 setSearchInputValue(event.target.value as string);

 setOpenSearchQueryResultList(true);

  setShowSearchQueryResultsTable(true);

  pokeCardStore.setPokemonCardsSearchQuery(useSearchFunction(event.target.value,pokeCardStore,currentRarityDropdown,currentExpansionDropdown))

  // console.log(searchQueryListRef)

  // key={};

  

}








*/


// this year's effect will decide the logic for the exclusive trade and basically changed his menu depending on what state is supposed to be generated in
useEffect(()=>{

})



function cardCategoryOnChange(e) {
  
  // console.log(e.value)
  // console.log(cardCategoryOptions.map(v => v.value).indexOf(e.value))
  // setCardCategoryOptions(e.value)

}




  function handleMainMenuAddCardsButton(){
    setShowManageCardsMainMenuOptions(false);
    useStateStoreWrapper.setShowAddCardsMenu(true);
  }

  

  // Plain elements rather than components defined inside this one, so they
  // aren't remounted (and their dropdowns closed) on every render
  const languageSelect = (
      <Select data-click-id="ManageCardsMainMenu/language-select"
        label={useLocStore.t.pickLanguage}
        placeholder={useLocStore.t.pickValue}
        data={usePokeCardStore.languages}
        value={selectedLanguageDropdownChoice}
        allowDeselect={false}
        onChange={(value)=> {
          if (!value) return
          setSelectedLanguageDropdownChoice(value)
          useStateStoreWrapper.setManageCardsSelectedLanguage(value)
        }
        }
      />
  )

  const cardCategorySelect = (
      <Select data-click-id="ManageCardsMainMenu/card-category-select"
        label={useLocStore.t.whereAddingCards}
        placeholder={useLocStore.t.pickValue}
        data={cardCategoryOptions}
        // Wishlist is the starting choice (its language dropdown shows from the start)
        value={selectedCardCategory?.value ?? CARD_CATEGORY.wishlist}
        allowDeselect={false}
        onChange={(_value,option)=> {
          if (!option) return
          setSelectedCardCategory(option)
          // update the adding cards sector so that I will be able to pass that value onto the PokeCard
          useStateStoreWrapper.setAddingCardsSector(option.value)
          // if wishlist selected, then choose language wanted
          useStateStoreWrapper.setShowLanguageDropdown(option.value == CARD_CATEGORY.wishlist)
        }}
      />
  )

  const tcgAccountSelect = (
    <Select data-click-id="ManageCardsMainMenu/tcg-account-select"
      label={useLocStore.t.selectPocketAccount}
      placeholder={useLocStore.t.pickValue}
      data={comboData_accountUsernames ?? []}
      value={selectedTcgAccount}
      allowDeselect={false}
      onChange={setSelectedTcgAccount}
    />
  )

  // Saves every selected card to the chosen Pocket account's wishlist or trade
  // cards in one request. Cards already there get the new quantity added.
  // Returns an error message to show, or null when saved.
  async function saveSelectedCards(): Promise<string|null> {
    const t = useLocStore.t
    const account = tcgAccounts?.find((a) => a.tcg_account_id == selectedTcgAccount)
    if (!account) return t.cardsSaveNoAccount
    const category = useStateStoreWrapper.addingCardsSector ?? CARD_CATEGORY.wishlist
    const cards = usePokeCardStore.listCardsSelected
      .filter((card) => (card.quantity ?? 0) > 0)
      .map((card) => ({
        card_id: card.card_id,
        language: card.language ?? useStateStoreWrapper.manageCardsSelectedLanguage ?? 'en',
        quantity: card.quantity,
      }))
    if (!cards.length) return t.noCardsSelected

    const { error } = await supabase.rpc('add_cards_to_tcg_account', {
      p_tcg_account_id: account.tcg_account_id,
      p_category: category,
      p_cards: cards,
    })
    if (error) {
      console.warn(error)
      return t.cardsSaveFailed
    }

    const total = cards.reduce((sum, card) => sum + (card.quantity ?? 0), 0)
    const accountName = account.tcg_id_username ?? String(account.tcg_id)
    setSavedMessage(category == CARD_CATEGORY.trade ? t.cardsSavedForTrade(total, accountName) : t.cardsSavedToWishlist(total, accountName))
    setMyCardsCategory(category == CARD_CATEGORY.trade ? CARD_CATEGORY.trade : CARD_CATEGORY.wishlist)
    usePokeCardStore.setListCardsSelected([])
    return null
  }

  // Top of the add-cards screen: where the cards go, then searching for them
  const addCardsControls = (
    <>
      <Title order={2}>{useLocStore.t.addCardsTitle}</Title>
      {savedMessage && (
        <Alert color="green">
          <Group justify="space-between" gap="sm">
            <Text size="sm">{savedMessage}</Text>
            <Button data-click-id="ManageCardsMainMenu/see-my-cards" size="xs" variant="white" color="green" onClick={() => setShowMyCards(true)}>
              {useLocStore.t.seeMyCards}
            </Button>
          </Group>
        </Alert>
      )}
      <Paper withBorder radius="md" p="md">
        <Text fw={600} mb="sm">{useLocStore.t.manageWhereSection}</Text>
        <SimpleGrid cols={{ base: 1, sm: useStateStoreWrapper.showLanguageDropdown ? 3 : 2 }} spacing="sm">
          {tcgAccountSelect}
          {cardCategorySelect}
          {useStateStoreWrapper.showLanguageDropdown && languageSelect}
        </SimpleGrid>
      </Paper>
      <Paper withBorder radius="md" p="md">
        <Text fw={600} mb="sm">{useLocStore.t.manageFindSection}</Text>
        <SearchBar />
      </Paper>
    </>
  )


  // checks if there are any accounts and sets them to a data
      useEffect(() => {
      async function getTcgAccounts() {
        setLoading(true)
        const user  = useAuthStoreWrapper.user?.user_id
        // console.log(session)
  
        const { data, error } = await supabase
          .from('player_tcg_account')
          .select("*")
          .eq('user_id',user)
  
  
        // let { data, error } = await supabase
        //   .from('user_account')
        //   .select(`username`)
        //   .eq('user_id', user.id)
        //   .single()
  
        if (error) {
          console.warn(error)
        } else if (data) {
          // console.log(data.map((v,i,a)=> `${v.tcg_id_username} | ${v.tcg_id}`))
          setHasTcgAccounts(data.length>0);
          setTcgAccounts(data);
          setComboData_accountUsernames(data.map((v)=> ({ value: v.tcg_account_id, label: `${v.tcg_id_username} | ${v.tcg_id}` })))
          setSelectedTcgAccount(data[0]?.tcg_account_id ?? null)


          // setUsername(data[0])
        }
  
        setLoading(false)
      }
        if (useAuthStoreWrapper.user?.user_id) getTcgAccounts()
  
    }, [tcgAccountsReload, useAuthStoreWrapper.user?.user_id])
  
  
  
  
  // Saved cards of the selected account (replaces the rest of the menu while open)
  if (showMyCards && callComponent==MENU_MODE.mainMenu) {
    return (
      <Stack gap="lg" maw={760} mx="auto">
        <Group justify="space-between">
          <Title order={2}>{useLocStore.t.myCards}</Title>
          <Button data-click-id="ManageCardsMainMenu/my-cards-back" variant="default" onClick={() => setShowMyCards(false)}>
            {useLocStore.t.myCardsBack}
          </Button>
        </Group>
        {tcgAccountSelect}
        {selectedTcgAccount && <MyCards key={selectedTcgAccount} tcgAccountId={selectedTcgAccount} initialCategory={myCardsCategory} />}
      </Stack>
    )
  }

  return (
  <>
<ComponentTitle props={[callComponent,useLocStore]}/>
  
  
  
  {/* only this place if it's called from accounts .tsx */}
{!hasTcgAccounts && callComponent==MENU_MODE.mainMenu &&(
  <ManageTCGAccountsMenu onCreated={() => setTcgAccountsReload((n) => n + 1)}/>
)}
{/* display list of accounts */}
{/* this is if the  call component type is not the exclusive trade so this is not going to show up */}
{hasTcgAccounts && showManageCardsMainMenuOptions && callComponent==MENU_MODE.mainMenu &&(
  <>
  <Group justify="center">

  <Button data-click-id="ManageCardsMainMenu/add-cards" onClick={handleMainMenuAddCardsButton}>Add Cards</Button>
  <Button data-click-id="ManageCardsMainMenu/my-cards" variant="default" onClick={() => setShowMyCards(true)}>{useLocStore.t.myCards}</Button>
  </Group>
  <Space h="xl" />
  {tcgAccountSelect}
  </>
)}

{/* Following from Manage Cards in Figma,   */}
{/* I am not adding cards AND this is the Main Menu */}
{useStateStoreWrapper.showAddCardsMenu  != true && callComponent!=MENU_MODE.exclusiveTrade  && (
<Stack gap="lg" maw={760} mx="auto">
    {addCardsControls}
    {usePokeCardStore.listCardsSelected.length > 0 && (
      <>
        <Title order={4}>{useLocStore.t.cardsSelected}</Title>
        <PokeList listType={'listSelectedSection'}/>
      </>
    )}
    <Group justify="flex-end">
      <Menu_ConfirmCards props={[useLocStore.t.addCardsToLibrary,LIST_TYPE.confirmAdd,useLocStore.t.addCardsToLibrary]} onConfirm={saveSelectedCards}/>
    </Group>
    <Title order={4}>{useLocStore.t.selectCardsToAdd}</Title>
    <PokeList listType={'listAddCards'}/>
  </Stack>
// When pressing the add cards button
) 

}
{/* I am adding cards AND this is the exclusive trade */}
{useStateStoreWrapper.showAddCardsMenu  == true && callComponent==MENU_MODE.exclusiveTrade && (
  
  <>
  <Title>{useLocStore.t.addCardsExclusiveTradeTitle}</Title>
{tcgAccountSelect}
{/* {exclusiveCardSelected!=null ? (<PokeCard />):()} */}
  {/* <SearchBar /> */}
  <p> Card Selected For Exclusive Trade</p>
<PokeCard currentCard={exclusiveCardSelected} pokeListType='listExclusiveTrade' isCardSelected={false} />

  <Space h="lg" />
  <Space h="lg" />
  {/* <Menu_ConfirmCards props={[useLocStore.t.changeCard,LIST_TYPE.selected,useLocStore.t.changeCard]}/> */}
  <Space h="lg" />
  <Space h="lg" />
  <Space h="lg" />


  <Title> Select Cards You'll accept for the trade</Title>



  <p> Selected Cards You consider for trade</p>


  <p> Select Cards To add</p>



  {/* <PokeList listType={'listAddCards'}/> */}
</>


)}

{/* Following from Manage Cards in Figma,   */}
{/* I am  adding cards AND this is the Main Menu AND listCardSelects is EMPTY */}
{/* ManageCards Main Menu Inside Add Cards Button) */}
{useStateStoreWrapper.showAddCardsMenu  == true && callComponent!=MENU_MODE.exclusiveTrade && usePokeCardStore.listCardsSelected.length <1  && (
<Stack gap="lg" maw={760} mx="auto">
    {addCardsControls}
    {usePokeCardStore.listCardsSelected.length > 0 && (
      <>
        <Title order={4}>{useLocStore.t.cardsSelected}</Title>
        <PokeList listType={'listSelectedSection'}/>
      </>
    )}
    <Title order={4}>{useLocStore.t.selectCardsToAdd}</Title>
    <PokeList listType={'listAddCards'}/>
  </Stack>
// When pressing the add cards button
) 

}


{/* Following from Manage Cards in Figma,   */}
{/* I am  adding cards AND this is the Main Menu AND listCardSelects is NOT EMPTY */}
{/* ManageCards Main Menu Inside Add Cards Button) */}
{useStateStoreWrapper.showAddCardsMenu  == true && callComponent!=MENU_MODE.exclusiveTrade && usePokeCardStore.listCardsSelected.length >0  && (
<Stack gap="lg" maw={760} mx="auto">
    {addCardsControls}
    {usePokeCardStore.listCardsSelected.length > 0 && (
      <>
        <Title order={4}>{useLocStore.t.cardsSelected}</Title>
        <PokeList listType={'listSelectedSection'}/>
      </>
    )}
    <Group justify="flex-end">
      <Menu_ConfirmCards props={[useLocStore.t.cardsAdded,LIST_TYPE.confirmAdd,useLocStore.t.addCardsToLibrary]} onConfirm={saveSelectedCards}/>
    </Group>
    <Title order={4}>{useLocStore.t.selectCardsToAdd}</Title>
    <PokeList listType={'listAddCards'}/>
  </Stack>
// When pressing the add cards button
) 

}

   
  
  </>
  )

}
