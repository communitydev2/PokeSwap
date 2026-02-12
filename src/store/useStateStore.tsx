import {create} from 'zustand';
import { UseStateStoreType } from '../types/useStateStoreTYpe';


export const useStateStore =create<UseStateStoreType>((set) => ({
    showManageCardsMainMenu : null,
    showManageTCGAccountsMenu :null,

    setShowManageCardsMainMenu: (showManageCardsMainMenu:boolean) => set(()=> ({showManageCardsMainMenu}) ),
    setShowManageTCGAccountsMenu: (showManageTCGAccountsMenu:boolean) => set(()=> ({showManageTCGAccountsMenu}) ),



    }))