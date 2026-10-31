import { Badge, Group, Text, Tooltip } from '@mantine/core';
import { IconSparkles } from '@tabler/icons-react';
import { flairsForCard, type LimitedFlair } from '../../data/limitedFlairs';
import { useLocalizationStore } from '../../store/useLocalizationStore';

export function formatFlairDates(flair: LimitedFlair): string {
  const start = new Date(flair.startsAt);
  const end = new Date(flair.endsAt);
  const dayMonth = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric', month: 'short', timeZone: 'UTC',
  });
  const dayMonthYear = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
  });
  const startFormatter = start.getUTCFullYear() === end.getUTCFullYear() ? dayMonth : dayMonthYear;
  return startFormatter.format(start) + ' – ' + dayMonthYear.format(end);
}

export function FlairBadges({ cardLocalId, size = 'sm' }: { cardLocalId?: string | null; size?: 'xs' | 'sm' }) {
  const t = useLocalizationStore((s) => s.t);
  const flairs = flairsForCard(cardLocalId);
  if (!flairs.length) return null;

  const iconSize = size === 'xs' ? 14 : 16;

  return (
    <Group gap={4} wrap="wrap">
      {flairs.map((flair) => (
        <Tooltip
          key={flair.id}
          withArrow
          multiline
          w={240}
          events={{ hover: true, focus: true, touch: true }}
          label={
            <>
              <Text size="inherit">{t.flairEventDates(flair.event, formatFlairDates(flair))}</Text>
              <Text size="inherit">{flair.kind === 'battle' ? t.flairBattle : t.flairCosmetic}</Text>
            </>
          }
        >
          <Badge
            variant="light"
            color={flair.kind === 'battle' ? 'orange' : 'grape'}
            tt="none"
            size={size}
            leftSection={flair.icon ? (
              <img
                src={flair.icon}
                width={iconSize}
                height={iconSize}
                alt=""
                loading="lazy"
                style={{ display: 'block', borderRadius: 3 }}
              />
            ) : <IconSparkles size={14} aria-hidden="true" />}
          >
            {t.flairTitle(flair.name, flair.colour)}
          </Badge>
        </Tooltip>
      ))}
    </Group>
  );
}
