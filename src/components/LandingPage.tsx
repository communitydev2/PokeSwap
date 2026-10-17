import { useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { useStateStore } from '../store/useStateStore'
import { Auth } from './Auth'
import { HomeMarket } from './market/HomeMarket'
import {Account} from './Account'
import { useAuthStore } from '../store/userStore'
import { ChangeUsername } from './ChangeUsername/ChangeUsername'
import { useSavedAccountsStore } from '../store/savedAccountsStore'
import { Alert, Button, Center, Container, Loader, Stack } from '@mantine/core'
import { useLocalizationStore } from '../store/useLocalizationStore'
import { usePokemonCardStore } from '../store/pokemonCardsStore'
import { fetchAllRows } from '../utils/fetchAllRows'
import type { PokemonCard } from '../types/PokemonCard'





export default function LandingPage() {
    const showManageCardsMainMenu = useStateStore((s) => s.showManageCardsMainMenu)
    const session = useAuthStore((state) => state.session)
    const profileLoading = useAuthStore((state) => state.profileLoading)
    const addingAccount = useSavedAccountsStore((state) => state.addingAccount)
    const notice = useSavedAccountsStore((state) => state.notice)
    const setNotice = useSavedAccountsStore((state) => state.setNotice)
    const profileError = useAuthStore((state) => state.profileError)
    const t = useLocalizationStore((state) => state.t)
    const authStore = useAuthStore();
    const usePokeCardStore = usePokemonCardStore();

    
//  I'm going to the rarity and expansion variables in pokemondbstore
  useEffect(()=>{
    async function fetchRarityExpansionValues(){
      let {data: rarity, error: errorRarity} = await supabase
      .from('rarity')
      .select('*')

      let {data: set, error: errorSet} = await supabase
      .from('set')
      .select('*')
  
      if (errorRarity) console.warn(errorRarity)
      else usePokeCardStore.setSupabase_rarity(rarity ?? [])
      if (errorSet) console.warn(errorSet)
      else usePokeCardStore.setSupabase_expansion(set ?? [])
    }
    fetchRarityExpansionValues()
  },[])
    


    
    
  // The saved session is restored in __root.tsx and kept in authStore

// setting PokemonCards at launch
    useEffect(()=>{
async function getCards(){
  // The catalogue has more than Supabase's 1000-rows-per-request limit, so load it in pages
  try {
    const cards = await fetchAllRows<PokemonCard>('card', 'card_local_id')
    usePokeCardStore.setPokemonCards(cards)
  } catch (error) {
    console.warn(error)
  }
}
getCards()
  },[])


  return (
    <Container size={760} px="md">
      <Stack gap="xl">
      {/* {<PokeList/>} */}
      {/* Come back this when you want to debug username */}
      {/* {!session ? <Auth /> :  <Username/> } */}
      {notice && (

          <Alert data-click-id="LandingPage/notice" color="yellow" withCloseButton onClose={() => setNotice(null)}>
            {notice}
          </Alert>

      )}
      {!session || addingAccount ? (
        <Auth />
      ) : profileLoading ? (
        <Center py="xl"><Loader /></Center>
      ) : profileError ? (
        <Alert color="red">{t.qaProfileFailed}
          <Button data-click-id="LandingPage/retry-profile" onClick={() => window.location.reload()}>{t.qaRetry}</Button>
        </Alert>
      ) : !authStore.user?.username ? (
        <ChangeUsername key={session.user.id} mode="set" />
      ) : (
        <Account key={session.user.id} session={session} />
      )}
      {(!session || !showManageCardsMainMenu) && <HomeMarket />}
      </Stack>
    </Container>
  )
}
