import type { SyntheticEvent } from 'react';

// Card pictures come from TCGdex (card_image is the base URL, e.g.
// https://assets.tcgdex.net/en/tcgp/A1/001). "low" WebP is ~15-25 KB versus
// ~60 KB for the PNG at the same size, which matters on slow phone connections.
export function cardImageUrl(cardImage: string, format: 'webp' | 'png' = 'webp') {
  return `${cardImage}/low.${format}`;
}

// If the WebP fails to load, try the PNG once
export function fallBackToPng(event: SyntheticEvent<HTMLImageElement>) {
  const img = event.currentTarget;
  if (img.src.endsWith('/low.webp')) img.src = img.src.replace(/\/low\.webp$/, '/low.png');
}
