import { ANY_OPTION } from '../../constants'
import { Button, Group, Select, SimpleGrid, Stack, TextInput } from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import { useForm } from '@mantine/form';
import { useLocalizationStore } from '../../store/useLocalizationStore';
import { usePokemonCardStore } from '../../store/pokemonCardsStore';
import { useSearchFunction } from '../../utils/Utilfunctions';
import { useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { expansionOptions, rarityOptions } from '../../utils/searchOptions';
;

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
      const anyLabel = ANY_OPTION;
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

  // Clear the filters and show the full card list again
  function handleClear() {
    form.reset();
    usePokeCardStore.setPokemonCardsSearchQuery([]);
  }

  return (
    <form onSubmit={form.onSubmit(handleFormSubmit)}>
      <Stack gap="sm">
        <TextInput data-click-id="SearchBar/search-input"
          label={useLocStore.t.searchByName}
          placeholder={useLocStore.t.searchPlaceholder}
          leftSection={<IconSearch size={16} />}
          {...form.getInputProps('searchInput')}
        />
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
          <Select data-click-id="SearchBar/rarity-select"
            label={useLocStore.t.rarityLabel}
            data={rarityOptions(usePokeCardStore.supabase_rarity, usePokeCardStore.rarities)}
            allowDeselect={false}
            {...form.getInputProps('rarity')}
          />
          <Select data-click-id="SearchBar/expansion-select"
            label={useLocStore.t.setLabel}
            data={expansionOptions(usePokeCardStore.supabase_expansion, usePokeCardStore.expansions)}
            allowDeselect={false}
            searchable
            {...form.getInputProps('expansion')}
          />
        </SimpleGrid>
        <Group justify="flex-end" gap="sm">
          <Button data-click-id="SearchBar/clear" variant="default" onClick={handleClear}>{useLocStore.t.clearSearch}</Button>
          <Button data-click-id="SearchBar/submit" type="submit" leftSection={<IconSearch size={16} />}>{useLocStore.t.search}</Button>
        </Group>
      </Stack>
    </form>
  );
}
