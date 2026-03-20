import { Button, Group, Select, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { createFileRoute } from '@tanstack/react-router';
import { useLocalizationStore } from '../../store/useLocalizationStore';
import { usePokemonCardStore } from '../../store/pokemonCardsStore';
import { useSearchFunction } from '../../utils/Utilfunctions';

export const Route = createFileRoute('/reusableComponents/SearchBar')({
  component: SearchBar,
});

type SearchFormValues = {
  searchInput: string;
  rarity: string;
  expansion: string;
};

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

  const handleFormSubmit = (values: SearchFormValues) => {
    console.log(values)
    usePokeCardStore.setPokemonCardsSearchQuery(
      
      useSearchFunction(
        values.searchInput,
        usePokeCardStore,
        useLocStore,
        values.rarity,
        values.expansion
      )
    );
  };

  return (
    <Group>
      <form onSubmit={form.onSubmit(handleFormSubmit)}>
        <TextInput
          autoFocus
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
