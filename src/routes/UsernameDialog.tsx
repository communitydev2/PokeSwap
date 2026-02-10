import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react';
import { supabase } from '../supabaseClient';
import classes from '../assets/Auth.module.css';
import { useAuthStore } from '../store/userStore';
export const Route = createFileRoute('/UsernameDialog')({
  component: Username,
})


import {
  Anchor,
  Button,
  Checkbox,
  Container,
  Group,
  Paper,
  PasswordInput,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useEffect } from 'react';
import { background } from 'storybook/theming';






export function Username() {
   const [loading, setLoading] = useState(false)
  const [username, setUsername] = useState('')
  const [takenUsernameError,setTakenUsernameError] = useState("");
  const [pressSetUsernameButton,setPressSetUsernameButton] = useState<boolean>(false);
  const [badWords,setBadWords] = useState<string[]>([]);
  const authStore = useAuthStore();
  const [showErrorMessage,setShowErrorMessage] = useState(false);
  const [errorMessage,setErrorMessage] = useState('');

  const errorMessages = [
"This username is inappropriate, please choose another one.",
"This username already exists. Please pick another one.",
"Please write a username"

  ]

  

// toggle the message off after a certain time (5 seconds)
useEffect(() => {

  if(showErrorMessage){
    setTimeout(()=>{
      setShowErrorMessage(false);
    },5000)
  }


},[showErrorMessage])


  // if user is not set on zustand yet, then set it here
      useEffect(() => {
      async function getProfile() {
        setLoading(true)
        const { user } = authStore.session
  
        const { data, error } = await supabase
          .from('user_account')
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
          // setting data as a single object
          authStore.setUser(data[0]);
        }
  
        setLoading(false)
      }
      if(authStore.user == null){
        getProfile()

      }
    }, [])
  
  
  
  useEffect(() => {
    async function getProfanityWords() {
      setLoading(true)


let { data, error } = await supabase
  .from('banned_words')
  .select('*')


  
      // let { data, error } = await supabase
      //   .from('user_account')
      //   .select(`username`)
      //   .eq('user_id', user.id)
      //   .single()

      if (error) {
        console.warn(error)
      } else if (data) {
        setBadWords(data)
      }

      setLoading(false)
    }
    getProfanityWords()
  },[])

  // checks if username exists
  useEffect(() => {
    // console.log("trig")
    // console.log(authStore.user)
    setLoading(false)

    async function getUsernameList() {
      setLoading(true)
  
  let { data, error } = await supabase
  .from('user_account')
  .select('username')
  
  
  
      // let { data, error } = await supabase
      //   .from('user_account')
      //   .select(`username`)
      //   .eq('user_id', user.id)
      //   .single()
  
      if (error) {
        console.log(error)
      } else if (data) {
        const response = await supabase
        .from('user_account')
        .update({ username: username })
        .eq('user_id', authStore.user?.user_id)
        .select()
        

        if(response.error){
          console.log(response.error.message)
          setShowErrorMessage(true)
          if(response.error.message =="Username contains a banned word"){

            setErrorMessage(errorMessages[0])
          }else{
            setErrorMessage(errorMessages[1])

          }

        }

        setPressSetUsernameButton(false)
      }
    }
    if(pressSetUsernameButton){

      getUsernameList()
    }

      
      setLoading(false)
    
  },[pressSetUsernameButton])





  const handleLogin = async (event) => {
    event.preventDefault()
    if(username != ""){
      setPressSetUsernameButton(true);
    }else{
      setShowErrorMessage(true);
setErrorMessage(errorMessages[2])
    }
    // setLoading(true)





  }
  return (
    <Container size={420} my={40}>
      <Title ta="center" className={classes.title}>
       Insert Your Username
      </Title>

      {/* <Text className={classes.subtitle}>
        Do not have an account yet? <Anchor>Create account</Anchor>
      </Text> */}

      <Paper withBorder shadow="sm" p={22} mt={30} radius="md">
        <TextInput label="Username" placeholder="Enter your username" required radius="md" onChange={(e)=>setUsername(e.target.value)}/>
          {showErrorMessage && (

            <Text color='red'>{errorMessage}   </Text>
          )}
        <Button fullWidth mt="xl" radius="md" onClick={
          handleLogin}>
            {loading ? <span>Loading</span> : <span>Sign up with username</span>}
        </Button>
      </Paper>
    </Container>
  );
}