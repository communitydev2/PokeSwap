import type { CSSProperties } from 'react';
import { Badge, Group, Select, Stack, Text, type MantineSize } from '@mantine/core';
import type { PokemonCard } from '../types/PokemonCard';
import { useCardLabel } from '../utils/cardLabel';
import { CardMeta } from './CardMeta';
import { CardPicture } from './CardPicture';

export type CardSelectItem = { value: string; card: PokemonCard; language?: string | null };
export type CardSelectGroup = { group: string; items: CardSelectItem[] };

export function CardSelect(props: {
  clickId: string;
  label: string;
  placeholder?: string;
  size?: MantineSize;
  data: CardSelectItem[] | CardSelectGroup[];
  value: string | null;
  onChange: (value: string | null) => void;
  disabled?: boolean;
  searchable?: boolean;
  showPreview?: boolean;
  style?: CSSProperties;
}) {
  const cardLabel = useCardLabel();
  const itemsByValue = new Map<string, CardSelectItem>();
  const toOption = (item: CardSelectItem) => {
    itemsByValue.set(item.value, item);
    return { value: item.value, label: cardLabel(item.card, item.language ?? undefined) };
  };
  const data = props.data.map((entry) =>
    'group' in entry
      ? { group: entry.group, items: entry.items.map(toOption) }
      : toOption(entry),
  );
  const selected = props.value === null ? undefined : itemsByValue.get(props.value);

  return (
    <Stack gap={6} style={{ ...props.style, minWidth: 0 }}>
      <Select
        data-click-id={props.clickId}
        label={props.label}
        placeholder={props.placeholder}
        size={props.size}
        disabled={props.disabled}
        searchable={props.searchable}
        value={props.value}
        onChange={props.onChange}
        data={data}
        allowDeselect={false}
        maxDropdownHeight={320}
        style={{ minWidth: 0 }}
        leftSectionWidth={30}
        leftSection={selected ? (
          <CardPicture
            cardImage={selected.card.card_image}
            alt={selected.card.card_name}
            width={18}
            radius={2}
            zoom={false}
          />
        ) : undefined}
        renderOption={({ option }) => {
          const item = itemsByValue.get(option.value);
          if (!item) return null;

          return (
            <div
              data-click-id={`${props.clickId}-option:${option.value}`}
              style={{ minWidth: 0, width: '100%' }}
            >
              <Group gap="sm" wrap="nowrap">
                <CardPicture
                  cardImage={item.card.card_image}
                  alt={item.card.card_name}
                  width={32}
                  radius={3}
                  zoom={false}
                />
                <Stack gap={0} style={{ minWidth: 0, flex: 1 }}>
                  <Text size="sm" fw={500} lineClamp={1}>
                    {item.card.card_name}
                  </Text>
                  <Group gap={4} wrap="nowrap" style={{ minWidth: 0 }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <CardMeta card={item.card} size="xs" />
                    </div>
                    {item.language && (
                      <Badge size="xs" color="gray" variant="light" style={{ flexShrink: 0 }}>
                        {item.language.toUpperCase()}
                      </Badge>
                    )}
                  </Group>
                </Stack>
              </Group>
            </div>
          );
        }}
      />
      {props.showPreview !== false && selected && (
        <Group gap="sm" wrap="nowrap" align="flex-start" style={{ minWidth: 0 }}>
          <CardPicture
            cardImage={selected.card.card_image}
            alt={selected.card.card_name}
            width={56}
            radius={4}
            zoom
          />
          <Stack gap={2} style={{ minWidth: 0, flex: 1 }}>
            <Text size="sm" fw={600} lineClamp={2}>
              {selected.card.card_name}
            </Text>
            <CardMeta card={selected.card} size="xs" />
            {selected.language && (
              <Badge size="xs" color="gray" variant="light" style={{ maxWidth: '100%', alignSelf: 'flex-start' }}>
                {selected.language.toUpperCase()}
              </Badge>
            )}
          </Stack>
        </Group>
      )}
    </Stack>
  );
}
