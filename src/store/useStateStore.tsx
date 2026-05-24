import {create} from 'zustand';
import { UseStateStoreType } from '../types/useStateStoreTYpe';


export const useStateStore =create<UseStateStoreType>((set) => ({
    showManageCardsMainMenu : null,
    showManageTCGAccountsMenu :null,
    showAddCardsMenu: null,
    showLanguageDropdown :true,
    manageCardsSelectedLanguage: "en",
    addingCardsSector : null,
    colorpalette: [
        '#000000' // color for "exclusive trade button"
    
    
    ],
    stateBooleanArray: [
        false, // 0 - isExclusiveTradeModalOn
    ],



    
    setShowManageCardsMainMenu: (showManageCardsMainMenu:boolean) => set(()=> ({showManageCardsMainMenu}) ),
    setShowManageTCGAccountsMenu: (showManageTCGAccountsMenu:boolean) => set(()=> ({showManageTCGAccountsMenu}) ),
    setShowAddCardsMenu: (showAddCardsMenu:boolean) => set(()=> ({showAddCardsMenu}) ),
    setShowLanguageDropdown: (showLanguageDropdown:boolean) => set(()=> ({showLanguageDropdown}) ),
    setManageCardsSelectedLanguage: (manageCardsSelectedLanguage:string) => set(()=> ({manageCardsSelectedLanguage}) ),
    setAddingCardsSector: (addingCardsSector:string) => set(()=> ({addingCardsSector}) ),
    setColorPalette : (colorpalette: string[]) => set(()=> ({colorpalette})),
    setStateBooleanArray : (stateBooleanArray : boolean[]) => set(()=> ({stateBooleanArray})),



    }))