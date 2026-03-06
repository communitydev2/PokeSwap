

export interface UseStateStoreType {
    showManageCardsMainMenu: boolean |null,
    showManageTCGAccountsMenu : boolean | null,
    showAddCardsMenu : boolean| null,
    showLanguageDropdown : boolean | null,




    setShowManageCardsMainMenu: (showManageCardsMainMenu: boolean) => void;
     setShowManageTCGAccountsMenu : (showManageTCGAccountsMenu : boolean) => void;
     setShowAddCardsMenu : (showAddCardsMenu : boolean) => void;
     setShowLanguageDropdown: (showLanguageDropdown : boolean) => void;

}

