import { createFileRoute } from '@tanstack/react-router'
import { Popover, Text, Button,List,Select,Group, Space,Title, ComboboxItem } from '@mantine/core';
import { useState,useEffect ,type ChangeEvent} from 'react';
import { supabase } from '../../supabaseClient';
import { useAuthStore } from '../../store/userStore';
import { ManageTCGAccountsMenu } from './ManageTCGAccountsMenu';
import { useStateStore } from '../../store/useStateStore';
import { UseLocalizationStoreType } from '../../types/UseLocalizationStoreType';
import { useLocalizationStore } from '../../store/uselocalizationStore';
import { usePokemonCardStore } from '../../store/pokemonCardsStore';
import SearchBar from '../reusableComponents/SearchBar';
import { PokeList } from '../pokeList/PokeList';
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


export function ManageCardsMainMenu() {
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
console.log(option)


if(option.value == cardCategoryOptions[1].value){

 useStateStoreWrapper.setShowLanguageDropdown(true);

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
 <Text size="sm">Manage Cards Main Menu</Text>
{!hasTcgAccounts && (
  <ManageTCGAccountsMenu/>
)}
{/* display list of accounts */}
{hasTcgAccounts && showManageCardsMainMenuOptions &&(
  <>
  <Group justify="center">

  <Button onClick={handleMainMenuAddCardsButton}>Add Cards</Button>
  </Group>
  <Space h="xl" />
  <TcgAccountDropdown />
  </>
)}
{useStateStoreWrapper.showAddCardsMenu && (
<>
  <Title>{useLocStore.localizationArray[0]}</Title>
  <TcgAccountDropdown />
  <CardCategoryDropdown />
  {useStateStoreWrapper.showLanguageDropdown && <LanguageSelectionDropdown />}
  <SearchBar />
  <p> Cards Selected</p>
  <PokeList listType={'listSelectedSection'}/>
  <p> Select Cards To add</p>
  <PokeList listType={'listAddCards'}/>
</>

)}




   
  
  </>
  )

}
