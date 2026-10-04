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
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';






export function Auth() {
   const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [showRecovery, setShowRecovery] = useState(false)
  const [recoveryEmail, setRecoveryEmail] = useState('')
  const [recoveryLoading, setRecoveryLoading] = useState(false)
  const [recoveryMessage, setRecoveryMessage] = useState<{ ok: boolean; text: string } | null>(null)

  const handleRecoverUsername = async () => {
    setRecoveryLoading(true)
    setRecoveryMessage(null)
    const { error } = await supabase.functions.invoke('recover-username', {
      body: { email: recoveryEmail },
    })
    setRecoveryLoading(false)
    setRecoveryMessage(
      error
        ? { ok: false, text: 'Something went wrong. Please check the email address and try again.' }
        : { ok: true, text: 'If an account uses that email, we have sent its username there. Check your inbox.' },
    )
  }

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

        <Text size="sm" ta="center" mt="md">
          <Anchor
            data-click-id="Auth/forgot-username"
            component="button"
            type="button"
            onClick={() => {
              setShowRecovery((open) => !open)
              setRecoveryMessage(null)
            }}
          >
            Forgot your username?
          </Anchor>
        </Text>

        {showRecovery && (
          <Stack gap="sm" mt="md">
            <Text size="sm" c="dimmed">
              Enter the email you signed up with and we will email you your username.
            </Text>
            <TextInput
              data-click-id="Auth/recovery-email-input"
              label="Email"
              type="email"
              placeholder="ash@pallettown.pika"
              radius="md"
              value={recoveryEmail}
              onChange={(e) => setRecoveryEmail(e.target.value)}
            />
            <Button
              data-click-id="Auth/recovery-submit"
              variant="light"
              radius="md"
              loading={recoveryLoading}
              disabled={!recoveryEmail.trim()}
              onClick={handleRecoverUsername}
            >
              Email me my username
            </Button>
            {recoveryMessage && (
              <Text size="sm" c={recoveryMessage.ok ? 'teal' : 'red'}>
                {recoveryMessage.text}
              </Text>
            )}
          </Stack>
        )}
      </Paper>
    </Container>
  );
}