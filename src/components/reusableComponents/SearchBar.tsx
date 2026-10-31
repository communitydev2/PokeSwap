import { ANY_OPTION, FLAIR_COLLECTIONS, type FlairCollectionId } from '../../constants'
import { cardLocalIdsInCollection } from '../../data/limitedFlairs';
import { Alert, Button, Group, Select, SimpleGrid, Stack, TextInput } from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import { useForm } from '@mantine/form';
import { useLocalizationStore } from '../../store/useLocalizationStore';
import { usePokemonCardStore } from '../../store/pokemonCardsStore';
import { useEffect, useRef, useState } from 'react';
import { fetchAllRpcRows } from '../../utils/fetchAllRpcRows';
import type { PokemonCard } from '../../types/PokemonCard';
import { expansionOptions, rarityOptions } from '../../utils/searchOptions';
;

type SearchFormValues = {
  searchInput: string;
  rarity: string;
  expansion: string;
  flair: string;
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
  const t = useLocalizationStore((s) => s.t);
  const usePokeCardStore = usePokemonCardStore();

  const request = useRef(0);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => { controller.current?.abort(); ++request.current; }, []);
  const [failed, setFailed] = useState(false);

  const form = useForm<SearchFormValues>({
    mode: 'controlled',
    initialValues: {
      searchInput: '',
      rarity: usePokeCardStore.rarities[0],
      expansion: usePokeCardStore.expansions[0],
      flair: ANY_OPTION,
    },
  });

  async function handleFormSubmit (values: SearchFormValues) {
     const seq = ++request.current;
     controller.current?.abort();
     controller.current = new AbortController();
     setFailed(false);
     try {
      const anyLabel = ANY_OPTION;
      // is it equal to any?
      const rarityParam =
        values.rarity.toLowerCase() === anyLabel.toLowerCase() ? 'any' : values.rarity;

      const setParam =
        values.expansion.toLowerCase() === anyLabel.toLowerCase() ? 'any' : values.expansion;

      const data = await fetchAllRpcRows<PokemonCard>('search_cards_filter', {
        p_search_string: values.searchInput,
        p_rarity: rarityParam,
        p_set: setParam,
      }, ['card_name', 'card_id'], controller.current.signal);

      if (seq !== request.current) return;

      // console.log('Search results:', data);


      const flairCards = values.flair === ANY_OPTION
        ? null
        : cardLocalIdsInCollection(values.flair as FlairCollectionId);
      usePokeCardStore.setPokemonCardsSearchQuery(
        flairCards ? (data ?? []).filter((card) => flairCards.has(card.card_local_id)) : (data ?? []),
      );
    } catch (error) {
      if (seq !== request.current) return;
      setFailed(true);
      console.error('Unexpected search error:', error);
    }
  };

  // Clear the filters and show the full card list again
  function handleClear() {
    ++request.current;
    controller.current?.abort();
    setFailed(false);
    form.reset();
    usePokemonCardStore.setState({ searchQuery: [], searchActive: false });
  }

  const flairOptions = [
    { value: ANY_OPTION, label: ANY_OPTION },
    ...Object.values(FLAIR_COLLECTIONS).map((id) => ({ value: id, label: t.flairCollectionNames[id] ?? id })),
  ];

  return (
    <form onSubmit={form.onSubmit(handleFormSubmit)}>
      <Stack gap="sm">
        {failed && <Alert color="red">{t.qaManageSearchFailed}</Alert>}
        <TextInput data-click-id="SearchBar/search-input"
          label={t.searchByName}
          placeholder={t.searchPlaceholder}
          leftSection={<IconSearch size={16} />}
          {...form.getInputProps('searchInput')}
        />
        <SimpleGrid cols={{ base: 1, xs: 2, md: 3 }} spacing="sm">
          <Select data-click-id="SearchBar/rarity-select"
            label={t.rarityLabel}
            data={rarityOptions(usePokeCardStore.supabase_rarity, usePokeCardStore.rarities)}
            searchable
            allowDeselect={false}
            renderOption={({ option }) => (
              <span data-click-id={`SearchBar/rarity-option:${option.value}`}>{option.label}</span>
            )}
            {...form.getInputProps('rarity')}
          />
          <Select data-click-id="SearchBar/expansion-select"
            label={t.setLabel}
            data={expansionOptions(usePokeCardStore.supabase_expansion, usePokeCardStore.expansions)}
            allowDeselect={false}
            searchable
            renderOption={({ option }) => (
              <span data-click-id={`SearchBar/expansion-option:${option.value}`}>{option.label}</span>
            )}
            {...form.getInputProps('expansion')}
          />
          <Select data-click-id="SearchBar/flair-select"
            label={t.flairFilterLabel}
            data={flairOptions}
            allowDeselect={false}
            renderOption={({ option }) => (
              <span data-click-id={`SearchBar/flair-option:${option.value}`}>{option.label}</span>
            )}
            {...form.getInputProps('flair')}
          />
        </SimpleGrid>
        <Group justify="flex-end" gap="sm">
          <Button flex={{ base: 1, xs: '0 0 auto' }} data-click-id="SearchBar/clear" variant="default" onClick={handleClear}>{t.clearSearch}</Button>
          <Button flex={{ base: 1, xs: '0 0 auto' }} data-click-id="SearchBar/submit" type="submit" leftSection={<IconSearch size={16} />}>{t.search}</Button>
        </Group>
      </Stack>
    </form>
  );
}
