import { createRootRoute, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtoolsInProd } from '@tanstack/react-router-devtools'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { Header } from './Header'
import { MantineProvider} from "@mantine/core";
import { theme } from '../theme';
import { useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuthStore } from '../store/userStore';
if(process.env.NODE_ENV === 'production'){
  <TanStackRouterDevtoolsInProd/>
}




// Restore the saved Supabase session on every page (not just the landing page)
// and keep the auth store in sync when the user signs in, out, or the token refreshes.
function useSupabaseSession() {
  const setSession = useAuthStore((state) => state.setSession)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setSession(session))
    return () => data.subscription.unsubscribe()
  }, [setSession])
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