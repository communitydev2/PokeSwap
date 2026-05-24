

export interface UseStateStoreType {
    showManageCardsMainMenu: boolean |null,
    showManageTCGAccountsMenu : boolean | null,
    showAddCardsMenu : boolean| null,
    showLanguageDropdown : boolean | null,
    manageCardsSelectedLanguage : string | null,
    addingCardsSector : string | null, // this variable is receiving and storing the switch umm option in the managed cards main menu Between adding to Wish List and adding to cards for Trade
    colorpalette : string[] | null,
    stateBooleanArray : boolean[] | null,




    setShowManageCardsMainMenu: (showManageCardsMainMenu: boolean) => void;
     setShowManageTCGAccountsMenu : (showManageTCGAccountsMenu : boolean) => void;
     setShowAddCardsMenu : (showAddCardsMenu : boolean) => void;
     setShowLanguageDropdown: (showLanguageDropdown : boolean) => void;
     setManageCardsSelectedLanguage: (manageCardsSelectedLanguage : string) => void;
     setAddingCardsSector: (addingCardsSector : string) => void;
     setColorPalette: (colorpalette : string[]) => void;
     setStateBooleanArray: (stateBooleanArray : boolean[]) => void;


}

