import {create} from 'zustand';

import { UseLocalizationStoreType } from '../types/UseLocalizationStoreType';



export const useLocalizationStore =create<UseLocalizationStoreType>((set) => ({

  localizationArray : [
    "Add cards", // 0 -  Menu TItle
    "Select your Pocket Account", // 1 -  tcgAccountDropdown Title
    "Pick Value", // 2 -  tcgAccountDropdown placeholder
    "Add to Wishlist", // 3 - cardCategoryDropdown option
    "Add to Cards You Have For Trade", // 4 -  cardCategoryDropdown option 2
    "Where are you adding these cards to", // 5 - cardCategoryDropdown Label
    "Pick the language you're looking for" , //   6 - language Dropdown Label
    "Select Pokemon Card's Rarity" , //   7 - Rarity Dropdown label
    "Search Pokemon Card By Name" , //   8 - Search Bar on Pokemon card input
    "Select Pokemon Card's Set" , //   9 -Set Dropdown label
    "Any" , //   10 - option condition for useSearchFunction in utils.tsx
    "Add to Selected" , //   11 - poke card add to selected
    "Remove from selected" , //   12 - poke card button
    "listAddCards" , //   13 - pokelist check
    "listSelectedSection" , //   14 - pokelist list type
    "Set up Exclusive Trade" , //   15 - button text
    "Manage Cards Main Menu" , //   16 - Manage Cards Main Menu Title 1
    "Add Cards Menu Exclusive Trade Version" , //   17 -
    "ExclusiveTrade" , //   18 - componentType variable called from PokeCard for to display ManageCardsMainMenu Component in Exclusive Trade mode
    "MainMenuDisplay" , //   19 -  componentType variable called from Account.tsx to display ManageCardsMainMenu Component in Default mode
    "Confirm Cards" , //   20 -Modal Button
    "Cards Selected" , //   21 - text
    "Quantity" , //   22 - PokeCard
    "Change Card" , //   23 - Confirm Cards Exclusive Trade
    "listExclusiveTrade" , //   24 - used for menu_confirm cards
    "" , //   25 -
    "" , //   26 -
    "" , //   27 -
    "" , //   28 -
    "" , //   29 -
    "" , //   30 -
    "" , //   31 -
    "" , //   32 -
    "" , //   33 -
    "" , //   34 -
    "" , //   35 -
    "" , //   36 -
    "" , //   37 -
    "" , //   38 -
    "" , //   39 -
    "" , //   40 -
    "" , //   41 -
    "" , //   42 -
    "" , //   43 -
    "" , //   44 -
    "" , //   45 -
    "" , //   46 -
    "" , //   47 -
    "" , //   48 -
    "" , //   49 -
    "" , //   50 -
    "" , //   51 -
    "" , //   52 -
    "" , //   53 -
    "" , //   54 -
    "" , //   55 -
    "" , //   56 -
    "" , //   57 -
    "" , //   58 -
    "" , //   59 -
    "" , //   60 -
    "" , //   61 -
    "" , //   62 -
    "" , //   63 -
    "" , //   64 -
    "" , //   65 -
    "" , //   66 -
    "" , //   67 -
    "" , //   68 -
    "" , //   69 -
    "" , //   70 -
    "" , //   71 -
    "" , //   72 -
    "" , //   73 -
    "" , //   74 -
    "" , //   75 -
    "" , //   76 -
    "" , //   77 -
    "" , //   78 -
    "" , //   79 -
    "" , //   80 -
    "" , //   81 -
    "" , //   82 -
    "" , //   83 -
    "" , //   84 -
    "" , //   85 -
    "" , //   86 -
    "" , //   87 -
    "" , //   88 -
    "" , //   89 -
    "" , //   90 -
    "" , //   91 -
    "" , //   92 -
    "" , //   93 -
    "" , //   94 -
    "" , //   95 -
    "" , //   96 -
    "" , //   97 -
    "" , //   98 -
    "" , //   99 -
    "" , //   100 -
    "" , //   101 -
    "" , //   102 -
    "" , //   103 -
    "" , //   104 -
    "" , //   105 -
    "" , //   106 -
    "" , //   107 -
    "" , //   108 -
    "" , //   109 -
    "" , //   110 -
    "" , //   111 -
    "" , //   112 -
    "" , //   113 -
    "" , //   114 -
    "" , //   115 -
    "" , //   116 -
    "" , //   117 -
    "" , //   118 -
    "" , //   119 -
    "" , //   120 -
    "" , //   121 -
    "" , //   122 -
    "" , //   123 -
    "" , //   124 -
    "" , //   125 -
    "" , //   126 -
    "" , //   127 -
    "" , //   128 -
    "" , //   129 -
    "" , //   130 -
    "" , //   131 -
    "" , //   132 -
    "" , //   133 -
    "" , //   134 -
  ],

  setLocalizationStrings: (localizationArray:string[]) => set(()=> ({localizationArray}) ),




  }))

