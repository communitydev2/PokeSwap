import { createFileRoute } from '@tanstack/react-router'
import { Popover, Text, Button,List,Select,Group, Space,Title } from '@mantine/core';
import { useState,useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useAuthStore } from '../../store/userStore';
import { ManageTCGAccountsMenu } from './ManageTCGAccountsMenu';
import { useStateStore } from '../../store/useStateStore';
import { UseLocalizationStoreType } from '../../types/UseLocalizationStoreType';
import { useLocalizationStore } from '../../store/uselocalizationStore';
import { usePokemonCardStore } from '../../store/pokemonCardsStore';
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
  const authStore = useAuthStore();
  const useLocStore = useLocalizationStore();
  const usePokeCardStore = usePokemonCardStore();
  const stateStore = useStateStore();
  const [loading , setLoading] = useState(false)
  const [hasTcgAccounts,setHasTcgAccounts] = useState(false)
  // tcgAccounts Selection Dropdown
  const [tcgAccounts,setTcgAccounts ] = useState<tcgAccountType[]>()
  const [selectedTcgAccount,setSelectedTcgAccount] = useState(0)
  // its true by default, and set to false when pressing anything inside the main menu
  const [showManageCardsMainMenuOptions,setShowManageCardsMainMenuOptions] = useState(true);
  // dropdown card card category
  const [selectedCardCategory,setSelectedCardCategory] = useState(0);
  const [cardCategoryOptions,setCardCategoryOptions] = useState(
    [useLocStore.localizationArray[3],useLocStore.localizationArray[4]]
    
  )
  //  dropdown language selection category
  const [selectedLanguageDropdownChoice,setSelectedLanguageDropdownChoice] = useState(0);

  

  function handleMainMenuAddCardsButton(){
    setShowManageCardsMainMenuOptions(false);
    stateStore.setShowAddCardsMenu(true);
  }


  
  function AddCardsMenu(){
  //  addCardsMenu

    return (
      <>
      <Title>{useLocStore.localizationArray[0]}</Title>
      <TcgAccountDropdown/>
      <CardCategoryDropdown/>
      <LanguageSelectionDropdown/>


      
      </>
    )
  }
  function LanguageSelectionDropdown() {
  
    return (
      <Select
        label={useLocStore.localizationArray[6]}
        placeholder={useLocStore.localizationArray[2]}
        data={usePokeCardStore.languages}
        value={usePokeCardStore.languages[selectedLanguageDropdownChoice]}
        onChange={(e)=> usePokeCardStore.languages.indexOf(e) == -1 ? setSelectedLanguageDropdownChoice(0): setSelectedLanguageDropdownChoice(usePokeCardStore.languages.indexOf(e))}
      />
    );
  }
  function CardCategoryDropdown() {
  
    return (
      <Select
        label={useLocStore.localizationArray[5]}
        placeholder={useLocStore.localizationArray[2]}
        data={cardCategoryOptions}
        value={cardCategoryOptions[selectedCardCategory]}
        onChange={(e)=> cardCategoryOptions.indexOf(e) == -1 ? setSelectedCardCategory(0): setSelectedCardCategory(cardCategoryOptions.indexOf(e))}
      />
    );
  }

function TcgAccountDropdown() {

  const filteredData = tcgAccounts.map((v,i,a)=> `${v.tcg_id_username} | ${v.tcg_id}`)
  return (
    <Select
      label={useLocStore.localizationArray[1]}
      placeholder={useLocStore.localizationArray[2]}
      data={filteredData}
      value={filteredData[selectedTcgAccount]}
      onChange={(e)=> filteredData.indexOf(e) == -1 ? setSelectedTcgAccount(0): setSelectedTcgAccount(filteredData.indexOf(e))}
    />
  );
}


  // checks if there are any accounts and sets them to a data
      useEffect(() => {
      async function getTcgAccounts() {
        setLoading(true)
        const user  = authStore.user?.user_id
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
{stateStore.showAddCardsMenu && (
<>
<AddCardsMenu/>
</>

)}




   
  
  </>
  )

}