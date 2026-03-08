import {create} from 'zustand';

import { UseLocalizationStoreType } from '../types/UseLocalizationStoreType';



export const useLocalizationStore =create<UseLocalizationStoreType>((set) => ({

  localizationArray : [
    "Add cards", // 0 -  Menu TItle
    "Select your Pocket Account", // 1 -  tcgAccountDropdown Title
    "Pick Value", // 2 -  tcgAccountDropdown placeholder
    "Add to Wishlist", // 3 - cardCategoryDropdown option
    "Add to Cards Available For Trade", // 4 -  cardCategoryDropdown option 2
    "Where are you adding these cards to", // 5 - cardCategoryDropdown Label
    "Pick the language you're looking for" , //   6 - language Dropdown Label
    "Select Pokemon Card's Rarity" , //   7 - Rarity Dropdown label
    "Search Pokemon Card By Name" , //   8 - Search Bar on Pokemon card input
    "Select Pokemon Card's Set" , //   9 -Set Dropdown label
    "" , //   10 -
    "" , //   11 -
    "" , //   12 -
    "" , //   13 -
    "" , //   14 -
    "" , //   15 -
    "" , //   16 -
    "" , //   17 -
    "" , //   18 -
    "" , //   19 -
    "" , //   20 -
    "" , //   21 -
    "" , //   22 -
    "" , //   23 -
    "" , //   24 -
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

