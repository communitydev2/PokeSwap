import { createFileRoute } from '@tanstack/react-router'
import { Popover, Text, Button,List,Select,Group, Space,Title } from '@mantine/core';
import { useState,useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useAuthStore } from '../../store/userStore';
import { ManageTCGAccountsMenu } from './ManageTCGAccountsMenu';
import { useStateStore } from '../../store/useStateStore';
import { UseLocalizationStoreType } from '../../types/UseLocalizationStoreType';
import { useLocalizationStore } from '../../store/uselocalizationStore';
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
  const [loading , setLoading] = useState(false)
  const [hasTcgAccounts,setHasTcgAccounts] = useState(false)
  const [tcgAccounts,setTcgAccounts ] = useState<tcgAccountType[]>()
  const [selectedTcgAccount,setSelectedTcgAccount] = useState(0)
  const stateStore = useStateStore();
  // its true by default, and set to false when pressing anything inside the main menu
  const [showManageCardsMainMenuOptions,setShowManageCardsMainMenuOptions] = useState(true);
  const authStore = useAuthStore();
  const useLocStore = useLocalizationStore();
  // check if there are any tcg accounts
  

  function handleMainMenuAddCardsButton(){
    setShowManageCardsMainMenuOptions(false);
    stateStore.setShowAddCardsMenu(true);
  }


  
  function AddCardsMenu(){
  
    return (
      <>
      <Title>{useLocStore.localizationArray[0]}</Title>
      <CardCategoryDropdown/>


      <TcgAccountDropdown/>
      
      </>
    )
  }

function CardCategoryDropdown() {

  return (
    <Select
      label="test"
      placeholder="Pick value"
      data={["Add to Wishlist","Add to Cards Available For Trade"]}
    />
  );
}
function TcgAccountDropdown() {

  const filteredData = tcgAccounts.map((v,i,a)=> `${v.tcg_id_username} | ${v.tcg_id}`)
  return (
    <Select
      label="Select your Pocket Account"
      placeholder="Pick value"
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