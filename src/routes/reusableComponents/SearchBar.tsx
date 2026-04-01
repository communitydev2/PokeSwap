import { Button, Group, Select, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { createFileRoute } from '@tanstack/react-router';
import { useLocalizationStore } from '../../store/useLocalizationStore';
import { usePokemonCardStore } from '../../store/pokemonCardsStore';
import { useSearchFunction } from '../../utils/Utilfunctions';
import { useEffect } from 'react';
import { supabase } from '../../supabaseClient';
export const Route = createFileRoute('/reusableComponents/SearchBar')({
  component: SearchBar,
});

type SearchFormValues = {
  searchInput: string;
  rarity: string;
  expansion: string;
};
// select * from "card" where card_name ILIKE 'Bul%' 
// select a card from table where:

// query matches first letter
// query matches rarity
// query matches expansion

//   useEffect(()=>{
//      async function getSearchResults(){
//       let {data: cardQuery, errorCardQuery} = await supabase
//         .select("*")
//         .from("card c")
//         .join(LATERAL unnest(string_to_array('mega altaria', ' ')) AS words(word))

// ON btrim(words.word) <> ''

// WHERE c.card_name ILIKE '' || btrim(words.word) || '%';

//      }
//      getSearchResults()

//   },[])



export default function SearchBar() {
  const useLocStore = useLocalizationStore();
  const usePokeCardStore = usePokemonCardStore();

  const form = useForm<SearchFormValues>({
    mode: 'controlled',
    initialValues: {
      searchInput: '',
      rarity: usePokeCardStore.rarities[0],
      expansion: usePokeCardStore.expansions[0],
    },
  });

  async function handleFormSubmit (values: SearchFormValues) {
     try {
      const anyLabel = useLocStore.localizationArray[10];
      // is it equal to any?
      const rarityParam =
        values.rarity.toLowerCase() === anyLabel.toLowerCase() ? 'any' : values.rarity;

      const setParam =
        values.expansion.toLowerCase() === anyLabel.toLowerCase() ? 'any' : values.expansion;

      const { data, error } = await supabase.rpc('search_cards_filter', {
        p_search_string: values.searchInput,
        p_rarity: rarityParam,
        p_set: setParam,
      });

      if (error) {
        console.error('Supabase search error:', error);
        return;
      }

      // console.log('Search results:', data);
      usePokeCardStore.setPokemonCardsSearchQuery(data);

      usePokeCardStore.setPokemonCardsSearchQuery(data ?? []);
    } catch (error) {
      console.error('Unexpected search error:', error);
    }
  };

  return (
    <Group>
      <form onSubmit={form.onSubmit(handleFormSubmit)}>
        <TextInput
          label={useLocStore.localizationArray[8]}
          {...form.getInputProps('searchInput')}
        />

        <Select
          label={useLocStore.localizationArray[7]}
          data={usePokeCardStore.rarities}
          {...form.getInputProps('rarity')}
        />

        <Select
          label={useLocStore.localizationArray[9]}
          data={usePokeCardStore.expansions}
          {...form.getInputProps('expansion')}
        />

        <Button type="submit">Submit</Button>
      </form>
    </Group>
  );
}
