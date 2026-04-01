export interface PokemonCard {
  _id: string;
  localId: string;
  newDisplayName: string;
  card_image: string;
  id: string;
  card_name: string;
  languageWanted : string;
  

  tradeUsers: {
    [userId: string]: {
      [languageCode: string]: number;
    };
  };

  availableCards: number;
}
