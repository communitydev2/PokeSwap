import { createRootRoute, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtoolsInProd } from '@tanstack/react-router-devtools'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { Header } from './Header'
import { MantineProvider} from "@mantine/core";
import { theme } from '../theme';
import { useEffect } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../supabaseClient';
import { useAuthStore } from '../store/userStore';
import { useSavedAccountsStore } from '../store/savedAccountsStore';
if(process.env.NODE_ENV === 'production'){
  <TanStackRouterDevtoolsInProd/>
}




// Restore the saved Supabase session on every page (not just the landing page)
// and keep the auth store in sync when the user signs in, out, or the token refreshes.
function useSupabaseSession() {
  const setSession = useAuthStore((state) => state.setSession)
  const setUser = useAuthStore((state) => state.setUser)
  const setProfileLoading = useAuthStore((state) => state.setProfileLoading)
  const userId = useAuthStore((state) => state.session?.user.id)
  const username = useAuthStore((state) => state.user?.username ?? null)
  const saveSession = useSavedAccountsStore((state) => state.saveSession)
  const setSavedUsername = useSavedAccountsStore((state) => state.setUsername)
  const setAddingAccount = useSavedAccountsStore((state) => state.setAddingAccount)

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
  }, [userId, setUser, setProfileLoading])

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