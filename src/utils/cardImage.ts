import type { SyntheticEvent } from 'react';

// Card pictures come from TCGdex (card_image is the base URL, e.g.
// https://assets.tcgdex.net/en/tcgp/A1/001). "low" WebP is ~15-25 KB versus
// ~60 KB for the PNG at the same size, which matters on slow phone connections.
export function cardImageUrl(cardImage: string, format: 'webp' | 'png' = 'webp', quality: 'low' | 'high' = 'low') {
  return `${cardImage}/${quality}.${format}`;
}

// If the WebP fails to load, try the PNG once
export function fallBackToPng(event: SyntheticEvent<HTMLImageElement>) {
  const img = event.currentTarget;
  if (/\/(low|high)\.webp$/.test(img.src)) img.src = img.src.replace(/\/(low|high)\.webp$/, '/$1.png');
}
