// Internal identifiers used by the code. These are never shown to users and
// must never be translated - on-screen text lives in src/i18n.

// Which list a PokeList / PokeCard is rendering
export const LIST_TYPE = {
  add: 'listAddCards',
  selected: 'listSelectedSection',
  exclusiveTrade: 'listExclusiveTrade',
  confirmAdd: 'listConfirmAddCards',
} as const;

// Which mode ManageCardsMainMenu is shown in
export const MENU_MODE = {
  mainMenu: 'MainMenuDisplay',
  exclusiveTrade: 'ExclusiveTrade',
} as const;

// Where cards are being added (the "Where are you adding these cards to" dropdown)
export const CARD_CATEGORY = {
  wishlist: 'wishlist',
  trade: 'trade',
} as const;

// "No filter" option in the rarity / set dropdowns (also the first entry of those lists)
export const ANY_OPTION = 'Any';
