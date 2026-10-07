// English text for the app. To add a language, copy this file (e.g. es.ts),
// translate the values (keep the keys), and register it in ./index.ts.
export const en = {
  // Header
  switchToLight: 'Switch to light mode',
  switchToDark: 'Switch to dark mode',

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
  manageWhereSection: 'Where are these cards going?',
  manageFindSection: 'Find cards',
  selectCardsToAdd: 'Select cards to add',
  confirmChange: 'I want to change.',
  confirmAddCards: 'Confirm',
  noCardsSelected: 'No cards selected yet.',
  selectedCardsSummary: (different: number, total: number) =>
    `${different} ${different === 1 ? 'card' : 'different cards'} · ${total} in total`,
  cardsSavedToWishlist: (total: number, account: string) =>
    `${total} ${total === 1 ? 'card was' : 'cards were'} added to the wishlist of ${account}.`,
  cardsSavedForTrade: (total: number, account: string) =>
    `${total} ${total === 1 ? 'card was' : 'cards were'} added to the cards ${account} has for trade.`,
  cardsSaveFailed: "Couldn't add your cards. Nothing was saved, so please try again.",
  cardsSaveNoAccount: 'Choose a Pocket account first.',
  seeMyCards: 'See my cards',

  // My cards (saved wishlist and trade cards)
  myCards: 'My cards',
  myCardsBack: 'Back',
  myCardsLookingFor: 'Looking for',
  myCardsForTrade: 'I have for trade',
  myCardsWishlistEmpty: "Your wishlist is empty. Use Add Cards to add the cards you're looking for.",
  myCardsTradeEmpty: 'You have no cards for trade yet. Use Add Cards to add the cards you have.',
  myCardsLoadFailed: "Couldn't load your cards. Please try again.",
  myCardsSaveFailed: "Couldn't save that change, so it was undone. Please try again.",
  myCardsRemove: 'Remove',
  myCardsRemoveConfirm: 'Remove this card from the list?',
  cancel: 'Cancel',
  dismiss: 'Dismiss',

  // Search
  rarityLabel: "Select Pokemon Card's Rarity",
  searchByName: 'Search Pokemon Card By Name',
  setLabel: "Select Pokemon Card's Set",
  searchPlaceholder: 'e.g. Pikachu ex',
  search: 'Search',
  clearSearch: 'Clear',

  // Cards
  addToSelected: 'Add to Selected',
  removeFromSelected: 'Remove from selected',
  setUpExclusiveTrade: 'Set up Exclusive Trade',
  quantity: 'Quantity',
  noPictureYet: 'Picture coming soon',
  parallelFoil: 'Parallel Foil',
  reprintOf: (original: string) => `Reprint of ${original}`,
  increaseQuantity: 'Increase quantity',
  decreaseQuantity: 'Decrease quantity',
  chooseQuantityFirst: 'Choose a quantity first',
  previousPage: 'Previous',
  nextPage: 'Next',

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
  signInHaveCode: 'I already have a code',
  signInEnterEmailFirst: 'Enter your email first, then the code.',
  linkExpired: 'That sign-in link has expired or was already used. Send a new one below, or use the code from the email.',
  linkFailed: "Signing in with that link didn't work. Please try again.",

  // New expansion banner
  newSetBanner: (name: string, count: number) => `New expansion: ${name} (${count} cards) is now available.`,
  newSetsBanner: (count: number, names: string) => `${count} new expansions are now available: ${names}.`,
  newSetArticleTitle: (name: string) => `New expansion: ${name}`,
  newSetArticleSummary: (name: string, count: number) => `${count} cards from ${name} have been added.`,
  newSetArticleBody: 'Search for them by name, or pick the set in the search filters, and add them to your library or wishlist.',

  // Support page
  supportNav: 'Support',
  supportTitle: 'Support the site',
  supportIntro:
    'Poke app is free to use. Contributions pay for the server and sign-in emails, and fund upgrades that make it better for everyone.',
  supportThisMonth: 'This month',
  supportRaisedOf: (raised: string, target: string) => `${raised} of ${target}`,
  supportGoalReached: 'Goal reached, thank you!',
  supportMonthlyResets: 'Resets at the start of each month.',
  supportWhereMoneyGoes: 'Where the money goes',
  supportUpgrades: 'Upgrades',
  supportContributeTitle: 'Contribute',
  supportMonthly: 'Monthly',
  supportOneOff: 'One-off',
  supportOtherAmount: 'Other amount (£)',
  supportAmountLimits: 'Between £1 and £500',
  supportPutTowards: 'Put it towards',
  supportMonthlyCostsOption: "This month's running costs",
  supportContinue: (amount: string, monthly: boolean) => (monthly ? `Support with ${amount} a month` : `Give ${amount}`),
  supportSecureNote: "You'll finish on Stripe's secure payment page. We never see your card details.",
  supportSignInNote: "Sign in first if you'd like a supporter badge and a place in the thank-you list.",
  supportShowMe: 'Show my username in the thank-you list',
  supportThanksTitle: 'Thank you for your support!',
  supportThanksBody: 'Your contribution will show up in the bars in a moment.',
  supportThankYouList: 'Thank you to our supporters',
  supportNoSupportersYet: 'Be the first name on this list!',
  supportManage: 'Manage or cancel your monthly support',
  supportNotSetUp: "The support page isn't set up yet.",
  supportStartFailed: "Couldn't start the payment. Please try again.",
  supporterBadge: 'Supporter',
};

export type Translations = typeof en;
