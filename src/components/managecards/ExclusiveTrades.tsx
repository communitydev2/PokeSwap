import { useMemo, useState } from 'react';
import { Badge, Button, Divider, Group, MultiSelect, Paper, Popover, Select, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { IconArrowsExchange, IconLock } from '@tabler/icons-react';
import { supabase } from '../../supabaseClient';
import { useLocalizationStore } from '../../store/useLocalizationStore';
import { usePokemonCardStore } from '../../store/pokemonCardsStore';
import type { PokemonCard } from '../../types/PokemonCard';
import type { TradeOffer } from './Trades';
import { CardPicture } from '../CardPicture';
import { CardMeta } from '../CardMeta';

// A row of this account's trade list
export type MyTradeRow = { id: number; language: string; quantity: number; card: PokemonCard };

// This account's exclusive trades (exclusive_trade with its trade-list row and wanted cards)
export type MyListing = { id: number; want_language: string; trade: MyTradeRow; wants: { card: PokemonCard }[] };

// Other players' exclusive trades this account can answer (find_exclusive_trades)
export type OpenListing = {
  exclusive_trade_id: number;
  partner_account: string;
  partner_name: string;
  card: PokemonCard;
  language: string;
  want_language: string;
  on_my_wishlist: boolean;
  i_can_give: PokemonCard[];
};

type Draft = { tradeCardId: string | null; wantLanguage: string; wants: string[] };

// Exclusive trades: one card that only trades for a short list of cards
export function ExclusiveTrades({ tcgAccountId, myTradeCards, listings, openListings, offers, tradableRarities, busy, run }: {
  tcgAccountId: string;
  myTradeCards: MyTradeRow[];
  listings: MyListing[];
  openListings: OpenListing[];
  offers: TradeOffer[];
  tradableRarities: Set<string>;
  busy: string | null;
  run: (key: string, call: PromiseLike<{ error: { message: string } | null }>) => Promise<boolean>;
}) {
  const t = useLocalizationStore((state) => state.t);
  // The listing being created (id null) or changed
  const [editing, setEditing] = useState<{ id: number | null; draft: Draft } | null>(null);

  const listedRows = new Set(listings.map((l) => l.trade.id));
  // Offers on this account's listings that wait for an answer
  const pendingByListing = (id: number) =>
    offers.filter((o) => o.exclusive_trade_id === id && o.direction === 'incoming' && o.status === 'pending').length;
  // Listings this account already has an open offer on -> the card it offered
  const answered = new Map(
    offers
      .filter((o) => o.direction === 'outgoing' && o.exclusive_trade_id != null && (o.status === 'pending' || o.status === 'accepted'))
      .map((o) => [o.exclusive_trade_id, o.my_card.card_id])
  );

  async function save(id: number | null, draft: Draft) {
    const ok = await run(
      `exclusive-save:${id ?? 'new'}`,
      supabase.rpc('save_exclusive_trade', {
        p_trade_card: Number(draft.tradeCardId),
        p_want_language: draft.wantLanguage,
        p_want_cards: draft.wants,
      })
    );
    if (ok) setEditing(null);
  }

  return (
    <Stack gap="md">
      <Text size="sm" c="dimmed">{t.exclusiveIntro}</Text>

      <Group justify="space-between">
        <Title order={4}>{t.exclusiveYours}</Title>
        {!editing && (
          <Button data-click-id="ExclusiveTrades/new" size="xs" leftSection={<IconLock size={14} />}
            onClick={() => setEditing({ id: null, draft: { tradeCardId: null, wantLanguage: 'en', wants: [] } })}>
            {t.exclusiveNew}
          </Button>
        )}
      </Group>

      {editing && editing.id === null && (
        <ListingEditor
          draft={editing.draft}
          cardChoices={myTradeCards.filter((m) => !listedRows.has(m.id) && m.card.rarity_id && tradableRarities.has(m.card.rarity_id))}
          saving={busy === 'exclusive-save:new'}
          disabled={busy !== null}
          onSave={(draft) => save(null, draft)}
          onCancel={() => setEditing(null)}
        />
      )}

      {listings.length === 0 && !editing && <Text size="sm" c="dimmed">{t.exclusiveNoneYours}</Text>}
      {listings.map((l) =>
        editing?.id === l.id ? (
          <ListingEditor
            key={l.id}
            draft={editing.draft}
            cardChoices={[l.trade]}
            saving={busy === `exclusive-save:${l.id}`}
            disabled={busy !== null}
            onSave={(draft) => save(l.id, draft)}
            onCancel={() => setEditing(null)}
          />
        ) : (
          <Paper key={l.id} withBorder radius="md" p="md" data-click-context={`exclusive trade: ${l.trade.card.card_name}`}>
            <Group wrap="nowrap" align="flex-start" gap="md">
              <CardPicture cardImage={l.trade.card.card_image} alt={l.trade.card.card_name} width={72} radius={4} />
              <Stack gap="xs" style={{ flex: 1, minWidth: 0 }}>
                <div>
                  <Group gap={6}>
                    <Text fw={600}>{l.trade.card.card_name}</Text>
                    <Badge variant="light" color="gray" radius="sm" size="sm">{l.trade.language.toUpperCase()}</Badge>
                  </Group>
                  <CardMeta card={l.trade.card} size="xs" />
                </div>
                <Text size="sm">{t.exclusiveForOneOf(l.wants.length, l.want_language.toUpperCase())}</Text>
                <WantedThumbnails cards={l.wants.map((w) => w.card)} />
                {pendingByListing(l.id) > 0 && (
                  <Text size="sm" c="yellow">{t.exclusivePendingOffers(pendingByListing(l.id))}</Text>
                )}
                <Group gap="xs" justify="flex-end">
                  <EndListingButton disabled={busy !== null} loading={busy === `exclusive-remove:${l.id}`}
                    onConfirm={() => run(`exclusive-remove:${l.id}`, supabase.rpc('remove_exclusive_trade', { p_exclusive: l.id }))} />
                  <Button data-click-id="ExclusiveTrades/edit" size="xs" variant="default" disabled={busy !== null || editing !== null}
                    onClick={() => setEditing({
                      id: l.id,
                      draft: { tradeCardId: String(l.trade.id), wantLanguage: l.want_language, wants: l.wants.map((w) => w.card.card_id) },
                    })}>
                    {t.exclusiveEdit}
                  </Button>
                </Group>
              </Stack>
            </Group>
          </Paper>
        )
      )}

      <Divider my="xs" />
      <Title order={4}>{t.exclusiveOpen}</Title>
      <Text size="sm" c="dimmed">{t.exclusiveOpenIntro}</Text>
      {openListings.length === 0 && <Text size="sm" c="dimmed" ta="center" py="md">{t.exclusiveNoneOpen}</Text>}
      {openListings.map((l) => (
        <OpenListingRow key={l.exclusive_trade_id} listing={l} sentCardId={answered.get(l.exclusive_trade_id)} busy={busy}
          onOffer={(card) =>
            run(
              `exclusive-offer:${l.exclusive_trade_id}`,
              supabase.rpc('send_exclusive_offer', { p_from: tcgAccountId, p_exclusive: l.exclusive_trade_id, p_give_card: card.card_id })
            )
          }
        />
      ))}
    </Stack>
  );
}

// Choosing the card, the language and the cards taken for it
function ListingEditor({ draft: initial, cardChoices, saving, disabled, onSave, onCancel }: {
  draft: Draft;
  cardChoices: MyTradeRow[];
  saving: boolean;
  disabled: boolean;
  onSave: (draft: Draft) => void;
  onCancel: () => void;
}) {
  const t = useLocalizationStore((state) => state.t);
  const languages = usePokemonCardStore((state) => state.languages);
  const allCards = usePokemonCardStore((state) => state.pokemonCards);
  const expansions = usePokemonCardStore((state) => state.supabase_expansion);
  const [draft, setDraft] = useState<Draft>(initial);
  const isNew = cardChoices.length !== 1 || initial.tradeCardId === null;
  const row = cardChoices.find((m) => String(m.id) === draft.tradeCardId);

  // Cards of the same rarity (not the card itself in the same language)
  const wantOptions = useMemo(() => {
    if (!row) return [];
    return allCards
      .filter((c) => c.rarity_id === row.card.rarity_id && !(c.card_id === row.card.card_id && draft.wantLanguage === row.language))
      .map((c) => {
        const set = expansions.find((s) => s.set_id === c.set_id)?.set_name;
        return { value: c.card_id, label: `${c.card_name} · ${[set, `#${c.card_local_id.split('-').pop()}`].filter(Boolean).join(' ')}` };
      });
  }, [row, allCards, expansions, draft.wantLanguage]);
  const wantedCards = draft.wants.map((id) => allCards.find((c) => c.card_id === id)).filter((c): c is PokemonCard => !!c);

  return (
    <Paper withBorder radius="md" p="md">
      <Stack gap="sm">
        {isNew ? (
          cardChoices.length === 0 ? (
            <Text size="sm" c="dimmed">{t.exclusiveNoCards}</Text>
          ) : (
            <Select data-click-id="ExclusiveTrades/card-select" label={t.exclusiveYourCard} placeholder={t.exclusivePickCard} searchable
              data={cardChoices.map((m) => ({ value: String(m.id), label: `${m.card.card_name} · ${m.card.card_local_id} · ${m.language.toUpperCase()}` }))}
              value={draft.tradeCardId} allowDeselect={false}
              // A different card can have a different rarity, so the wanted cards start over
              onChange={(value) => {
                const picked = cardChoices.find((m) => String(m.id) === value);
                setDraft({ tradeCardId: value, wantLanguage: picked?.language ?? draft.wantLanguage, wants: [] });
              }} />
          )
        ) : (
          row && (
            <Group gap="sm" wrap="nowrap">
              <CardPicture cardImage={row.card.card_image} alt={row.card.card_name} width={56} radius={4} />
              <div>
                <Text fw={600}>{row.card.card_name}</Text>
                <Text size="xs" c="dimmed">{row.card.card_local_id} · {row.language.toUpperCase()}</Text>
              </div>
            </Group>
          )
        )}

        {row && (
          <>
            <Select data-click-id="ExclusiveTrades/language-select" label={t.exclusiveWantLanguage} data={languages}
              value={draft.wantLanguage} allowDeselect={false}
              onChange={(value) => value && setDraft({ ...draft, wantLanguage: value })} />
            <MultiSelect data-click-id="ExclusiveTrades/wants-select" label={t.exclusiveWants} description={t.exclusiveWantsHelp}
              placeholder={draft.wants.length ? undefined : t.exclusiveSearchCards} searchable hidePickedOptions maxValues={50} limit={100}
              data={wantOptions} value={draft.wants} onChange={(wants) => setDraft({ ...draft, wants })} />
            <WantedThumbnails cards={wantedCards} />
            <Text size="xs" c="dimmed">{t.exclusiveSaveNote}</Text>
          </>
        )}

        <Group justify="flex-end" gap="xs">
          <Button data-click-id="ExclusiveTrades/cancel-edit" variant="default" size="xs" onClick={onCancel} disabled={saving}>{t.cancel}</Button>
          <Button data-click-id="ExclusiveTrades/save" size="xs" loading={saving}
            disabled={disabled || !row || draft.wants.length === 0} onClick={() => onSave(draft)}>
            {t.exclusiveSave}
          </Button>
        </Group>
      </Stack>
    </Paper>
  );
}

function WantedThumbnails({ cards }: { cards: PokemonCard[] }) {
  if (!cards.length) return null;
  return (
    <SimpleGrid cols={{ base: 4, xs: 6, sm: 8 }} spacing={6}>
      {cards.map((c) => (
        <div key={c.card_id} title={`${c.card_name} · ${c.card_local_id}`}>
          <CardPicture cardImage={c.card_image} alt={c.card_name} width="100%" radius={3} />
        </div>
      ))}
    </SimpleGrid>
  );
}

function EndListingButton({ disabled, loading, onConfirm }: { disabled: boolean; loading: boolean; onConfirm: () => void }) {
  const t = useLocalizationStore((state) => state.t);
  const [opened, setOpened] = useState(false);
  return (
    <Popover opened={opened} onChange={setOpened} position="bottom-end" withArrow shadow="md">
      <Popover.Target>
        <Button data-click-id="ExclusiveTrades/remove" size="xs" variant="subtle" color="red" disabled={disabled} loading={loading}
          onClick={() => setOpened((o) => !o)}>
          {t.exclusiveRemove}
        </Button>
      </Popover.Target>
      <Popover.Dropdown maw={260}>
        <Text size="sm" mb="sm">{t.exclusiveRemoveConfirm}</Text>
        <Group gap="xs" justify="flex-end">
          <Button data-click-id="ExclusiveTrades/remove-cancel" size="xs" variant="default" onClick={() => setOpened(false)}>{t.cancel}</Button>
          <Button data-click-id="ExclusiveTrades/remove-confirm" size="xs" color="red" onClick={() => { setOpened(false); onConfirm(); }}>
            {t.exclusiveRemove}
          </Button>
        </Group>
      </Popover.Dropdown>
    </Popover>
  );
}

// Another player's exclusive trade, with the listed cards this account can give
function OpenListingRow({ listing: l, sentCardId, busy, onOffer }: {
  listing: OpenListing;
  // the card already offered, while that offer is open
  sentCardId?: string;
  busy: string | null;
  onOffer: (card: PokemonCard) => void;
}) {
  const t = useLocalizationStore((state) => state.t);
  const [picked, setGive] = useState<string | null>(l.i_can_give[0]?.card_id ?? null);
  const give = sentCardId ?? picked;
  const giveCard = l.i_can_give.find((c) => c.card_id === give);
  return (
    <Paper withBorder radius="md" p="md" data-click-context={`exclusive trade: ${l.card.card_name} from ${l.partner_name}`}>
      <Group justify="space-between" mb="xs">
        <Text fw={600}>{l.partner_name}</Text>
        <Group gap={6}>
          {l.on_my_wishlist && <Badge variant="light" color="teal">{t.exclusiveOnWishlist}</Badge>}
          <Badge variant="light" color="grape" leftSection={<IconLock size={12} />}>{t.exclusiveBadge}</Badge>
        </Group>
      </Group>
      <Group wrap="nowrap" align="flex-start" gap="md">
        <CardPicture cardImage={l.card.card_image} alt={l.card.card_name} width={72} radius={4} />
        <Stack gap="xs" style={{ flex: 1, minWidth: 0 }}>
          <div>
            <Text size="xs" c="dimmed">{t.tradesYouGet}</Text>
            <Text fw={600}>{l.card.card_name}</Text>
            <Group gap={6}>
              <CardMeta card={l.card} size="xs" />
              <Badge variant="light" color="gray" radius="sm" size="sm">{l.language.toUpperCase()}</Badge>
            </Group>
          </div>
          <Group gap="xs" align="flex-end" wrap="wrap">
            <Select data-click-id="ExclusiveTrades/give-select" label={t.exclusiveTheyTake} size="sm" allowDeselect={false}
              data={l.i_can_give.map((c) => ({ value: c.card_id, label: `${c.card_name} · ${c.card_local_id} · ${l.want_language.toUpperCase()}` }))}
              value={give} onChange={setGive} disabled={!!sentCardId} style={{ flex: 1, minWidth: 180 }} />
            {sentCardId ? (
              <Badge color="teal" variant="light" size="lg" radius="sm">{t.tradesOfferSent}</Badge>
            ) : (
              <Button data-click-id="ExclusiveTrades/send-offer" leftSection={<IconArrowsExchange size={16} />}
                disabled={!giveCard || busy !== null} loading={busy === `exclusive-offer:${l.exclusive_trade_id}`}
                onClick={() => giveCard && onOffer(giveCard)}>
                {t.tradesSendOffer}
              </Button>
            )}
          </Group>
        </Stack>
      </Group>
    </Paper>
  );
}
