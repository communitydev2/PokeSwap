import { createFileRoute } from '@tanstack/react-router'
import { Popover, Text, Button,List,Select,Group, Space,Title, ComboboxItem,UnstyledButton

 } from '@mantine/core';
import {  Avatar,  Anchor, Stack, Modal } from '@mantine/core';
import { useState,useEffect ,type ChangeEvent} from 'react';
import { supabase } from '../../supabaseClient';
import { useAuthStore } from '../../store/userStore';
import { ManageTCGAccountsMenu } from './ManageTCGAccountsMenu';
import { useStateStore } from '../../store/useStateStore';
import { UseLocalizationStoreType } from '../../types/UseLocalizationStoreType';
import { useLocalizationStore } from '../../store/uselocalizationStore';
import { usePokemonCardStore } from '../../store/pokemonCardsStore';
import { useDisclosure } from '@mantine/hooks';
import SearchBar from '../reusableComponents/SearchBar';
import { PokeList } from '../pokeList/PokeList';
import { PokeCard } from '../pokeList/PokeCard';
import { PokemonCard } from '../../types/PokemonCard';
export const Route = createFileRoute('/managecards/ManageCardsMainMenu')({
  component: ManageCardsMainMenu,
})

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
  {props[0]==props[1].localizationArray[19]? (
    <>
    <Text size="sm">{props[1].localizationArray[16]}</Text>
    </>
  ):(
    <>
    <Text size="sm">{props[1].localizationArray[17]}</Text>
    </>
  )
}
    </>
  )

}

// 0 - "Confirm Cards"
// 'listSelectedSection' - 1
//  2 - open modal button text


function Menu_ConfirmCards({props}) {
const [opened, { open, close }] = useDisclosure(false);
// console.log(props)
  return (
    <>
      <Modal opened={opened} onClose={close} title={props[0]} centered>
        {/* Modal content */}
        {props[1]=="listSelectedSection" && (
          <PokeList listType={props[1]}/>
        )}
        {props[1]=="listExclusiveTrade" && (
          
          // add something here
          <PokeList listType={props[1]}/>
          
          
        )}

      </Modal>

      <Button variant="default" onClick={open}>
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
  // tcgAccounts Selection Dropdown
  const [tcgAccounts,setTcgAccounts ] = useState<tcgAccountType[]>()
  const [selectedTcgAccount,setSelectedTcgAccount] = useState<string|null>()
  const [comboData_accountUsernames,setComboData_accountUsernames] = useState<string[]|null>(null)
  const [activeVarables,setActiveVariables] = useState()

  // its true by default, and set to false when pressing anything inside the main menu
  const [showManageCardsMainMenuOptions,setShowManageCardsMainMenuOptions] = useState(true);
  // dropdown card card category
  const [cardCategoryOptions,setCardCategoryOptions] = useState(
    [
      {value:useLocStore.localizationArray[3]},
    {value:useLocStore.localizationArray[4]}
  ]
    
  )
  const [selectedCardCategory,setSelectedCardCategory] = useState<ComboboxItem | null>(cardCategoryOptions[0].value);
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

  

  function LanguageSelectionDropdown() {
  
    return (
      <Select
        label={useLocStore.localizationArray[6]}
        placeholder={useLocStore.localizationArray[2]}
        data={usePokeCardStore.languages}
        value={selectedLanguageDropdownChoice}
        onChange={(e)=> {
          setSelectedLanguageDropdownChoice(e.value)
          useStateStore.setManageCardsSelectedLanguage(e.value)
        }
        }
      />
    );
  }
  function CardCategoryDropdown() {
  
    return (
      <Select
        label={useLocStore.localizationArray[5]}
        placeholder={useLocStore.localizationArray[2]}
        data={cardCategoryOptions}
        defaultValue={cardCategoryOptions[0].value}
        value={selectedCardCategory ? selectedCardCategory.value : null}
        onChange={(_value,option)=> {
          
           setSelectedCardCategory(option)
          // update the adding cards sector on Georgetown so that I will be able to pass that value onto the PokeCard
          useStateStoreWrapper.setAddingCardsSector(option.value)
// if wishlist selected, then choose language wanted
if(option.value == cardCategoryOptions[0].value){

 useStateStoreWrapper.setShowLanguageDropdown(true);

 }else{
  useStateStoreWrapper.setShowLanguageDropdown(false);
 }



        }}
      />
    );
  }

function TcgAccountDropdown() {

  
  return (
    <Select
      label={useLocStore.localizationArray[1]}
      placeholder={useLocStore.localizationArray[2]}
      data={comboData_accountUsernames}
      value={selectedTcgAccount}
      onChange={setSelectedTcgAccount}
    />
  );
}


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
          setComboData_accountUsernames(data.map((v,i,a)=> `${v.tcg_id_username} | ${v.tcg_id}`))
          setSelectedTcgAccount(data.map((v,i,a)=> `${v.tcg_id_username} | ${v.tcg_id}`)[0])


          // setUsername(data[0])
        }
  
        setLoading(false)
      }
        getTcgAccounts()
  
    }, [])
  
  
  
  
  return (
  <>
<ComponentTitle props={[callComponent,useLocStore]}/>
  
  
  
  {/* only this place if it's called from accounts .tsx */}
{!hasTcgAccounts && callComponent==useLocStore.localizationArray[19] &&(
  <ManageTCGAccountsMenu/>
)}
{/* display list of accounts */}
{/* this is if the  call component type is not the exclusive trade so this is not going to show up */}
{hasTcgAccounts && showManageCardsMainMenuOptions && callComponent==useLocStore.localizationArray[19] &&(
  <>
  <Group justify="center">

  <Button onClick={handleMainMenuAddCardsButton}>Add Cards</Button>
  </Group>
  <Space h="xl" />
  <TcgAccountDropdown />
  </>
)}

{/* Following from Manage Cards in Figma,   */}
{/* I am not adding cards AND this is the Main Menu */}
{useStateStoreWrapper.showAddCardsMenu  != true && callComponent!=useLocStore.localizationArray[18]  && (
<>
  <Title>{useLocStore.localizationArray[0]}</Title>
  <TcgAccountDropdown />
  <CardCategoryDropdown />
  {useStateStoreWrapper.showLanguageDropdown && <LanguageSelectionDropdown />}
  <SearchBar />
  <p> {useLocStore.localizationArray[21]}</p>
  <PokeList listType={'listSelectedSection'}/>

  <Space h="lg" />
  <Space h="lg" />
  <Menu_ConfirmCards props={[useLocStore.localizationArray[20],useLocStore.localizationArray[14],useLocStore.localizationArray[20]]}/>
  {/* <Menu_ConfirmCards props={["Confirm Cards","listSelectedSection","Confirm Cards"]}/> */}
  <Space h="lg" />
  <Space h="lg" />
  <Space h="lg" />


  <p> Select Cards To add</p>
  <PokeList listType={'listAddCards'}/>
</>
// When pressing the add cards button
) 

}
{/* I am adding cards AND this is the exclusive trade */}
{useStateStoreWrapper.showAddCardsMenu  == true && callComponent==useLocStore.localizationArray[18] && (
  
  <>
  <Title>{useLocStore.localizationArray[17]}</Title>
<TcgAccountDropdown />
{/* {exclusiveCardSelected!=null ? (<PokeCard />):()} */}
  {/* <SearchBar /> */}
  <p> Card Selected</p>
<PokeCard currentCard={exclusiveCardSelected} pokeListType='listExclusiveTrade' isCardSelected={false} />

  <Space h="lg" />
  <Space h="lg" />
  <Menu_ConfirmCards props={[useLocStore]}/>
  <Space h="lg" />
  <Space h="lg" />
  <Space h="lg" />


  <p> Select Cards To add</p>
  {/* <PokeList listType={'listAddCards'}/> */}
</>


)}

{/* Following from Manage Cards in Figma,   */}
{/* I am  adding cards AND this is the Main Menu */}
{/* ManageCards Main Menu Inside Add Cards Button) */}
{useStateStoreWrapper.showAddCardsMenu  == true && callComponent!=useLocStore.localizationArray[18]  && (
<>
  <Title>{useLocStore.localizationArray[0]}</Title>
  <TcgAccountDropdown />
  <CardCategoryDropdown />
  {useStateStoreWrapper.showLanguageDropdown && <LanguageSelectionDropdown />}
  <SearchBar />
  <p> {useLocStore.localizationArray[21]}</p>
  <PokeList listType={'listSelectedSection'}/>

  <Space h="lg" />
  <Space h="lg" />
  <Menu_ConfirmCards props={[useLocStore.localizationArray[20],useLocStore.localizationArray[14],useLocStore.localizationArray[20]]}/>
  <Space h="lg" />
  <Space h="lg" />
  <Space h="lg" />


  <p> Select Cards To add</p>
  <PokeList listType={'listAddCards'}/>
</>
// When pressing the add cards button
) 

}



   
  
  </>
  )

}
