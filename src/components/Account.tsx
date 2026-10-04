import { MENU_MODE } from '../constants'
import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { useAuthStore } from '../store/userStore';
import { useStateStore } from '../store/useStateStore';
import { ManageCardsMainMenu } from './managecards/ManageCardsMainMenu';
import { useLocalizationStore } from '../store/useLocalizationStore';
import { ChangeUsername } from './ChangeUsername/ChangeUsername';




export function Account({ session }) {
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState(null);
  const authStore = useAuthStore();
  const useStateStoreHandle = useStateStore();
  const useLocStoreWrapper = useLocalizationStore();


// set last logged in - once per signed-in user, not on every render
const lastLoggedInUserId = authStore.user?.user_id
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



    useEffect(() => {
    async function getProfile() {
      setLoading(true)
      const { user } = session
      // console.log(session)

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
        setUsername(data[0])
        authStore.setUser(data[0]);
      }

      setLoading(false)
    }
    if(authStore.user == null){
      getProfile()

    }
  }, [session])

  return (

    <div>
<h1>Signed In</h1>
<ChangeUsername />
{useStateStoreHandle.showManageCardsMainMenu && (
  <ManageCardsMainMenu callComponent={MENU_MODE.mainMenu}/>
)}
    </div>

  )

}