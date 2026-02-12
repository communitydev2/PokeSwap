import { createFileRoute } from '@tanstack/react-router'
import { Popover, Text, Button,List } from '@mantine/core';
import { useState,useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useAuthStore } from '../../store/userStore';
import { ManageTCGACcountsMenu } from './ManageTCGAccountsMenu';
export const Route = createFileRoute('/managecards/ManageCardsMainMenu')({
  component: ManageCardsMainMenu,
})

export function ManageCardsMainMenu() {
  const [loading , setLoading] = useState(false)
  const [hasTcgAccounts,setHasTcgAccounts] = useState(false)
  const authStore = useAuthStore();
  // check if there are any tcg accounts
  
  
      useEffect(() => {
      async function getTcgAccounts() {
        setLoading(true)
        const { user } = authStore.session
        // console.log(session)
  
        const { data, error } = await supabase
          .from('player_tcg_account')
          .select("*")
          .eq('user_id',user.id)
  
  
        // let { data, error } = await supabase
        //   .from('user_account')
        //   .select(`username`)
        //   .eq('user_id', user.id)
        //   .single()
  
        if (error) {
          console.warn(error)
        } else if (data) {
          setHasTcgAccounts(data.length>0)
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
  <ManageTCGACcountsMenu/>
)}

      <List>
      <List.Item>Account1</List.Item>
      <List.Item>Install dependencies with yarn</List.Item>
      <List.Item>To start development server run npm start command</List.Item>
      <List.Item>Run tests to make sure your changes do not break the build</List.Item>
      <List.Item>Submit a pull request once you are done</List.Item>
    </List>
  
  </>
  )

}