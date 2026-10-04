import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react';
import { supabase } from '../supabaseClient';
import classes from '../assets/Auth.module.css';

export const Route = createFileRoute('/Auth')({
  component: Auth,
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






export function Auth() {
   const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')

  const handleLogin = async (event) => {
    event.preventDefault()

    setLoading(true)
    // Send the magic link back to the address the user is on (localhost, Tailscale, live site)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    })

    if (error) {
      alert(error.error_description || error.message)
    } else {
      alert('Check your email for the login link!')
    }
    setLoading(false)
  }
  return (
    <Container size={420} my={40}>
      <Title ta="center" className={classes.title}>
       Poke app
      </Title>

      {/* <Text className={classes.subtitle}>
        Do not have an account yet? <Anchor data-click-id="Auth/create-account">Create account</Anchor>
      </Text> */}

      <Paper withBorder shadow="sm" p={22} mt={30} radius="md">
        <TextInput data-click-id="Auth/email-input" label="Email" placeholder="ash@pallettown.pika" required radius="md" onChange={(e)=>setEmail(e.target.value)}/>
        <Button data-click-id="Auth/login-button" fullWidth mt="xl" radius="md" onClick={handleLogin}>
            {loading ? <span>Loading</span> : <span>Sign up with email</span>}
        </Button>
      </Paper>
    </Container>
  );
}