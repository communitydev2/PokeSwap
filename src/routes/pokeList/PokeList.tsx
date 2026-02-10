import { createFileRoute } from '@tanstack/react-router'
import { supabase } from '../../supabaseClient'
import { useEffect,useState } from 'react'
export const Route = createFileRoute('/pokeList/PokeList')({
  component: PokeList,
})

export function PokeList() {
  const [loading, setLoading] = useState(true)

 useEffect(() => {
    async function getProfile() {
      setLoading(true)

      const { data, error } = await supabase
        .from('card')
        .select("*")


      // let { data, error } = await supabase
      //   .from('user_account')
      //   .select(`username`)
      //   .eq('user_id', user.id)
      //   .single()

      if (error) {
        console.warn(error)
      } else if (data) {
        console.log(data)
      }

      setLoading(false)
    }

    getProfile()
  }, [])



  return <div>Hello "/pokeList/PokeList"!</div>
}

