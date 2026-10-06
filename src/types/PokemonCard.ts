// A row of the `card` table, plus fields the app adds along the way
export interface PokemonCard {
  card_id: string;
  card_local_id: string; // e.g. "A1-096" (set code + card number)
  card_name: string;
  card_image: string | null; // TCGdex base URL; null until a picture exists
  rarity_id: string | null;
  set_id: string;
  reprint_of?: string | null; // card_local_id of the card whose artwork this re-uses
  variant?: string | null; // e.g. 'parallel_foil'

  // Included in search results (search_cards_filter)
  set_name?: string;
  rarity_name?: string;
  score?: number;

  // Set when the card is added to the selection
  language?: string | null;
  quantity?: number;
}
