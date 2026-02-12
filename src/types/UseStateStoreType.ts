

export interface UseStateStoreType {
    showManageCardsMainMenu: boolean |null,
    showManageTCGAccountsMenu : boolean | null,

    setShowManageCardsMainMenu: (showManageCardsMainMenu: boolean) => void;
     setShowManageTCGAccountsMenu : (showManageTCGAccountsMenu : boolean) => void;
}

