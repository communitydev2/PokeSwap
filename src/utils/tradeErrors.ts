import type { Translations } from '../i18n';

// Exception messages raised by the trade functions -> text shown to the player
export function tradeErrorText(t: Translations, message: string | undefined) {
  const known: Record<string, string> = {
    'You already sent this offer': t.tradesErrorAlreadySent,
    'The other player no longer has that card for trade': t.tradesErrorCardGone,
    'That card is not on your trade list': t.tradesErrorNotOnYourList,
    'You have 50 offers waiting for an answer. Cancel some before sending more': t.tradesErrorTooMany,
    'This offer has already been answered': t.tradesErrorAnswered,
    'This offer can no longer be cancelled': t.tradesErrorCantCancel,
    'You already sent an offer for this exclusive trade': t.exclusiveErrorAlreadySent,
    'This exclusive trade has ended': t.exclusiveErrorEnded,
    'That card is in one of your exclusive trades': t.exclusiveErrorYourCardExclusive,
    'That card only trades through its exclusive trade': t.exclusiveErrorTheirCardExclusive,
    'That card is not one they asked for': t.exclusiveErrorNotAsked,
    'The cards you want must be the same rarity as your card': t.exclusiveErrorRarity,
    'Cards of this rarity cannot be traded': t.exclusiveErrorNotTradable,
    'Pick between 1 and 50 cards': t.exclusiveErrorCount,
    'You cannot trade with your own account': t.tradesActionFailed,
    'Both cards must be the same rarity, and one the game lets you trade': t.tradesActionFailed,
  };
  return (message && known[message]) || t.tradesActionFailed;
}
