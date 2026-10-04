import { createFileRoute } from '@tanstack/react-router'
import { useEffect,useEffectEvent,useState } from 'react'
import { supabase } from '../supabaseClient'
import { Auth } from './Auth'
import {Account} from './Account'
import { useAuthStore } from '../store/userStore'
import { ChangeUsername } from '../components/ChangeUsername/ChangeUsername'
import { useSavedAccountsStore } from '../store/savedAccountsStore'
import { Alert, Center, Container, Loader } from '@mantine/core'
import { PokeList } from './pokeList/PokeList'
import { usePokemonCardStore } from '../store/pokemonCardsStore'
export const Route = createFileRoute('/LandingPage')({
  component: LandingPage,
})





export default function LandingPage() {
    const session = useAuthStore((state) => state.session)
    const profileLoading = useAuthStore((state) => state.profileLoading)
    const addingAccount = useSavedAccountsStore((state) => state.addingAccount)
    const notice = useSavedAccountsStore((state) => state.notice)
    const setNotice = useSavedAccountsStore((state) => state.setNotice)
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
    


    
    
  // The saved session is restored in __root.tsx and kept in authStore

// setting PokemonCards at launch
    useEffect(()=>{
async function getCards(){

  let { data: card, error } = await supabase
  .from('card')
  .select('*')
  usePokeCardStore.setPokemonCards(card)
  // console.log(card)
}
getCards()
  },[])


  return (
    <div className="container" style={{ padding: '50px 0 100px 0' }}>
      {/* {<PokeList/>} */}
      {/* Come back this when you want to debug username */}
      {/* {!session ? <Auth /> :  <Username/> } */}
      {notice && (
        <Container size={420}>
          <Alert data-click-id="LandingPage/notice" color="yellow" withCloseButton onClose={() => setNotice(null)} mb="md">
            {notice}
          </Alert>
        </Container>
      )}
      {!session || addingAccount ? (
        <Auth />
      ) : profileLoading ? (
        <Center py="xl"><Loader /></Center>
      ) : !authStore.user?.username ? (
        <ChangeUsername mode="set" />
      ) : (
        <Account key={session.user.id} session={session} />
      )}
    </div>
  )
}
