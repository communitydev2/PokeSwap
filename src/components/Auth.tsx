import { useState } from 'react';
import { supabase } from '../supabaseClient';
import classes from '../assets/Auth.module.css';
import { useSavedAccountsStore } from '../store/savedAccountsStore';
import { useAuthStore } from '../store/userStore';
import { useLocalizationStore } from '../store/useLocalizationStore';



import {
  ActionIcon,
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
  // Set once the email is sent: shows the code box for that address
  const [codeSentTo, setCodeSentTo] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [loginMessage, setLoginMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const t = useLocalizationStore((state) => state.t)
  const [showRecovery, setShowRecovery] = useState(false)
  const [recoveryEmail, setRecoveryEmail] = useState('')
  const [recoveryLoading, setRecoveryLoading] = useState(false)
  const [recoveryMessage, setRecoveryMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const savedAccounts = useSavedAccountsStore()
  const currentUserId = useAuthStore((state) => state.session?.user.id)
  // Accounts already signed in on this device (other than the current one)
  const switchable = savedAccounts.accounts.filter((a) => a.userId !== currentUserId)
  const [switching, setSwitching] = useState<string | null>(null)

  const handleContinueAs = async (userId: string) => {
    setSwitching(userId)
    const { ok } = await savedAccounts.switchTo(userId)
    setSwitching(null)
    if (!ok) savedAccounts.setNotice('That account was signed out. Please sign in to it again.')
  }

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
    setLoginMessage(null)
    // Send the magic link back to the address the user is on (localhost, Tailscale, live site).
    // The same email also contains a code, for signing in on a different device or browser.
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    })
    setLoading(false)

    if (error) {
      console.warn(error)
      // Rate-limit messages ("you can only request this after N seconds") are worth showing as-is
      setLoginMessage({ ok: false, text: error.status === 429 ? error.message : t.signInSendFailed })
      return
    }
    setCodeSentTo(email.trim())
    setCode('')
  }

  const handleVerifyCode = async () => {
    if (!codeSentTo) return
    setVerifying(true)
    setLoginMessage(null)
    const { error } = await supabase.auth.verifyOtp({ email: codeSentTo, token: code.trim(), type: 'email' })
    setVerifying(false)
    if (error) {
      console.warn(error)
      setLoginMessage({ ok: false, text: t.signInCodeInvalid })
    }
    // On success the session is picked up in __root.tsx and the page moves on
  }
  return (
    <Container size={420} my={40}>
      <Title ta="center" className={classes.title}>
       Poke app
      </Title>

      {/* <Text className={classes.subtitle}>
        Do not have an account yet? <Anchor data-click-id="Auth/create-account">Create account</Anchor>
      </Text> */}

      {savedAccounts.addingAccount && (
        <Text size="sm" ta="center" c="dimmed" mt="sm">
          Sign in to another account. Your current account stays saved on this device.{' '}
          <Anchor data-click-id="Auth/cancel-add-account" component="button" type="button" onClick={() => savedAccounts.setAddingAccount(false)}>
            Cancel
          </Anchor>
        </Text>
      )}

      {switchable.length > 0 && (
        <Paper withBorder shadow="sm" p={22} mt={30} radius="md">
          <Text fw={500} mb="sm">
            Accounts on this device
          </Text>
          <Stack gap="xs">
            {switchable.map((account, i) => (
              <Group key={account.userId} wrap="nowrap" gap="xs">
                <Button
                  data-click-id={`Auth/continue-as:${i}`}
                  variant="light"
                  radius="md"
                  style={{ flex: 1 }}
                  loading={switching === account.userId}
                  onClick={() => handleContinueAs(account.userId)}
                >
                  Continue as {account.username || account.email}
                </Button>
                <ActionIcon
                  data-click-id={`Auth/forget-account:${i}`}
                  variant="subtle"
                  color="gray"
                  aria-label={`Remove ${account.email} from this device`}
                  title="Remove from this device"
                  onClick={() => savedAccounts.remove(account.userId)}
                >
                  ×
                </ActionIcon>
              </Group>
            ))}
          </Stack>
        </Paper>
      )}

      <Paper withBorder shadow="sm" p={22} mt={30} radius="md">
        {!codeSentTo ? (
          <>
            <TextInput data-click-id="Auth/email-input" label="Email" placeholder="ash@pallettown.pika" required radius="md" value={email} onChange={(e)=>setEmail(e.target.value)}/>
            <Button data-click-id="Auth/login-button" fullWidth mt="xl" radius="md" onClick={handleLogin} loading={loading} disabled={!email.trim()}>
              Sign up with email
            </Button>
            {/* Use a code from an earlier email without sending a new one (e.g. after hitting the rate limit) */}
            <Text size="sm" ta="center" mt="sm">
              <Anchor
                data-click-id="Auth/have-code"
                component="button"
                type="button"
                onClick={() => {
                  if (!email.trim()) {
                    setLoginMessage({ ok: false, text: t.signInEnterEmailFirst })
                    return
                  }
                  setLoginMessage(null)
                  setCode('')
                  setCodeSentTo(email.trim())
                }}
              >
                {t.signInHaveCode}
              </Anchor>
            </Text>
          </>
        ) : (
          <Stack gap="sm">
            <Text size="sm">{t.signInEmailSent(codeSentTo)}</Text>
            <TextInput
              data-click-id="Auth/code-input"
              label={t.signInCodeLabel}
              placeholder={t.signInCodePlaceholder}
              inputMode="numeric"
              autoComplete="one-time-code"
              radius="md"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.replace(/\D/g, ''))
                setLoginMessage(null)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && code.length >= 6) handleVerifyCode()
              }}
            />
            <Button data-click-id="Auth/verify-code" fullWidth radius="md" onClick={handleVerifyCode} loading={verifying} disabled={code.length < 6}>
              {t.signInWithCode}
            </Button>
            <Group justify="space-between">
              <Anchor data-click-id="Auth/resend-email" component="button" type="button" size="sm" onClick={handleLogin}>
                {t.signInResend}
              </Anchor>
              <Anchor
                data-click-id="Auth/change-email"
                component="button"
                type="button"
                size="sm"
                onClick={() => {
                  setCodeSentTo(null)
                  setLoginMessage(null)
                }}
              >
                {t.signInUseDifferentEmail}
              </Anchor>
            </Group>
          </Stack>
        )}
        {loginMessage && (
          <Text size="sm" mt="sm" c={loginMessage.ok ? 'teal' : 'red'}>
            {loginMessage.text}
          </Text>
        )}

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