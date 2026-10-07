import { useEffect, useState } from 'react';
import { ActionIcon, Alert, Badge, Button, Group, Loader, Pagination, Paper, Popover, SegmentedControl, Stack, Text } from '@mantine/core';
import { IconMinus, IconPlus, IconTrash } from '@tabler/icons-react';
import { supabase } from '../../supabaseClient';
import { CARD_CATEGORY } from '../../constants';
import { useLocalizationStore } from '../../store/useLocalizationStore';
import type { PokemonCard } from '../../types/PokemonCard';
import { CardPicture } from '../CardPicture';
import { CardMeta } from '../CardMeta';

// A saved row of the wishlist / cards_available_for_trade tables, with its card
type SavedCard = {
  id: number;
  language: string;
  quantity: number;
  card: PokemonCard;
};

const TABLES = {
  [CARD_CATEGORY.wishlist]: 'wishlist',
  [CARD_CATEGORY.trade]: 'cards_available_for_trade',
} as const;

type Category = keyof typeof TABLES;

const PAGE_SIZE = 20;

// The cards a Pocket account is looking for (wishlist) and has for trade,
// with quantity and remove controls. Changes are saved straight away.
export function MyCards({ tcgAccountId, initialCategory = CARD_CATEGORY.wishlist }: { tcgAccountId: string; initialCategory?: Category }) {
  const t = useLocalizationStore((state) => state.t);
  const [category, setCategory] = useState<Category>(initialCategory);
  const [lists, setLists] = useState<Record<Category, SavedCard[]>>({ wishlist: [], trade: [] });
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  // Rows with a change on its way to the database (their buttons are disabled meanwhile)
  const [savingIds, setSavingIds] = useState<Set<number>>(new Set());
  const [page, setPage] = useState(1);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setLoadFailed(false);
      const select = 'id, language, quantity, card(*)';
      const [wishlist, trade] = await Promise.all(
        [TABLES.wishlist, TABLES.trade].map((table) =>
          supabase.from(table).select(select).eq('tcg_account_id', tcgAccountId).order('created_at', { ascending: false })
        )
      );
      if (cancelled) return;
      if (wishlist.error || trade.error) {
        console.warn(wishlist.error ?? trade.error);
        setLoadFailed(true);
      } else {
        setLists({
          wishlist: wishlist.data as unknown as SavedCard[],
          trade: trade.data as unknown as SavedCard[],
        });
      }
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [tcgAccountId]);

  useEffect(() => setPage(1), [category, tcgAccountId]);

  const cards = lists[category];
  const pageCount = Math.max(1, Math.ceil(cards.length / PAGE_SIZE));
  const pageCards = cards.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Removing the last card on the last page: step back a page
  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  function setSaving(id: number, saving: boolean) {
    setSavingIds((prev) => {
      const next = new Set(prev);
      if (saving) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  // Shows the change immediately and puts the old list back if saving fails
  async function applyChange(row: SavedCard, change: { quantity: number } | 'remove') {
    const list = category;
    const before = lists[list];
    setSaveFailed(false);
    setSaving(row.id, true);
    setLists((prev) => ({
      ...prev,
      [list]:
        change === 'remove'
          ? prev[list].filter((r) => r.id !== row.id)
          : prev[list].map((r) => (r.id === row.id ? { ...r, quantity: change.quantity } : r)),
    }));

    const table = supabase.from(TABLES[list]);
    const { error } =
      change === 'remove'
        ? await table.delete().eq('id', row.id)
        : await table.update({ quantity: change.quantity, updated_at: new Date().toISOString() }).eq('id', row.id);

    setSaving(row.id, false);
    if (error) {
      console.warn(error);
      setLists((prev) => ({ ...prev, [list]: before }));
      setSaveFailed(true);
    }
  }

  // Label inside the list switch; the span carries the click id of each option
  const listLabel = (key: Category, label: string) => (
    <span data-click-id={`MyCards/list:${key}`}>
      {label}{!loading && ` (${lists[key].length})`}
    </span>
  );

  return (
    <Stack gap="md">
      <SegmentedControl
        fullWidth
        value={category}
        onChange={(value) => setCategory(value as Category)}
        data={[
          { value: CARD_CATEGORY.wishlist, label: listLabel(CARD_CATEGORY.wishlist, t.myCardsLookingFor) },
          { value: CARD_CATEGORY.trade, label: listLabel(CARD_CATEGORY.trade, t.myCardsForTrade) },
        ]}
      />

      {saveFailed && (
        <Alert color="red" withCloseButton closeButtonLabel={t.dismiss} onClose={() => setSaveFailed(false)}>
          {t.myCardsSaveFailed}
        </Alert>
      )}

      {loading ? (
        <Group justify="center" py="xl">
          <Loader />
        </Group>
      ) : loadFailed ? (
        <Alert color="red">{t.myCardsLoadFailed}</Alert>
      ) : cards.length === 0 ? (
        <Text c="dimmed" ta="center" py="xl">
          {category === CARD_CATEGORY.wishlist ? t.myCardsWishlistEmpty : t.myCardsTradeEmpty}
        </Text>
      ) : (
        <>
          <Text size="sm" c="dimmed">
            {t.selectedCardsSummary(cards.length, cards.reduce((sum, r) => sum + r.quantity, 0))}
          </Text>
          <Stack gap="xs">
            {pageCards.map((row) => {
              const saving = savingIds.has(row.id);
              return (
                <Paper key={row.id} withBorder radius="md" p="sm" data-click-context={`saved card: ${row.card.card_name} (${row.language})`}>
                  <Group wrap="nowrap" align="flex-start" gap="md">
                    <CardPicture cardImage={row.card.card_image} alt={row.card.card_name} width={72} radius={4} />
                    <Stack gap="xs" style={{ flex: 1, minWidth: 0 }}>
                      <div>
                        <Text fw={600} lineClamp={2}>{row.card.card_name}</Text>
                        <CardMeta card={row.card} size="xs" />
                      </div>
                      <Group gap="xs" wrap="nowrap" justify="space-between">
                        <Group gap="xs" wrap="nowrap">
                          <ActionIcon data-click-id="MyCards/quantity-minus" variant="default" radius="md" size="lg"
                            aria-label={t.decreaseQuantity} disabled={saving || row.quantity <= 1}
                            onClick={() => applyChange(row, { quantity: row.quantity - 1 })}>
                            <IconMinus size={16} />
                          </ActionIcon>
                          <Text fw={600} w="3ch" ta="center">{row.quantity}</Text>
                          <ActionIcon data-click-id="MyCards/quantity-plus" variant="default" radius="md" size="lg"
                            aria-label={t.increaseQuantity} disabled={saving || row.quantity >= 9999}
                            onClick={() => applyChange(row, { quantity: row.quantity + 1 })}>
                            <IconPlus size={16} />
                          </ActionIcon>
                          <Badge variant="light" color="gray" radius="sm">{row.language.toUpperCase()}</Badge>
                        </Group>
                        <RemoveButton disabled={saving} onConfirm={() => applyChange(row, 'remove')} />
                      </Group>
                    </Stack>
                  </Group>
                </Paper>
              );
            })}
          </Stack>
          {pageCount > 1 && (
            <Group justify="center">
              <Pagination data-click-id="MyCards/pagination" total={pageCount} value={page} onChange={setPage}
                getControlProps={(control) => ({ 'data-click-id': `MyCards/page:${control}` })}
                getItemProps={(p) => ({ 'data-click-id': `MyCards/page:${p}` })} />
            </Group>
          )}
        </>
      )}
    </Stack>
  );
}

// Trash button that asks before removing
function RemoveButton({ disabled, onConfirm }: { disabled: boolean; onConfirm: () => void }) {
  const t = useLocalizationStore((state) => state.t);
  const [opened, setOpened] = useState(false);
  return (
    <Popover opened={opened} onChange={setOpened} position="top-end" withArrow shadow="md">
      <Popover.Target>
        <ActionIcon data-click-id="MyCards/remove" variant="light" color="red" radius="md" size="lg"
          aria-label={t.myCardsRemove} disabled={disabled} onClick={() => setOpened((o) => !o)}>
          <IconTrash size={16} />
        </ActionIcon>
      </Popover.Target>
      <Popover.Dropdown>
        <Stack gap="xs">
          <Text size="sm">{t.myCardsRemoveConfirm}</Text>
          <Group gap="xs" justify="flex-end">
            <Button data-click-id="MyCards/remove-cancel" size="xs" variant="default" onClick={() => setOpened(false)}>
              {t.cancel}
            </Button>
            <Button data-click-id="MyCards/remove-confirm" size="xs" color="red"
              onClick={() => {
                setOpened(false);
                onConfirm();
              }}>
              {t.myCardsRemove}
            </Button>
          </Group>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}
