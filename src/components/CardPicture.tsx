import { Center, Text } from '@mantine/core';
import { cardImageUrl, fallBackToPng } from '../utils/cardImage';
import { useLocalizationStore } from '../store/useLocalizationStore';

// A card's picture at card proportions. Cards from brand-new sets can arrive
// before TCGdex has their pictures, so those show a placeholder until the
// monthly card sync fills the picture in.
export function CardPicture({ cardImage, alt, width, radius = 8 }: { cardImage: string | null | undefined; alt: string; width: number | string; radius?: number }) {
  const t = useLocalizationStore((state) => state.t);
  const box = {
    display: 'block',
    flexShrink: 0,
    width,
    height: 'auto',
    aspectRatio: '245 / 337',
    background: 'var(--mantine-color-default-hover)',
    borderRadius: radius,
  } as const;

  if (!cardImage) {
    return (
      <Center style={box} p={4}>
        <Text size="xs" c="dimmed" ta="center">
          {t.noPictureYet}
        </Text>
      </Center>
    );
  }
  return (
    <img
      src={cardImageUrl(cardImage)}
      onError={fallBackToPng}
      loading="lazy"
      decoding="async"
      alt={alt}
      width={245}
      height={337}
      style={{ ...box, objectFit: 'contain' }}
    />
  );
}
