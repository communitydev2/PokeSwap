import { CARD_CATEGORY, LIST_TYPE, MENU_MODE } from '../../constants'
import { Popover, Text, Button,List,Select,Group, Space,Title, ComboboxItem,UnstyledButton,Alert,Badge

 } from '@mantine/core';
import { Affix, Stack, Modal, Paper, SimpleGrid, ActionIcon, Indicator, Drawer, Transition } from '@mantine/core';
import { useState,useEffect,useRef ,type ChangeEvent, type ReactNode} from 'react';
import { supabase } from '../../supabaseClient';
import { useAuthStore } from '../../store/userStore';
import { ManageTCGAccountsMenu } from './ManageTCGAccountsMenu';
import { useStateStore } from '../../store/useStateStore';
import { UseLocalizationStoreType } from '../../types/UseLocalizationStoreType';
import { useLocalizationStore } from '../../store/useLocalizationStore';
import { usePokemonCardStore } from '../../store/pokemonCardsStore';
import { create } from 'zustand';
import { useAddedToastStore } from '../../store/addedToastStore';
import { useDisclosure } from '@mantine/hooks';
import { IconPlus, IconList, IconCheck, IconCircleCheck } from '@tabler/icons-react';
import SearchBar from '../reusableComponents/SearchBar';
import { PokeList } from '../pokeList/PokeList';
import { PokeCard } from '../pokeList/PokeCard';
import { PokemonCard } from '../../types/PokemonCard';
import { ConfirmCardsList } from '../ConfirmCardsList/ConfirmCardsList';
import { MyCards } from './MyCards';
import { Trades } from './Trades';

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
    <Title order={2}>{props[1].t.manageCardsMainMenuTitle}</Title>
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


// Keep the drawer open when floating buttons or add-cards branches change.
const useSelectedDrawer = create<{ opened: boolean; setOpened: (o: boolean) => void }>((set) => ({
  opened: false,
  setOpened: (opened) => set({ opened }),
}));

function SelectedListButton() {
  const different = usePokemonCardStore((s) => s.listCardsSelected.length);
  const setOpened = useSelectedDrawer((s) => s.setOpened);
  const t = useLocalizationStore((s) => s.t);

  return (
    <Indicator label={different} size={18} color="red" inline offset={4}>
      <ActionIcon
        size={50}
        radius="xl"
        variant="default"
        style={{ pointerEvents: 'auto', boxShadow: 'var(--mantine-shadow-lg)', maxWidth: '100%', height: 'auto', minHeight: 50, whiteSpace: 'normal' }}
        aria-label={t.viewSelectedCards}
        data-click-id="ManageCardsMainMenu/floating-view-selected"
        onClick={() => setOpened(true)}
      >
        <IconList size={22} />
      </ActionIcon>
    </Indicator>
  );
}

function SelectedListDrawer() {
  const opened = useSelectedDrawer((s) => s.opened);
  const setOpened = useSelectedDrawer((s) => s.setOpened);
  const cards = usePokemonCardStore((s) => s.listCardsSelected);
  const t = useLocalizationStore((s) => s.t);
  const different = cards.length;
  const total = cards.reduce((sum, card) => sum + (card.quantity ?? 0), 0);

  return (
    <Drawer
      opened={opened}
      onClose={() => setOpened(false)}
      position="bottom"
      size="85%"
      radius="md"
      title={t.cardsSelected}
      closeButtonProps={{ ...{ 'data-click-id': 'ManageCardsMainMenu/selected-drawer-close' }, 'aria-label': t.close }}
      zIndex={300}
    >
      {different > 0 && <Text size="sm" c="dimmed" mb="md">{t.selectedCardsSummary(different, total)}</Text>}
      {different > 0 ? <PokeList listType={'listSelectedSection'}/> : <Text>{t.noCardsSelected}</Text>}
    </Drawer>
  );
}

function FloatingBar({ children }: { children: ReactNode }) {
  const different = usePokemonCardStore((s) => s.listCardsSelected.length);

  return (
    <Affix
      position={{ bottom: 'calc(var(--mantine-spacing-md) + env(safe-area-inset-bottom))', left: 0, right: 0 }}
      zIndex={150}
    >
      <Group justify="center" px="md" gap="sm" wrap="nowrap" style={{ pointerEvents: 'none' }}>
        {different > 0 && <SelectedListButton />}
        {children}
      </Group>
    </Affix>
  );
}

function AddedToast() {
  const message = useAddedToastStore((s) => s.message);
  const seq = useAddedToastStore((s) => s.seq);
  const lastSeenSeq = useRef(seq);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (seq === lastSeenSeq.current) return;
    lastSeenSeq.current = seq;
    setVisible(true);
    const timeout = setTimeout(() => setVisible(false), 2200);
    return () => clearTimeout(timeout);
  }, [seq]);

  return (
    <Affix
      position={{ bottom: 'calc(var(--mantine-spacing-md) + 50px + var(--mantine-spacing-sm) + env(safe-area-inset-bottom))', left: 0, right: 0 }}
      zIndex={151}
    >
      <Group justify="center" px="md" style={{ pointerEvents: 'none' }}>
        <Transition mounted={visible} transition="slide-up" duration={220} exitDuration={300} timingFunction="ease">
          {(styles) => (
            <Paper radius="xl" px="md" py={6} shadow="md" withBorder role="status" aria-live="polite" style={styles}>
              <Group gap={6} wrap="nowrap">
                <IconCircleCheck size={18} color="var(--mantine-color-green-6)" />
                <Text size="sm" fw={500}>{message}</Text>
              </Group>
            </Paper>
          )}
        </Transition>
      </Group>
    </Affix>
  );
}

// Keep pending cards available to add even before any cards are selected.
function FloatingAddPendingButton() {
  const pendingCards = usePokemonCardStore((s) => s.pendingCards);
  const addPendingToSelected = usePokemonCardStore((s) => s.addPendingToSelected);
  const show = useAddedToastStore((s) => s.show);
  const manageCardsSelectedLanguage = useStateStore((s) => s.manageCardsSelectedLanguage);
  const t = useLocalizationStore((state) => state.t);
  const pendingList = Object.values(pendingCards);
  const different = pendingList.length;
  const total = pendingList.reduce((sum, card) => sum + (card.quantity ?? 0), 0);

  if (different === 0) return null;

  return (
    <FloatingBar>
      <Button
        data-click-id="ManageCardsMainMenu/floating-add-pending"
        color="blue"
        style={{ pointerEvents: 'auto', boxShadow: 'var(--mantine-shadow-lg)', maxWidth: '100%', height: 'auto', minHeight: 50, whiteSpace: 'normal' }}
        size="md"
        radius="xl"
        leftSection={<IconPlus size={18} />}
        onClick={() => {
          const total = pendingList.reduce((sum, card) => sum + (card.quantity ?? 0), 0);
          addPendingToSelected(manageCardsSelectedLanguage);
          show(t.cardsAddedToSelection(total));
        }}
      >
        {t.addPendingToSelectedFloating(different, total)}
      </Button>
    </FloatingBar>
  );
}

// onConfirm saves the selected cards and returns an error message, or null on success
function Menu_ConfirmCards({props, onConfirm, floating, hideTrigger}:{props:any[], onConfirm?:() => Promise<string|null>, floating?:boolean, hideTrigger?:boolean}) {
const [opened, { open, close }] = useDisclosure(false);
const t = useLocalizationStore((state) => state.t);
const cards = usePokemonCardStore((s) => s.listCardsSelected);
const pendingCards = usePokemonCardStore((s) => s.pendingCards);
const pendingList = Object.values(pendingCards);
const different = cards.length;
const total = cards.reduce((sum, card) => sum + (card.quantity ?? 0), 0);
const [saving, setSaving] = useState(false);
const submitting = useRef(false);
const [saveError, setSaveError] = useState<string|null>(null);

async function submitCardsToSupabase(){
  if (submitting.current) return;
  if (!onConfirm) return close();
  submitting.current = true;
  try {
  setSaving(true);
  setSaveError(null);
  const error = await onConfirm();
  setSaving(false);
  if (error) setSaveError(error);
  else close();
  } catch (error) {
    console.warn(error);
    setSaveError(t.cardsSaveFailed);
  } finally {
    submitting.current = false;
    setSaving(false);
  }
}



  return (
    <>
      <Modal opened={opened} onClose={() => { if (!submitting.current) close(); }} closeButtonProps={{ disabled: saving, ...{ 'data-click-id': 'ManageCardsMainMenu/confirm-close' } }} title={props[0]} centered size={props[1]==LIST_TYPE.confirmAdd ? 'md' : undefined}>
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
                {t.qaManageGoBack}
              </Button>
              <Button data-click-id="ManageCardsMainMenu/confirm-modal-confirm" onClick={submitCardsToSupabase} loading={saving}>
                {t.confirmAddCards}
              </Button>
            </Group>
          </>
        )}

      </Modal>

      {!hideTrigger && <Button data-click-id={`ManageCardsMainMenu/modal-button:${props[1]}`} variant="default" onClick={open}>
        {/* 20 for listSelectedSection*/}
        
        {props[2]}
      </Button>}
      {floating && props[1] == LIST_TYPE.confirmAdd && cards.length > 0 && !opened && pendingList.length === 0 && (
        <FloatingBar>
          <Button
            data-click-id="ManageCardsMainMenu/floating-add-selected"
            color="green"
            style={{ pointerEvents: 'auto', boxShadow: 'var(--mantine-shadow-lg)', maxWidth: '100%', height: 'auto', minHeight: 50, whiteSpace: 'normal' }}
            size="md"
            radius="xl"
            leftSection={<IconCheck size={18} />}
            onClick={open}
          >
            {t.addSelectedCardsFloating(different, total)}
          </Button>
        </FloatingBar>
      )}
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
  // Screen shown instead of the menu: the selected account's saved cards or its trades
  const [view,setView] = useState<'menu'|'myCards'|'trades'>('menu')
  // Offers waiting for this account's answer, shown on the Trades button
  const [incomingOffers,setIncomingOffers] = useState(0)
  const [offersReload,setOffersReload] = useState(0)
  // Bumped each time the notification bell opens an account's offers, to reopen Trades there
  const [tradesOpenSeq,setTradesOpenSeq] = useState(0)
  const [tradesInitialView,setTradesInitialView] = useState<'find'|'offers'>('find')
  const tradesRequest = useStateStoreWrapper.tradesRequest
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
          usePokemonCardStore.setState({ listCardsSelected: [], pendingCards: {} })
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
      placeholder={useLocStore.t.qaManageChooseAccount}
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
      <Group justify="space-between" wrap="nowrap">
        <Title order={2}>{useLocStore.t.addCardsTitle}</Title>
        <Button data-click-id="ManageCardsMainMenu/add-cards-back" variant="default" onClick={() => {
          setShowManageCardsMainMenuOptions(true)
          useStateStoreWrapper.setShowAddCardsMenu(false)
        }}>
          {useLocStore.t.myCardsBack}
        </Button>
      </Group>
      {savedMessage && (
        <Alert color="green">
          <Group justify="space-between" gap="sm">
            <Text size="sm">{savedMessage}</Text>
            <Button data-click-id="ManageCardsMainMenu/see-my-cards" size="xs" variant="white" color="green" onClick={() => setView('myCards')}>
              {useLocStore.t.seeMyCards}
            </Button>
          </Group>
        </Alert>
      )}
      <Paper withBorder radius="md" p="md">
        <Title order={4} mb="sm">{useLocStore.t.manageWhereSection}</Title>
        <SimpleGrid cols={{ base: 1, sm: useStateStoreWrapper.showLanguageDropdown ? 3 : 2 }} spacing="sm">
          {tcgAccountSelect}
          {cardCategorySelect}
          {useStateStoreWrapper.showLanguageDropdown && languageSelect}
        </SimpleGrid>
      </Paper>
      <Paper withBorder radius="md" p="md">
        <Title order={4} mb="sm">{useLocStore.t.manageFindSection}</Title>
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
          // keep the chosen account (e.g. one opened from a notification) if it's still there
          setSelectedTcgAccount((current) => data.some((a) => a.tcg_account_id == current) ? current : data[0]?.tcg_account_id ?? null)


          // setUsername(data[0])
        }
  
        setLoading(false)
      }
        if (useAuthStoreWrapper.user?.user_id) getTcgAccounts()
  
    }, [tcgAccountsReload, useAuthStoreWrapper.user?.user_id])
  
  
  
  
  useEffect(() => {
    if (!selectedTcgAccount || callComponent!=MENU_MODE.mainMenu) return
    supabase.from('trade_offer').select('id', { count: 'exact', head: true })
      .eq('to_account', selectedTcgAccount).eq('status', 'pending')
      .then(({ count }) => setIncomingOffers(count ?? 0))
  }, [selectedTcgAccount, offersReload, view, callComponent])

  // The notification bell asked for an account's offers: open Trades on it once the accounts are loaded
  useEffect(() => {
    if (!tradesRequest || callComponent!=MENU_MODE.mainMenu || !tcgAccounts) return
    if (tcgAccounts.some((a) => a.tcg_account_id == tradesRequest.tcgAccountId)) setSelectedTcgAccount(tradesRequest.tcgAccountId)
    setTradesInitialView('offers')
    setTradesOpenSeq(tradesRequest.seq)
    setView('trades')
    useStateStoreWrapper.setTradesRequest(null)
  }, [tradesRequest, tcgAccounts, callComponent])

  // Saved cards or trades of the selected account (replace the rest of the menu while open)
  if (view != 'menu' && callComponent==MENU_MODE.mainMenu) {
    return (
      <Stack gap="xl" w="100%">
        <Group justify="space-between" wrap="nowrap">
          <Title order={2}>{view == 'trades' ? useLocStore.t.trades : useLocStore.t.myCards}</Title>
          <Button data-click-id="ManageCardsMainMenu/my-cards-back" variant="default" onClick={() => setView('menu')}>
            {useLocStore.t.myCardsBack}
          </Button>
        </Group>
        {tcgAccountSelect}
        {selectedTcgAccount && view == 'myCards' && <MyCards key={selectedTcgAccount} tcgAccountId={selectedTcgAccount} initialCategory={myCardsCategory} />}
        {selectedTcgAccount && view == 'trades' && <Trades key={`${selectedTcgAccount}:${tradesOpenSeq}`} tcgAccountId={selectedTcgAccount} initialView={tradesInitialView} onOffersChanged={() => setOffersReload((n) => n + 1)} />}
      </Stack>
    )
  }

  return (
  <Stack gap="md" w="100%">
{(callComponent!=MENU_MODE.mainMenu || showManageCardsMainMenuOptions) && <ComponentTitle props={[callComponent,useLocStore]}/>}
  
  
  
  {/* only this place if it's called from accounts .tsx */}
{!hasTcgAccounts && callComponent==MENU_MODE.mainMenu &&(
  <ManageTCGAccountsMenu onCreated={() => setTcgAccountsReload((n) => n + 1)}/>
)}
{/* display list of accounts */}
{/* this is if the  call component type is not the exclusive trade so this is not going to show up */}
{hasTcgAccounts && showManageCardsMainMenuOptions && callComponent==MENU_MODE.mainMenu &&(
  <>
  <SimpleGrid cols={3} spacing="xs">

  <Button data-click-id="ManageCardsMainMenu/add-cards" onClick={handleMainMenuAddCardsButton}>{useLocStore.t.addCardsTitle}</Button>
  <Button data-click-id="ManageCardsMainMenu/my-cards" variant="default" onClick={() => setView('myCards')}>{useLocStore.t.myCards}</Button>
  <Button data-click-id="ManageCardsMainMenu/trades" variant="default" onClick={() => { setTradesInitialView('find'); setView('trades') }}
    rightSection={incomingOffers > 0 ? <Badge size="sm" circle>{incomingOffers}</Badge> : undefined}>
    {useLocStore.t.trades}
  </Button>
  </SimpleGrid>
  {tcgAccountSelect}
  </>
)}

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

{/* Keep the add-cards screen mounted as the selection changes. */}
{hasTcgAccounts && !showManageCardsMainMenuOptions && useStateStoreWrapper.showAddCardsMenu == true && callComponent!=MENU_MODE.exclusiveTrade && (
<Stack gap="xl" w="100%" pb={usePokeCardStore.listCardsSelected.length > 0 || Object.keys(usePokeCardStore.pendingCards).length > 0 ? 96 : undefined}>
    {addCardsControls}
    <Menu_ConfirmCards props={[useLocStore.t.qaManageConfirmTitle,LIST_TYPE.confirmAdd,useLocStore.t.qaManageConfirmTitle]} onConfirm={saveSelectedCards} floating hideTrigger/>
    <Title order={4}>{useLocStore.t.selectCardsToAdd}</Title>
    <PokeList listType={'listAddCards'}/>
    <FloatingAddPendingButton />
    <AddedToast />
    <SelectedListDrawer />
  </Stack>
)}

   
  
  </Stack>
  )

}
