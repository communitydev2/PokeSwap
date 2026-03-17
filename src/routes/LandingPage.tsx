import { createFileRoute } from '@tanstack/react-router'
import { useEffect,useState } from 'react'
import { supabase } from '../supabaseClient'
import { Auth } from './Auth'
import {Account} from './Account'
import { useAuthStore } from '../store/userStore'
import { Username } from './UsernameDialog'
import { PokeList } from './pokeList/PokeList'
import { usePokemonCardStore } from '../store/pokemonCardsStore'
export const Route = createFileRoute('/LandingPage')({
  component: LandingPage,
})





export default function LandingPage() {
    const [session, setSession] = useState(null)
    const [userInfo,setUserInfo] = useState(null);
    const authStore = useAuthStore();
    const usePokeCardStore = usePokemonCardStore();

    
//  I'm going to the rarity and expansion variables in pokemondbstore
  useEffect(()=>{
    async function fetchRarityExpansionValues(){
      let {data: rarity, errorRarity} = await supabase
      .from('rarity')
      .select('*')

      let {data: set, errorSet} = await supabase
      .from('set')
      .select('*')
  
      usePokeCardStore.setSupabase_rarity(rarity)
      usePokeCardStore.setSupabase_expansion(set)
    }
    fetchRarityExpansionValues()
  },[])
    
    
    
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      authStore.setSession(session)
    })
    
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      authStore.setSession(session)
      // console.log(session)
    })


    return () => data.subscription.unsubscribe();
  }, [])


// setting PokemonCards at launch
    useEffect(()=>{
async function getCards(){

  let { data: card, error } = await supabase
  .from('card')
  .select('*')

  usePokeCardStore.setPokemonCards(card);
}
getCards()
  },[])

  return (
    <div className="container" style={{ padding: '50px 0 100px 0' }}>
      {/* {<PokeList/>} */}
      {/* Come back this when you want to debug username */}
      {/* {!session ? <Auth /> :  <Username/> } */}
      {!session ? <Auth /> : authStore.session && !authStore.user?.username ?  <Username/> : <Account key={session.user.id} session={session} />}
    </div>
  )
}
