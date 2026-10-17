import { useRef, useState } from 'react';
import { supabase } from '../supabaseClient';
import classes from '../assets/Auth.module.css';
import { useSavedAccountsStore } from '../store/savedAccountsStore';
import { useAuthStore } from '../store/userStore';
import { useLocalizationStore } from '../store/useLocalizationStore';



import {
  ActionIcon,
  Anchor,
  Button,
  Box,
  Group,
  Paper,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';






export function Auth() {
  const busy = useRef(false)
  const recoveryBusy = useRef(false)
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
    const { ok, expired } = await savedAccounts.switchTo(userId)
    setSwitching(null)
    if (!ok) savedAccounts.setNotice(expired ? t.headerAccountSignedOut : t.qaSwitchFailed)
  }

  const handleRecoverUsername = async () => {
    if (recoveryBusy.current) return
    recoveryBusy.current = true
    setRecoveryLoading(true)
    setRecoveryMessage(null)
    const { error } = await supabase.functions.invoke('recover-username', {
      body: { email: recoveryEmail.trim() },
    })
    recoveryBusy.current = false
    setRecoveryLoading(false)
    setRecoveryMessage(
      error
        ? { ok: false, text: t.qaRecoveryFailed }
        : { ok: true, text: t.qaRecoverySent },
    )
  }

  const handleLogin = async (event: { preventDefault: () => void }) => {
    event.preventDefault()
    if (busy.current) return
    busy.current = true
    const targetEmail = codeSentTo ?? email.trim()

    setLoading(true)
    setLoginMessage(null)
    // Send the magic link back to the address the user is on (localhost, Tailscale, live site).
    // The same email also contains a code, for signing in on a different device or browser.
    const { error } = await supabase.auth.signInWithOtp({
      email: targetEmail,
      options: { emailRedirectTo: window.location.origin },
    })
    busy.current = false
    setLoading(false)

    if (error) {
      console.warn(error)
      // Rate-limit messages ("you can only request this after N seconds") are worth showing as-is
      const networkFailed = error.name === 'AuthRetryableFetchError' || error.status === 0
      setLoginMessage({
        ok: false,
        text: error.status === 429 ? error.message : networkFailed ? t.signInNetworkFailed : t.signInSendFailed,
      })
      return
    }
    setCodeSentTo(targetEmail)
    setCode('')
  }

  const handleVerifyCode = async () => {
    if (!codeSentTo || busy.current || !/^\d{6}$/.test(code)) return
    busy.current = true
    setVerifying(true)
    setLoginMessage(null)
    const { error } = await supabase.auth.verifyOtp({ email: codeSentTo, token: code.trim(), type: 'email' })
    busy.current = false
    setVerifying(false)
    if (error) {
      console.warn(error)
      const networkFailed = error.name === 'AuthRetryableFetchError' || error.status === 0
      setLoginMessage({ ok: false, text: networkFailed ? t.signInNetworkFailed : t.signInCodeInvalid })
    }
    // On success the session is picked up in __root.tsx and the page moves on
  }
  return (
    <Box maw={420} w="100%" mx="auto">
      <Title order={2} ta="center" className={classes.title}>
        {t.authTitle}
      </Title>
      <Text size="sm" c="dimmed" ta="center" mt="xs">{t.authSubtitle}</Text>

      {/* <Text className={classes.subtitle}>
        Do not have an account yet? <Anchor data-click-id="Auth/create-account">Create account</Anchor>
      </Text> */}

      {savedAccounts.addingAccount && (
        <Text size="sm" ta="center" c="dimmed" mt="sm">
          {t.qaAddAccountIntro}{' '}
          <Anchor data-click-id="Auth/cancel-add-account" component="button" type="button" onClick={() => savedAccounts.setAddingAccount(false)}>
            {t.qaCancel}
          </Anchor>
        </Text>
      )}

      {switchable.length > 0 && (
        <Paper withBorder shadow="sm" p="md" mt="lg" radius="md">
          <Text fw={500} mb="sm">
            {t.qaSavedAccounts}
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
                  disabled={switching !== null}
                  onClick={() => handleContinueAs(account.userId)}
                >
                  {t.qaContinueAs(account.username || account.email)}
                </Button>
                <ActionIcon
                  data-click-id={`Auth/forget-account:${i}`}
                  variant="subtle"
                  color="gray"
                  aria-label={t.qaRemoveAccount(account.email)}
                  title={t.qaRemoveDevice}
                  onClick={() => savedAccounts.remove(account.userId)}
                >
                  ×
                </ActionIcon>
              </Group>
            ))}
          </Stack>
        </Paper>
      )}

      <Paper withBorder shadow="sm" p="md" mt="lg" radius="md">
        {!codeSentTo ? (
          <form onSubmit={handleLogin}>
            <TextInput data-click-id="Auth/email-input" label={t.qaEmail} type="email" placeholder="ash@pallettown.pika" required disabled={loading} radius="md" value={email} onChange={(e)=>setEmail(e.target.value)}/>
            <Button data-click-id="Auth/login-button" fullWidth mt="xl" radius="md" type="submit" loading={loading} disabled={!email.trim()}>
              {t.qaEmailSignInCode}
            </Button>
            {/* Use a code from an earlier email without sending a new one (e.g. after hitting the rate limit) */}
            <Text size="sm" ta="center" mt="sm">
              <Anchor
                data-click-id="Auth/have-code"
                disabled={loading}
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
          </form>
        ) : (
          <Stack gap="sm">
            <Text size="sm">{t.signInEmailSent(codeSentTo)}</Text>
            <TextInput
              data-click-id="Auth/code-input"
              label={t.signInCodeLabel}
              placeholder={t.signInCodePlaceholder}
              inputMode="numeric"
              maxLength={6}
              disabled={verifying}
              autoComplete="one-time-code"
              radius="md"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.replace(/\D/g, ''))
                setLoginMessage(null)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && code.length === 6) handleVerifyCode()
              }}
            />
            <Button data-click-id="Auth/verify-code" fullWidth radius="md" onClick={handleVerifyCode} loading={verifying} disabled={code.length !== 6 || loading}>
              {t.signInWithCode}
            </Button>
            <Group justify="space-between">
              <Anchor data-click-id="Auth/resend-email" component="button" type="button" size="sm" disabled={loading || verifying} onClick={handleLogin}>
                {t.signInResend}
              </Anchor>
              <Anchor
                data-click-id="Auth/change-email"
                disabled={loading || verifying}
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
            {t.qaForgotUsername}
          </Anchor>
        </Text>

        {showRecovery && (
          <Stack component="form" onSubmit={(event) => { event.preventDefault(); handleRecoverUsername() }} gap="sm" mt="md">
            <Text size="sm" c="dimmed">
              {t.qaRecoveryIntro}
            </Text>
            <TextInput
              data-click-id="Auth/recovery-email-input"
              required
              label={t.qaEmail}
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
              type="submit"
            >
              {t.qaRecover}
            </Button>
            {recoveryMessage && (
              <Text size="sm" c={recoveryMessage.ok ? 'teal' : 'red'}>
                {recoveryMessage.text}
              </Text>
            )}
          </Stack>
        )}
      </Paper>
    </Box>
  );
}