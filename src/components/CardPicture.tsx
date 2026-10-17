import { useState } from 'react';
import { Center, Modal, Text } from '@mantine/core';
import { cardImageUrl, fallBackToPng } from '../utils/cardImage';
import { useLocalizationStore } from '../store/useLocalizationStore';

// A card's picture at card proportions. Cards from brand-new sets can arrive
// before either source has their pictures, so those show a placeholder until
// the monthly card sync fills the picture in.
export function CardPicture({ cardImage, alt, width, radius = 8, zoom = true }: { cardImage: string | null | undefined; alt: string; width: number | string; radius?: number; zoom?: boolean }) {
  const t = useLocalizationStore((state) => state.t);
  const [opened, setOpened] = useState(false);
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
  // Zoom pictures without triggering the clickable row around them.
  const key = cardImage.split('/').slice(-2).join('/');
  const picture = (
    <img
      role={zoom ? 'button' : undefined}
      tabIndex={zoom ? 0 : undefined}
      aria-label={zoom ? t.zoomCard(alt) : undefined}
      data-click-id={zoom ? `CardPicture/zoom:${key}` : undefined}
      onClick={zoom ? (event) => {
        event.stopPropagation();
        event.preventDefault();
        setOpened(true);
      } : undefined}
      onKeyDown={zoom ? (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.stopPropagation();
          event.preventDefault();
          setOpened(true);
        }
      } : undefined}
      src={cardImageUrl(cardImage)}
      onError={(event) => fallBackToPng(event, cardImage)}
      loading="lazy"
      decoding="async"
      alt={alt}
      width={245}
      height={337}
      style={{ ...box, objectFit: 'contain', ...(zoom ? { cursor: 'zoom-in' } : {}) }}
    />
  );
  if (!zoom) return picture;

  return (
    <>
      {picture}
      {/* Escape closes only the zoom: Mantine closes every open modal on Escape unless the
          focused element has data-mantine-stop-propagation, so the zoom handles Escape itself */}
      <div
        style={{ display: 'contents' }}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          event.stopPropagation();
          if (event.key === 'Escape') setOpened(false);
        }}
      >
        <Modal.Root opened={opened} onClose={() => setOpened(false)} centered size="auto" closeOnEscape={false}>
          <Modal.Overlay />
          <Modal.Content data-mantine-stop-propagation="true">
            <Modal.Header>
              <Modal.Title>{alt}</Modal.Title>
              <Modal.CloseButton data-click-id="CardPicture/zoom-close" data-mantine-stop-propagation="true" aria-label={t.close} />
            </Modal.Header>
            <Modal.Body p="sm" pt={0}>
              {opened && <img
                src={cardImageUrl(cardImage, 'webp', 'high')}
                onError={(event) => fallBackToPng(event, cardImage, 'high')}
                alt={alt}
                width={245}
                height={337}
                style={{ display: 'block', width: 'min(85vw, 420px)', height: 'auto', aspectRatio: '245 / 337', borderRadius: 12, objectFit: 'contain' }}
                data-click-id="CardPicture/zoom-image"
                onClick={() => setOpened(false)}
              />}
            </Modal.Body>
          </Modal.Content>
        </Modal.Root>
      </div>
    </>
  );
}
