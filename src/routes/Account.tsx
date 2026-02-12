import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { useAuthStore } from '../store/userStore';
import { useStateStore } from '../store/useStateStore';
import { ManageCardsMainMenu } from './managecards/ManageCardsMainMenu';
export const Route = createFileRoute('/Account')({
  component: Account,
})




export function Account({ session }) {
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState(null);
  const authStore = useAuthStore();
  const useStateStoreHandle = useStateStore();


// set last logged in
useEffect(()=>{


  const date = new Date();

  async function setLastLoggedIn(){
    setLoading(true)
    const response = await supabase
            .from('user_account')
            .update({ last_logged_in: date })
            .eq('user_id', authStore.user?.user_id)
            .select()
    
  }

  setLastLoggedIn()
})



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
        authStore.setUser(data);
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
{useStateStoreHandle.showManageCardsMainMenu && (
  <ManageCardsMainMenu/>
)}
    </div>

  )

}