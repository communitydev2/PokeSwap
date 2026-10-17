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

// Tabs in the home page market
export const MARKET_TAB = { cards: 'cards', exclusive: 'exclusive' } as const;

export const ADMIN_TAB = { overview: 'overview', signIns: 'sign-ins', users: 'users', trades: 'trades', moderation: 'moderation', cardSync: 'card-sync', activity: 'activity' } as const;

// Enable once payments and the support database are set up.
export const SUPPORT_PAGE_ENABLED = false;

// Pause new-expansion banners while keeping automatic Updates articles.
export const NEW_SET_BANNER_ENABLED = false;
