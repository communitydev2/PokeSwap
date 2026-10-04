// English text for the app. To add a language, copy this file (e.g. es.ts),
// translate the values (keep the keys), and register it in ./index.ts.
export const en = {
  // Manage cards menu
  addCardsTitle: 'Add cards',
  selectPocketAccount: 'Select your Pocket Account',
  pickValue: 'Pick Value',
  addToWishlist: 'Add to Wishlist',
  addToTradeCards: 'Add to Cards You Have For Trade',
  whereAddingCards: 'Where are you adding these cards to',
  pickLanguage: "Pick the language you're looking for",
  manageCardsMainMenuTitle: 'Manage Cards Main Menu',
  addCardsExclusiveTradeTitle: 'Add Cards Menu Exclusive Trade Version',
  addCardsToLibrary: 'Add Cards to My Library',
  cardsSelected: 'Cards Selected',
  changeCard: 'Change Card',
  cardsAdded: 'Your Cards Have been added',

  // Search
  rarityLabel: "Select Pokemon Card's Rarity",
  searchByName: 'Search Pokemon Card By Name',
  setLabel: "Select Pokemon Card's Set",

  // Cards
  addToSelected: 'Add to Selected',
  removeFromSelected: 'Remove from selected',
  setUpExclusiveTrade: 'Set up Exclusive Trade',
  quantity: 'Quantity',

  // Sign in (email link or 6-digit code)
  signInEmailSent: (email: string) =>
    `We emailed a sign-in link and a code to ${email}. Open the link on this device, or type the code here.`,
  signInCodeLabel: 'Code from the email',
  signInCodePlaceholder: '123456',
  signInWithCode: 'Sign in with code',
  signInCodeInvalid: 'That code is wrong or has expired. Use the code from the newest email, or send a new one.',
  signInSendFailed: "Couldn't send the email. Please check the address and try again.",
  signInResend: 'Send a new email',
  signInUseDifferentEmail: 'Use a different email',
  linkExpired: 'That sign-in link has expired or was already used. Send a new one below, or use the code from the email.',
  linkFailed: "Signing in with that link didn't work. Please try again.",
};

export type Translations = typeof en;
