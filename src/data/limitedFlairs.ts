import { FLAIR_COLLECTIONS, type FlairCollectionId } from '../constants';

// Limited-time flairs from Pokémon TCG Pocket events. Card numbers, flair names,
// colours and dates come from Pokémon Zone (event and card pages). A flair belongs
// to one specific card (the Four Diamond ex from the event, never a reprint), so
// cards are matched by card_local_id. Pictures live in public/flairs/.
// Flair and event names are game names, like card names: they aren't translated.
export type FlairKind = 'battle' | 'cosmetic';

export type LimitedFlair = {
  id: string;
  collection: FlairCollectionId;
  cardLocalId: string;
  cardName: string;
  name: string;
  colour: string | null;
  kind: FlairKind;
  event: string;
  eventUrl: string;
  startsAt: string;
  endsAt: string;
  /** Square in-game flair icon, when one could be downloaded. */
  icon: string | null;
  /** Wide picture of the card with the flair on, when one was published. */
  preview: string | null;
};

export const LIMITED_FLAIRS: LimitedFlair[] = [
  {id: 'a1-041-circles', collection: FLAIR_COLLECTIONS.nicnickMassOutbreak, cardLocalId: 'A1-041', cardName: 'Arcanine ex', name: 'Circles', colour: 'Yellow', kind: 'battle', event: 'Fire-Type Mass Outbreak', eventUrl: 'https://www.pokemon-zone.com/events/fire-type-pokemon-mass-outbreak/', startsAt: '2024-11-22T06:00:00Z', endsAt: '2024-11-28T06:00:00Z', icon: '/flairs/a1-041-circles-icon.webp', preview: '/flairs/a1-041-circles-preview.png'},
  {id: 'a1-104-star-outlines', collection: FLAIR_COLLECTIONS.nicnickMassOutbreak, cardLocalId: 'A1-104', cardName: 'Zapdos ex', name: 'Star Outlines', colour: 'Yellow', kind: 'battle', event: 'Lightning-Type Mass Outbreak (December 2024)', eventUrl: 'https://www.pokemon-zone.com/events/lightning-type-pokemon-mass-outbreak/', startsAt: '2024-12-26T06:00:00Z', endsAt: '2025-01-01T06:00:00Z', icon: '/flairs/a1-104-star-outlines-icon.webp', preview: '/flairs/a1-104-star-outlines-preview.webp'},
  {id: 'a1a-032-circles', collection: FLAIR_COLLECTIONS.nicnickMassOutbreak, cardLocalId: 'A1a-032', cardName: 'Mew ex', name: 'Circles', colour: 'Light blue', kind: 'battle', event: 'Psychic-Type Mass Outbreak', eventUrl: 'https://www.pokemon-zone.com/events/psychic-type-pokemon-mass-outbreak/', startsAt: '2025-01-23T06:00:00Z', endsAt: '2025-01-29T06:00:00Z', icon: '/flairs/a1a-032-circles-icon.webp', preview: '/flairs/a1a-032-circles-preview.webp'},
  {id: 'a2-099-bursts', collection: FLAIR_COLLECTIONS.nicnickMassOutbreak, cardLocalId: 'A2-099', cardName: 'Weavile ex', name: 'Bursts', colour: 'Purple', kind: 'cosmetic', event: 'Darkness-Type Mass Outbreak', eventUrl: 'https://www.pokemon-zone.com/events/darkness-type-pokemon-mass-outbreak/', startsAt: '2025-02-21T06:00:00Z', endsAt: '2025-02-27T06:00:00Z', icon: null, preview: '/flairs/a2-099-bursts-preview.png'},
  {id: 'a2a-010-petals', collection: FLAIR_COLLECTIONS.nicnickMassOutbreak, cardLocalId: 'A2a-010', cardName: 'Leafeon ex', name: 'Petals', colour: 'White', kind: 'battle', event: 'Grass-Type Mass Outbreak', eventUrl: 'https://www.pokemon-zone.com/events/grass-type-pokemon-mass-outbreak-event/', startsAt: '2025-03-24T06:00:00Z', endsAt: '2025-03-30T06:00:00Z', icon: null, preview: '/flairs/a2a-010-petals-preview.webp'},
  {id: 'a2b-043-tiny-twinkles', collection: FLAIR_COLLECTIONS.nicnickMassOutbreak, cardLocalId: 'A2b-043', cardName: 'Lucario ex', name: 'Tiny Twinkles', colour: 'Blue', kind: 'battle', event: 'Fighting-Type Mass Outbreak', eventUrl: 'https://www.pokemon-zone.com/events/fighting-type-pokemon-mass-outbreak-event/', startsAt: '2025-04-28T06:00:00Z', endsAt: '2025-05-04T06:00:00Z', icon: null, preview: '/flairs/a2b-043-tiny-twinkles-preview.webp'},
  {id: 'a3-122-sunshine-sparkles', collection: FLAIR_COLLECTIONS.nicnickMassOutbreak, cardLocalId: 'A3-122', cardName: 'Solgaleo ex', name: 'Sunshine Sparkles', colour: 'Yellow', kind: 'battle', event: 'Metal-Type Mass Outbreak', eventUrl: 'https://www.pokemon-zone.com/events/metal-type-pokemon-mass-outbreak-event/', startsAt: '2025-05-27T06:00:00Z', endsAt: '2025-06-02T06:00:00Z', icon: '/flairs/a3-122-sunshine-sparkles-icon.webp', preview: '/flairs/a3-122-sunshine-sparkles-preview.webp'},
  {id: 'a3a-006-bursts', collection: FLAIR_COLLECTIONS.nicnickMassOutbreak, cardLocalId: 'A3a-006', cardName: 'Buzzwole ex', name: 'Bursts', colour: 'Orange', kind: 'cosmetic', event: 'Ultra Beast Mass Outbreak', eventUrl: 'https://www.pokemon-zone.com/events/ultra-beast-mass-outbreak-event/', startsAt: '2025-06-23T06:00:00Z', endsAt: '2025-06-29T06:00:00Z', icon: '/flairs/a3a-006-bursts-icon.webp', preview: '/flairs/a3a-006-bursts-preview.webp'},
  {id: 'a3a-043-bursts', collection: FLAIR_COLLECTIONS.nicnickMassOutbreak, cardLocalId: 'A3a-043', cardName: 'Guzzlord ex', name: 'Bursts', colour: 'Blue', kind: 'cosmetic', event: 'Ultra Beast Mass Outbreak', eventUrl: 'https://www.pokemon-zone.com/events/ultra-beast-mass-outbreak-event/', startsAt: '2025-06-23T06:00:00Z', endsAt: '2025-06-29T06:00:00Z', icon: null, preview: '/flairs/a3a-043-bursts-preview.webp'},
  {id: 'a3b-056-heart-outlines', collection: FLAIR_COLLECTIONS.nicnickMassOutbreak, cardLocalId: 'A3b-056', cardName: 'Eevee ex', name: 'Heart Outlines', colour: 'Pink', kind: 'battle', event: 'Eevee Mass Outbreak', eventUrl: 'https://www.pokemon-zone.com/events/eevee-mass-outbreak-event/', startsAt: '2025-07-21T06:00:00Z', endsAt: '2025-07-30T06:00:00Z', icon: '/flairs/a3b-056-heart-outlines-icon.webp', preview: '/flairs/a3b-056-heart-outlines-preview.webp'},
  {id: 'a3b-009-flame-trail', collection: FLAIR_COLLECTIONS.nicnickMassOutbreak, cardLocalId: 'A3b-009', cardName: 'Flareon ex', name: 'Flame Trail', colour: 'Orange', kind: 'cosmetic', event: 'Eevee Mass Outbreak', eventUrl: 'https://www.pokemon-zone.com/events/eevee-mass-outbreak-event/', startsAt: '2025-07-21T06:00:00Z', endsAt: '2025-07-30T06:00:00Z', icon: '/flairs/a3b-009-flame-trail-icon.webp', preview: null},
  {id: 'a2a-022-snowflakes', collection: FLAIR_COLLECTIONS.nicnickMassOutbreak, cardLocalId: 'A2a-022', cardName: 'Glaceon ex', name: 'Snowflakes', colour: null, kind: 'cosmetic', event: 'Eevee Mass Outbreak', eventUrl: 'https://www.pokemon-zone.com/events/eevee-mass-outbreak-event/', startsAt: '2025-07-21T06:00:00Z', endsAt: '2025-07-30T06:00:00Z', icon: '/flairs/a2a-022-snowflakes-icon.webp', preview: null},
  {id: 'a2a-010-sword-flash', collection: FLAIR_COLLECTIONS.nicnickMassOutbreak, cardLocalId: 'A2a-010', cardName: 'Leafeon ex', name: 'Sword Flash', colour: 'Green', kind: 'battle', event: 'Eevee Mass Outbreak', eventUrl: 'https://www.pokemon-zone.com/events/eevee-mass-outbreak-event/', startsAt: '2025-07-21T06:00:00Z', endsAt: '2025-07-30T06:00:00Z', icon: null, preview: null},
  {id: 'a3b-034-small-hearts', collection: FLAIR_COLLECTIONS.nicnickMassOutbreak, cardLocalId: 'A3b-034', cardName: 'Sylveon ex', name: 'Small Hearts', colour: 'Pink', kind: 'cosmetic', event: 'Eevee Mass Outbreak', eventUrl: 'https://www.pokemon-zone.com/events/eevee-mass-outbreak-event/', startsAt: '2025-07-21T06:00:00Z', endsAt: '2025-07-30T06:00:00Z', icon: '/flairs/a3b-034-small-hearts-icon.webp', preview: '/flairs/a3b-034-small-hearts-preview.webp'},
  {id: 'a4-065-glowing-ring', collection: FLAIR_COLLECTIONS.nicnickMassOutbreak, cardLocalId: 'A4-065', cardName: 'Lanturn ex', name: 'Glowing Ring', colour: 'Yellow', kind: 'battle', event: 'Lightning-Type Mass Outbreak (August 2025)', eventUrl: 'https://www.pokemon-zone.com/events/lightning-type-pokemon-mass-outbreak-event-2/', startsAt: '2025-08-25T06:00:00Z', endsAt: '2025-08-31T06:00:00Z', icon: '/flairs/a4-065-glowing-ring-icon.webp', preview: null},
  {id: 'a3a-019-lightning-surge', collection: FLAIR_COLLECTIONS.nicnickMassOutbreak, cardLocalId: 'A3a-019', cardName: 'Tapu Koko ex', name: 'Lightning Surge', colour: 'Yellow', kind: 'cosmetic', event: 'Lightning-Type Mass Outbreak (August 2025)', eventUrl: 'https://www.pokemon-zone.com/events/lightning-type-pokemon-mass-outbreak-event-2/', startsAt: '2025-08-25T06:00:00Z', endsAt: '2025-08-31T06:00:00Z', icon: null, preview: null},
  {id: 'a3b-024-ripples', collection: FLAIR_COLLECTIONS.nicnickMassOutbreak, cardLocalId: 'A3b-024', cardName: 'Primarina ex', name: 'Ripples', colour: 'Light blue', kind: 'cosmetic', event: 'Water-Type Mass Outbreak', eventUrl: 'https://www.pokemon-zone.com/events/water-type-pokemon-mass-outbreak-event/', startsAt: '2025-09-25T06:00:00Z', endsAt: '2025-10-01T06:00:00Z', icon: '/flairs/a3b-024-ripples-icon.webp', preview: null},
  {id: 'a4a-020-sunshine-sparkles', collection: FLAIR_COLLECTIONS.nicnickMassOutbreak, cardLocalId: 'A4a-020', cardName: 'Suicune ex', name: 'Sunshine Sparkles', colour: 'Light blue', kind: 'battle', event: 'Water-Type Mass Outbreak', eventUrl: 'https://www.pokemon-zone.com/events/water-type-pokemon-mass-outbreak-event/', startsAt: '2025-09-25T06:00:00Z', endsAt: '2025-10-01T06:00:00Z', icon: '/flairs/a4a-020-sunshine-sparkles-icon.webp', preview: null},
];

const byCard = new Map<string, LimitedFlair[]>();
for (const flair of LIMITED_FLAIRS) byCard.set(flair.cardLocalId, [...(byCard.get(flair.cardLocalId) ?? []), flair]);

export function flairsForCard(cardLocalId: string | null | undefined): LimitedFlair[] {
  return (cardLocalId && byCard.get(cardLocalId)) || [];
}

export function cardLocalIdsInCollection(collection: FlairCollectionId): Set<string> {
  return new Set(LIMITED_FLAIRS.filter((flair) => flair.collection === collection).map((flair) => flair.cardLocalId));
}
