import { TextInput,Select,Group } from '@mantine/core';
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react';
import { useLocalizationStore } from '../../store/uselocalizationStore';
import { usePokemonCardStore } from '../../store/pokemonCardsStore';
export const Route = createFileRoute('/reusableComponents/SearchBar')({
  component: SearchBar,
})

export default function SearchBar() {
  const useLocStore = useLocalizationStore();
  const usePokeCardStore = usePokemonCardStore();
  
const [input_searchValue,setInput_searchValue] = useState('');


// rarity dropdown
const [combo_rarityValue,setCombo_rarityValue] = useState<string | null>(usePokeCardStore.rarities[0]);

// set dropdown
const [combo_setChoiceValue,setCombo_setChoiceValue] = useState<string | null>(usePokeCardStore.rarities[0]);



 function SearchSelectionDropdown() {
  
    return (
      <TextInput
        label={useLocStore.localizationArray[8]}
        placeholder={useLocStore.localizationArray[8]}
        value={input_searchValue}
        onChange={(e)=> setInput_searchValue(event?.currentTarget.value)}
      />
    );
  }
 function RaritySelectionDropdown() {
  
    return (
      <Select
        label={useLocStore.localizationArray[7]}
        data={usePokeCardStore.rarities}
        value={combo_rarityValue}
        onChange={setCombo_rarityValue}
      />
    );
  }
 function SetSelectionDropdown() {
  
    return (
      <Select
        label={useLocStore.localizationArray[9]}
        data={usePokeCardStore.expansions}
        value={combo_setChoiceValue}
        onChange={setCombo_setChoiceValue}
      />
    );
  }


  return(

    <>
    <Group>

    <SearchSelectionDropdown/>
    <RaritySelectionDropdown/>
    <SetSelectionDropdown/>
    </Group>
    
    </>



  )
}
