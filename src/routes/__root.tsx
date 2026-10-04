import { createRootRoute, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtoolsInProd } from '@tanstack/react-router-devtools'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { Header } from '../components/Header'
import { MantineProvider} from "@mantine/core";
import { theme } from '../theme';
import { useEffect } from 'react';
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
if(process.env.NODE_ENV === 'production'){
  <TanStackRouterDevtoolsInProd/>
}




// Restore the saved Supabase session on every page (not just the landing page)
// and keep the auth store in sync when the user signs in, out, or the token refreshes.
function useSupabaseSession() {
  const setSession = useAuthStore((state) => state.setSession)
  const setUser = useAuthStore((state) => state.setUser)
  const setProfileLoading = useAuthStore((state) => state.setProfileLoading)
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
      setSession(session)
      // Remember every account signed in on this device, with its latest tokens
      if (session) saveSession(session)
      if (event === 'SIGNED_IN') setAddingAccount(false)
    }
    supabase.auth.getSession().then(({ data: { session } }) => apply('INITIAL', session))
    const { data } = supabase.auth.onAuthStateChange(apply)
    return () => data.subscription.unsubscribe()
  }, [setSession, saveSession, setAddingAccount])

  // Load the signed-in user's profile (username etc.); clear it on sign-out
  useEffect(() => {
    setUser(null)
    if (!userId) {
      setProfileLoading(false)
      return
    }
    let cancelled = false
    setProfileLoading(true)
    // Supporter badge (false if the support SQL hasn't been run yet)
    setIsSupporter(false)
    supabase.rpc('my_supporter_status').then(({ data, error }) => {
      if (!cancelled && !error) setIsSupporter(data === true)
    })
    supabase
      .from('user_account')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) console.warn(error)
        else setUser(data)
        setProfileLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [userId, setUser, setProfileLoading, setIsSupporter])

  // Keep the saved account's username in sync for the account switcher
  useEffect(() => {
    if (userId && username) setSavedUsername(userId, username)
  }, [userId, username, setSavedUsername])
}

const RootLayout =() => {
  useSupabaseSession()

  return (

  
  <>
  <MantineProvider theme={ theme }>
   <Header/>
    <Outlet />
     </MantineProvider>
    <TanStackRouterDevtools />
  </>
  )
}
  


export const Route = createRootRoute({ component: RootLayout })