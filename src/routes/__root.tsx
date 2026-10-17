import { createRootRoute, Link, Outlet } from '@tanstack/react-router'
import { Header } from '../components/Header'
import { NewSetBanner } from '../components/NewSetBanner'
import { Anchor, Box, Container, Stack, Text, Title, MantineProvider} from "@mantine/core";
import { theme } from '../theme';
import { lazy, Suspense, useEffect } from 'react';
import { useStateStore } from '../store/useStateStore';

const Devtools = import.meta.env.DEV ? lazy(() => import('@tanstack/react-router-devtools').then((module) => ({ default: module.TanStackRouterDevtools }))) : null;
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../supabaseClient';
import { useAuthStore } from '../store/userStore';
import { useSavedAccountsStore } from '../store/savedAccountsStore';
import { useLocalizationStore } from '../store/useLocalizationStore';

// Read before Supabase processes the URL: a failed magic link comes back as
// #error=...&error_code=otp_expired&error_description=...
const initialAuthError = (() => {
  const params = new URLSearchParams(window.location.hash.slice(1))
  return params.get('error') ? params.get('error_code') ?? 'unknown' : null
})()





// Restore the saved Supabase session on every page (not just the landing page)
// and keep the auth store in sync when the user signs in, out, or the token refreshes.
function useSupabaseSession() {
  const setSession = useAuthStore((state) => state.setSession)
  const setUser = useAuthStore((state) => state.setUser)
  const setProfileLoading = useAuthStore((state) => state.setProfileLoading)
  const setProfileError = useAuthStore((state) => state.setProfileError)
  const setIsSupporter = useAuthStore((state) => state.setIsSupporter)
  const userId = useAuthStore((state) => state.session?.user.id)
  const username = useAuthStore((state) => state.user?.username ?? null)
  const saveSession = useSavedAccountsStore((state) => state.saveSession)
  const setSavedUsername = useSavedAccountsStore((state) => state.setUsername)
  const setAddingAccount = useSavedAccountsStore((state) => state.setAddingAccount)
  const setNotice = useSavedAccountsStore((state) => state.setNotice)
  const t = useLocalizationStore((state) => state.t)

  // Explain a failed sign-in link instead of silently ignoring it, and tidy the address bar
  useEffect(() => {
    if (!initialAuthError) return
    setNotice(initialAuthError === 'otp_expired' ? t.linkExpired : t.linkFailed)
    window.history.replaceState(null, '', window.location.pathname + window.location.search)
  }, [setNotice, t])

  useEffect(() => {
    const apply = (event: string, session: Session | null) => {
      const previousId = useAuthStore.getState().session?.user.id
      if (previousId !== session?.user.id) useStateStore.getState().setShowManageCardsMainMenu(false)
      if (!session) setAddingAccount(false)
      setSession(session)
      // Remember every account signed in on this device, with its latest tokens
      if (session) saveSession(session)
      if (event === 'SIGNED_IN') setAddingAccount(false)
    }
    let receivedEvent = false
    supabase.auth.getSession().then(({ data: { session } }) => { if (!receivedEvent) apply('INITIAL', session) })
    const { data } = supabase.auth.onAuthStateChange((event, session) => { receivedEvent = true; apply(event, session) })
    return () => data.subscription.unsubscribe()
  }, [setSession, saveSession, setAddingAccount])

  // Load the signed-in user's profile (username etc.); clear it on sign-out
  useEffect(() => {
    setUser(null)
    setProfileError(false)
    setIsSupporter(false)
    if (!userId) {
      setProfileLoading(false)
      return
    }
    let cancelled = false
    setProfileLoading(true)
    // Supporter badge (false if the support SQL hasn't been run yet)
    setIsSupporter(false)
    supabase.rpc('my_supporter_status').then(({ data, error }) => {
      if (!cancelled && useAuthStore.getState().session?.user.id === userId && !error) setIsSupporter(data === true)
    })
    Promise.resolve(supabase
      .from('user_account')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle())
      .then(({ data, error }) => {
        if (cancelled || useAuthStore.getState().session?.user.id !== userId) return
        if (error) { console.warn(error); setProfileError(true) }
        else setUser(data)
        setProfileLoading(false)
      }).catch((error) => {
        if (cancelled || useAuthStore.getState().session?.user.id !== userId) return
        console.warn(error)
        setProfileError(true)
        setProfileLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [userId, setUser, setProfileLoading, setIsSupporter, setProfileError])

  // Keep the saved account's username in sync for the account switcher
  useEffect(() => {
    if (userId && username) setSavedUsername(userId, username)
  }, [userId, username, setSavedUsername])
}

const RootLayout =() => {
  useSupabaseSession()

  return (

  
  <>
  <MantineProvider theme={ theme } defaultColorScheme="dark">
   <Header/>
   <NewSetBanner/>
    <Box component="main" pt="lg" pb={80}>
      <Outlet />
    </Box>
     </MantineProvider>
    {Devtools && <Suspense fallback={null}><Devtools /></Suspense>}
  </>
  )
}
  


function NotFound() {
  const t = useLocalizationStore((state) => state.t)
  return (
    <Container size={760} px="md">
      <Stack>
        <Title order={2}>{t.qaNotFoundTitle}</Title>
        <Text c="dimmed">{t.qaNotFoundDescription}</Text>
        <Anchor component={Link} to="/" data-click-id="NotFound/home">{t.qaNotFoundHome}</Anchor>
      </Stack>
    </Container>
  )
}

export const Route = createRootRoute({ component: RootLayout, notFoundComponent: NotFound })