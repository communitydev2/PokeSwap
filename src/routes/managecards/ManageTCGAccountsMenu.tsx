import { createFileRoute } from '@tanstack/react-router'
import { IconArrowLeft } from '@tabler/icons-react';
import {
Anchor,
Box,
Button,
Center,
Container,
Group,
Paper,
Text,
TextInput,
Title,
Checkbox,
Space,
Overlay
} from '@mantine/core';
import classes from '../../assets/ManageTCGAccountsMenu.module.css';
import { supabase } from '../../supabaseClient';
import { useEffect, useState } from 'react';
import { useForm,useFieldArray } from "react-hook-form";
import { Select } from '@mantine/core';
import { useAuthStore } from '../../store/userStore';
interface tcgAccountType {
  index:number;


  

}


import React from 'react'





export const Route = createFileRoute('/managecards/ManageTCGAccountsMenu')({
  component: ManageTCGAccountsMenu,
})

export function ManageTCGAccountsMenu() {
  const [tcgIdNames,setTcgIdNames] = useState<string[]>([""])
  const [tcgIdNumbers,settcgIdNumbers] = useState<number[]>([1])
  const [accountNumber,setAccountNumber] = useState<string | null>("1");
  const [submitTcgAccounts,setSubmitTcgAccounts] = useState<boolean>(false);
  const [visible, setVisible] = useState(false);
  const authStore = useAuthStore();
  function submitData(){
     console.log(tcgIdNames.length)
     setVisible(true)
    setSubmitTcgAccounts(true)
  }

useEffect(()=>{

  async function submitTcgData(){

    for (let i:number=0;i<=tcgIdNames.length;i++){
      
      const { data, error } = await supabase
      .from('player_tcg_account')
    .insert([
      {user_id:authStore.user?.user_id, tcg_id_username: tcgIdNames[i], tcg_id: tcgIdNumbers[i] },
    ])
    .select()

       if (error) {
        console.warn(error)
      } else if (data) {
        console.log(data)
      }
  }
  setSubmitTcgAccounts(false);
}
  if(submitTcgAccounts){
    submitTcgData()
}
},[submitTcgAccounts])
  
// turn overlay off after 2 seconds
useEffect(()=>{
 setTimeout(()=>{
      setVisible(false);
    },2000)

},[visible])


  function AccountNumberDropdown() {
    return (
      <Select
        label="Select Account Number"
        placeholder="Pick value"
        data={[
          "1",
          "2",
          "3",
          "4",
          "5",
          "6",
          "7",
          "8",
          "9",
          "10",
          "11",
          "12",
          "13",
          "14",
          "15",
          "16",
          "17",
          "18",
          "19",
          "20",
          "21",
          "22",
          "23",
          "24",
          "25",
          "26",
          "27"
        ]}
        value={accountNumber}
        onChange={setAccountNumber}
        defaultValue={"1"}
      />
    );
  }


  useEffect(()=>{
setTcgIdNames(Array.from({length: accountNumber}, (v, i) => "e"))

settcgIdNumbers(Array.from({length: accountNumber}, (v, i) => i))

},[accountNumber])







  const AccountInsertion = ({index}:tcgAccountType,) => {
    return (
      <div>

        <Title className={classes.title} ta="center">
        Tcg Account Number {index+1}
        </Title>

        <Space h="lg" />


        <TextInput
         withAsterisk
         label="TCG Account Name"
         placeholder="pokePlayer555"
         value={tcgIdNames[index]}
         onChange={(event)=> setTcgIdNames(tcgIdNames[index])}
         />
       <TextInput
         withAsterisk
         label="TCG ID Number"
         placeholder="54636463475"
         value={tcgIdNumbers[index]}
         onChange={(event)=> settcgIdNumbers(tcgIdNumbers[index])}
       />
        <Space h="lg" />
      </div>
    )
  }




  return (
      <Container size={460} my={30}>
         
         
         {visible && (

          <>
          <Overlay color="#000" backgroundOpacity={0.98} children={
           <Center maw={"auto"} h={"100%"} bg="var(--mantine-color-gray-light)">
            <Title className={classes.title} ta="center">
        Accounts Created
      </Title>
</Center>


}/>
        </>
        
        )}
         <Title className={classes.title} ta="center">
        Please add one or more Pokemon Pocket Accounts
      </Title>
       <Space h="lg" />
<AccountNumberDropdown/>
       <Space h="lg" />
  {tcgIdNames != null && tcgIdNames.map((field, index) => ( 
<AccountInsertion index={index} key={index} />
 ))}
 
<Button variant="filled" onClick={submitData}>Submit Accounts</Button>
  
  
  





     </Container>
  );
}

