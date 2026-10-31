import { Anchor, Badge, Box, Group, Paper, Stack, Text } from '@mantine/core';
import { IconSparkles } from '@tabler/icons-react';
import { flairsForCard } from '../../data/limitedFlairs';
import { useLocalizationStore } from '../../store/useLocalizationStore';
import { formatFlairDates } from './FlairBadges';

export function FlairDetails({ cardLocalId, cardName }: { cardLocalId?: string | null; cardName: string }) {
  const t = useLocalizationStore((s) => s.t);
  const flairs = flairsForCard(cardLocalId);
  if (!flairs.length) return null;

  return (
    <Paper withBorder radius="md" p="sm">
      <Stack gap="sm">
        <Text fw={600}>{t.flairSectionTitle}</Text>
        {flairs.map((flair) => (
          <Group key={flair.id} align="flex-start" wrap="wrap" gap="md">
            <Box style={{ flex: '0 1 280px', minWidth: 0, maxWidth: '100%' }}>
              {flair.preview ? (
                <img
                  src={flair.preview}
                  alt={t.flairPreviewAlt(cardName, t.flairTitle(flair.name, flair.colour))}
                  loading="lazy"
                  style={{ display: 'block', width: '100%', aspectRatio: '622 / 512', objectFit: 'contain', borderRadius: 8 }}
                />
              ) : flair.icon ? (
                <img
                  src={flair.icon}
                  width={96}
                  height={96}
                  alt={t.flairIconAlt(flair.name)}
                  loading="lazy"
                  style={{ display: 'block', maxWidth: '100%', objectFit: 'contain', borderRadius: 8 }}
                />
              ) : (
                <Stack
                  align="center"
                  justify="center"
                  gap={4}
                  w={96}
                  h={96}
                  style={{ maxWidth: '100%', borderRadius: 8, background: 'var(--mantine-color-default-hover)' }}
                >
                  <IconSparkles size={24} color="var(--mantine-color-dimmed)" aria-hidden="true" />
                  <Text size="xs" c="dimmed" ta="center">{t.flairNoPicture}</Text>
                </Stack>
              )}
            </Box>
            <Stack gap={6} style={{ flex: '1 1 200px', minWidth: 0, overflowWrap: 'anywhere' }}>
              <Group gap={6} wrap="nowrap" align="flex-start">
                {flair.icon && flair.preview && (
                  <img
                    src={flair.icon}
                    width={20}
                    height={20}
                    alt=""
                    loading="lazy"
                    style={{ display: 'block', flexShrink: 0, borderRadius: 3 }}
                  />
                )}
                <Text fw={600} style={{ minWidth: 0 }}>{t.flairTitle(flair.name, flair.colour)}</Text>
              </Group>
              <Badge variant="light" color={flair.kind === 'battle' ? 'orange' : 'grape'} tt="none" size="sm" style={{ alignSelf: 'flex-start' }}>
                {flair.kind === 'battle' ? t.flairBattle : t.flairCosmetic}
              </Badge>
              <Text size="sm" c="dimmed">{t.flairCollectionNames[flair.collection]}</Text>
              <Text size="sm">{t.flairEventDates(flair.event, formatFlairDates(flair))}</Text>
              <Anchor
                href={flair.eventUrl}
                target="_blank"
                rel="noopener noreferrer"
                size="sm"
                data-click-id={`FlairDetails/event:${flair.id}`}
              >
                {t.flairEventLink}
              </Anchor>
            </Stack>
          </Group>
        ))}
        <Text size="xs" c="dimmed">{t.flairOnlyThisCard}</Text>
      </Stack>
    </Paper>
  );
}
