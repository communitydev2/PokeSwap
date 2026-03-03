export interface PokemonCard {
  _id: string;
  localId: string;
  newDisplayName: string;
  image: string;
  id: string;
  name: string;

  tradeUsers: {
    [userId: string]: {
      [languageCode: string]: number;
    };
  };

  availableCards: number;
}
