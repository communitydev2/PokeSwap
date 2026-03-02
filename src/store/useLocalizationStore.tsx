import {create} from 'zustand';

import { UseLocalizationStoreType } from '../types/UseLocalizationStoreType';



export const useLocalizationStore =create<UseLocalizationStoreType>((set) => ({

  localizationArray : [
    "Add cards", // Menu TItle
    "Select your Pocket Account", // tcgAccountDropdown Title
    "Pick Value", // tcgAccountDropdown placeholder
    "Add to Wishlist", // cardCategoryDropdown option
    "Add to Cards Available For Trade", // cardCategoryDropdown option 2
    
  ],

  setLocalizationStrings: (localizationArray:string[]) => set(()=> ({localizationArray}) ),




  }))

