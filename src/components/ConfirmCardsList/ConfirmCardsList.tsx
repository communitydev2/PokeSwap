import { Badge, Group, Paper, ScrollArea, Stack, Text } from '@mantine/core';
import { usePokemonCardStore } from '../../store/pokemonCardsStore';
import { CardPicture } from '../CardPicture';

type SelectedCard = {
  card_id: string;
  card_name: string;
  card_image: string | null;
  quantity: number;
  language?: string | null;
};

// Read-only summary of the cards about to be added, shown in the confirm modal.
// One compact row per card so any number of cards fits (scrolls when long).
export function ConfirmCardsList() {
  const cards = usePokemonCardStore((state) => state.listCardsSelected) as unknown as SelectedCard[];
  const totalQuantity = cards.reduce((sum, card) => sum + (Number(card.quantity) || 0), 0);

  if (!cards.length) {
    return (
      <Text c="dimmed" ta="center" py="lg">
        No cards selected yet.
      </Text>
    );
  }

  return (
    <Stack gap="sm">
      <Text size="sm" c="dimmed">
        {cards.length} {cards.length === 1 ? 'card' : 'different cards'} · {totalQuantity} in total
      </Text>
      <ScrollArea.Autosize mah="55vh" offsetScrollbars type="auto">
        <Stack gap="xs">
          {cards.map((card) => (
            <Paper key={`${card.card_id}-${card.language ?? ''}`} withBorder radius="md" p="xs">
              <Group wrap="nowrap" gap="md">
                <CardPicture cardImage={card.card_image} alt={card.card_name} width={56} radius={4} />
                <Stack gap={6} style={{ minWidth: 0 }}>
                  <Text fw={600} lineClamp={2}>
                    {card.card_name}
                  </Text>
                  <Group gap="xs">
                    <Badge variant="filled" radius="sm">
                      × {card.quantity}
                    </Badge>
                    {card.language && (
                      <Badge variant="light" color="gray" radius="sm">
                        {card.language.toUpperCase()}
                      </Badge>
                    )}
                  </Group>
                </Stack>
              </Group>
            </Paper>
          ))}
        </Stack>
      </ScrollArea.Autosize>
    </Stack>
  );
}
