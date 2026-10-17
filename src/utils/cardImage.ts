import type { SyntheticEvent } from 'react';
import { supabaseUrl } from '../supabaseClient';

// Card pictures use TCGdex base URLs or portable storage:dataset references.
// Development can load mirrored WebPs from Supabase Storage, falling back to
// TCGdex WebP and then PNG. Low WebP keeps list pictures small on phones.
export function cardImageUrl(cardImage: string, format: 'webp' | 'png' = 'webp', quality: 'low' | 'high' = 'low') {
  if (cardImage.startsWith('storage:')) {
    return `${supabaseUrl}/storage/v1/object/public/card-images/${cardImage.slice('storage:'.length)}/${quality}.webp`;
  }
  if (import.meta.env.VITE_CARD_IMAGES_FROM_STORAGE === 'true' && format === 'webp' && cardImage.startsWith('https://assets.tcgdex.net/')) {
    const path = cardImage.slice('https://assets.tcgdex.net/'.length);
    return `${supabaseUrl}/storage/v1/object/public/card-images/${path}/${quality}.webp`;
  }
  return `${cardImage}/${quality}.${format}`;
}

// Each URL has at most one successor; PNG and unknown URLs are terminal.
export function nextCardImageUrl(currentUrl: string, initialUrl: string, tcgdexWebp: string): string | undefined {
  if (tcgdexWebp.startsWith('storage:')) return undefined;
  if (currentUrl === tcgdexWebp) return tcgdexWebp.replace(/\/(low|high)\.webp$/, '/$1.png');
  if (currentUrl === initialUrl && initialUrl !== tcgdexWebp) return tcgdexWebp;
  return undefined;
}

export function fallBackToPng(event: SyntheticEvent<HTMLImageElement>, cardImage: string, quality: 'low' | 'high' = 'low') {
  if (cardImage.startsWith('storage:')) return;
  const img = event.currentTarget;
  const next = nextCardImageUrl(img.src, cardImageUrl(cardImage, 'webp', quality), `${cardImage}/${quality}.webp`);
  if (next && next !== img.src) img.src = next;
}
