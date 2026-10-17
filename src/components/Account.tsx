import { Stack } from '@mantine/core'
import { MENU_MODE } from '../constants'
import { useEffect } from 'react'
import { supabase } from '../supabaseClient'
import type { Session } from '@supabase/supabase-js';
import { useStateStore } from '../store/useStateStore';
import { ManageCardsMainMenu } from './managecards/ManageCardsMainMenu';
import { ChangeUsername } from './ChangeUsername/ChangeUsername';




export function Account({ session }: { session: Session }) {
  const useStateStoreHandle = useStateStore();



// set last logged in - once per signed-in user, not on every render
const lastLoggedInUserId = session.user.id
useEffect(()=>{
  if (!lastLoggedInUserId) return

  supabase
    .from('user_account')
    .update({ last_logged_in: new Date() })
    .eq('user_id', lastLoggedInUserId)
    .then(({ error }) => {
      if (error) console.warn(error)
    })
}, [lastLoggedInUserId])



  return (

    <Stack gap="xl">
<ChangeUsername />
{useStateStoreHandle.showManageCardsMainMenu && (
  <ManageCardsMainMenu callComponent={MENU_MODE.mainMenu}/>
)}
    </Stack>

  )

}