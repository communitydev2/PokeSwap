import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, CopyButton, Divider, Group, Loader, Paper, SegmentedControl, Select, Stack, Text, Title } from '@mantine/core';
import { IconArrowsExchange, IconLock } from '@tabler/icons-react';
import { supabase } from '../../supabaseClient';
import { useLocalizationStore } from '../../store/useLocalizationStore';
import type { Translations } from '../../i18n';
import type { PokemonCard } from '../../types/PokemonCard';
import { CardPicture } from '../CardPicture';
import { CardMeta } from '../CardMeta';
import { ExclusiveTrades, type MyListing, type MyTradeRow, type OpenListing } from './ExclusiveTrades';

// Rows returned by the trade functions (supabase/migrations/*_trades.sql)
type PartnerCard = {
  partner_account: string;
  partner_name: string;
  get_card: PokemonCard;
  get_language: string;
  wanted_from_me: { card: PokemonCard; language: string }[];
};

export type TradeOffer = {
  id: number;
  direction: 'incoming' | 'outgoing';
  status: 'pending' | 'accepted' | 'declined' | 'cancelled' | 'completed';
  partner_account: string;
  partner_name: string;
  partner_friend_id: string | null;
  my_card: PokemonCard;
  my_language: string;
  their_card: PokemonCard;
  their_language: string;
  i_marked_done: boolean;
  partner_marked_done: boolean;
  // set when the offer was made through an exclusive trade
  exclusive_trade_id: number | null;
};

type MyTradeCard = { card: PokemonCard; language: string };

const VIEW = { find: 'find', exclusive: 'exclusive', offers: 'offers' } as const;

// Exception messages raised by the trade functions -> text shown to the player
function errorText(t: Translations, message: string | undefined) {
  const known: Record<string, string> = {
    'You already sent this offer': t.tradesErrorAlreadySent,
    'The other player no longer has that card for trade': t.tradesErrorCardGone,
    'That card is not on your trade list': t.tradesErrorNotOnYourList,
    'You have 50 offers waiting for an answer. Cancel some before sending more': t.tradesErrorTooMany,
    'This offer has already been answered': t.tradesErrorAnswered,
    'This offer can no longer be cancelled': t.tradesErrorCantCancel,
    'You already sent an offer for this exclusive trade': t.exclusiveErrorAlreadySent,
    'This exclusive trade has ended': t.exclusiveErrorEnded,
    'That card is in one of your exclusive trades': t.exclusiveErrorYourCardExclusive,
    'That card only trades through its exclusive trade': t.exclusiveErrorTheirCardExclusive,
    'That card is not one they asked for': t.exclusiveErrorNotAsked,
    'The cards you want must be the same rarity as your card': t.exclusiveErrorRarity,
    'Cards of this rarity cannot be traded': t.exclusiveErrorNotTradable,
    'Pick between 1 and 50 cards': t.exclusiveErrorCount,
  };
  return (message && known[message]) || t.tradesActionFailed;
}

const cardKey = (cardId: string, language: string) => `${cardId}|${language}`;

// Finding trade partners and handling offers for one Pocket account
export function Trades({ tcgAccountId, onOffersChanged }: { tcgAccountId: string; onOffersChanged?: () => void }) {
  const t = useLocalizationStore((state) => state.t);
  const [view, setView] = useState<string>(VIEW.find);
  const [partners, setPartners] = useState<PartnerCard[]>([]);
  const [offers, setOffers] = useState<TradeOffer[]>([]);
  const [myTradeRows, setMyTradeRows] = useState<MyTradeRow[]>([]);
  const [listings, setListings] = useState<MyListing[]>([]);
  const [openListings, setOpenListings] = useState<OpenListing[]>([]);
  const [tradableRarities, setTradableRarities] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  // Offer / button currently waiting on the database
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [p, o, mine, ex, open, rarities] = await Promise.all([
      supabase.rpc('find_trade_partners', { p_account: tcgAccountId }),
      supabase.rpc('get_trade_offers', { p_account: tcgAccountId }),
      supabase.from('cards_available_for_trade').select('id, language, quantity, card(*)').eq('tcg_account_id', tcgAccountId),
      supabase
        .from('exclusive_trade')
        .select('id, want_language, trade:cards_available_for_trade!inner(id, language, quantity, card(*)), wants:exclusive_trade_want(card(*))')
        .eq('trade.tcg_account_id', tcgAccountId)
        .order('created_at', { ascending: false }),
      supabase.rpc('find_exclusive_trades', { p_account: tcgAccountId }),
      supabase.rpc('tradable_rarities'),
    ]);
    const failed = p.error ?? o.error ?? mine.error ?? ex.error ?? open.error ?? rarities.error;
    if (failed) {
      console.warn(failed);
      setLoadFailed(true);
    } else {
      setLoadFailed(false);
      setPartners(p.data as PartnerCard[]);
      setOffers(o.data as TradeOffer[]);
      setMyTradeRows(mine.data as unknown as MyTradeRow[]);
      setListings(ex.data as unknown as MyListing[]);
      setOpenListings(open.data as OpenListing[]);
      setTradableRarities(new Set(rarities.data as string[]));
    }
    setLoading(false);
  }, [tcgAccountId]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  // Calls a trade function, shows its error if any, and reloads. Resolves to whether it worked.
  async function run(key: string, call: PromiseLike<{ error: { message: string } | null }>) {
    setBusy(key);
    setActionError(null);
    const { error } = await call;
    if (error) {
      console.warn(error);
      setActionError(errorText(t, error.message));
    }
    await load();
    onOffersChanged?.();
    setBusy(null);
    return !error;
  }

  // Cards held for an exclusive trade only trade there
  const myTradeCards: MyTradeCard[] = useMemo(() => {
    const listed = new Set(listings.map((l) => l.trade.id));
    return myTradeRows.filter((m) => !listed.has(m.id));
  }, [myTradeRows, listings]);

  const incomingPending = offers.filter((o) => o.direction === 'incoming' && o.status === 'pending');
  const accepted = offers.filter((o) => o.status === 'accepted');
  const sentPending = offers.filter((o) => o.direction === 'outgoing' && o.status === 'pending');
  const past = offers.filter((o) => ['declined', 'cancelled', 'completed'].includes(o.status));
  const openCount = incomingPending.length + accepted.length;

  // Offers already open, so their buttons show "Offer sent"
  const openOfferKeys = useMemo(
    () =>
      new Set(
        offers
          .filter((o) => o.direction === 'outgoing' && (o.status === 'pending' || o.status === 'accepted'))
          .map((o) => `${o.partner_account}|${cardKey(o.their_card.card_id, o.their_language)}|${cardKey(o.my_card.card_id, o.my_language)}`)
      ),
    [offers]
  );

  // Group the partner rows by player
  const byPartner = useMemo(() => {
    const groups = new Map<string, PartnerCard[]>();
    for (const row of partners) groups.set(row.partner_account, [...(groups.get(row.partner_account) ?? []), row]);
    return [...groups.values()];
  }, [partners]);

  if (loading) {
    return (
      <Group justify="center" py="xl">
        <Loader />
      </Group>
    );
  }
  if (loadFailed) return <Alert color="red">{t.tradesLoadFailed}</Alert>;

  return (
    <Stack gap="md">
      <SegmentedControl
        fullWidth
        value={view}
        onChange={setView}
        data={[
          { value: VIEW.find, label: <span data-click-id="Trades/view:find">{t.tradesFind} ({partners.length})</span> },
          { value: VIEW.exclusive, label: <span data-click-id="Trades/view:exclusive">{t.tradesExclusive}{openListings.length > 0 && ` (${openListings.length})`}</span> },
          { value: VIEW.offers, label: <span data-click-id="Trades/view:offers">{t.tradesOffers}{openCount > 0 && ` (${openCount})`}</span> },
        ]}
      />

      {actionError && (
        <Alert color="red" withCloseButton closeButtonLabel={t.dismiss} onClose={() => setActionError(null)}>
          {actionError}
        </Alert>
      )}

      {view === VIEW.find && (
        <>
          <Text size="sm" c="dimmed">{t.tradesIntro}</Text>
          {byPartner.length === 0 && <Text c="dimmed" ta="center" py="xl">{t.tradesNoneFound}</Text>}
          {byPartner.map((rows) => (
            <Paper key={rows[0].partner_account} withBorder radius="md" p="md">
              <Title order={4} mb="sm">{rows[0].partner_name}</Title>
              <Stack gap="md">
                {rows.map((row, i) => (
                  <PartnerRow
                    key={cardKey(row.get_card.card_id, row.get_language)}
                    row={row}
                    divider={i > 0}
                    myTradeCards={myTradeCards}
                    openOfferKeys={openOfferKeys}
                    busy={busy}
                    onOffer={(give) =>
                      run(
                        `offer:${row.partner_account}:${cardKey(row.get_card.card_id, row.get_language)}`,
                        supabase.rpc('create_trade_offer', {
                          p_from: tcgAccountId,
                          p_give_card: give.card.card_id,
                          p_give_language: give.language,
                          p_to: row.partner_account,
                          p_get_card: row.get_card.card_id,
                          p_get_language: row.get_language,
                        })
                      )
                    }
                  />
                ))}
              </Stack>
            </Paper>
          ))}
        </>
      )}

      {view === VIEW.exclusive && (
        <ExclusiveTrades
          tcgAccountId={tcgAccountId}
          myTradeCards={myTradeRows}
          listings={listings}
          openListings={openListings}
          offers={offers}
          tradableRarities={tradableRarities}
          busy={busy}
          run={run}
        />
      )}

      {view === VIEW.offers && (
        <>
          {offers.length === 0 && <Text c="dimmed" ta="center" py="xl">{t.tradesNoOffers}</Text>}
          <OfferSection title={t.tradesWaitingForYou} offers={incomingPending} render={(o) => (
            <Group gap="xs" justify="flex-end">
              <Button data-click-id="Trades/decline" variant="default" size="xs" loading={busy === `decline:${o.id}`} disabled={busy !== null}
                onClick={() => run(`decline:${o.id}`, supabase.rpc('respond_trade_offer', { p_offer: o.id, p_accept: false }))}>
                {t.tradesDecline}
              </Button>
              <Button data-click-id="Trades/accept" size="xs" loading={busy === `accept:${o.id}`} disabled={busy !== null}
                onClick={() => run(`accept:${o.id}`, supabase.rpc('respond_trade_offer', { p_offer: o.id, p_accept: true }))}>
                {t.tradesAccept}
              </Button>
            </Group>
          )} />
          <OfferSection title={t.tradesAccepted} offers={accepted} render={(o) => (
            <Stack gap="xs">
              {o.partner_friend_id != null && (
                <Group gap="xs">
                  <Text size="sm">{t.tradesFriendId}:</Text>
                  <Text fw={700} ff="monospace">{o.partner_friend_id}</Text>
                  <CopyButton value={o.partner_friend_id}>
                    {({ copied, copy }) => (
                      <Button data-click-id="Trades/copy-friend-id" size="compact-xs" variant="light" color={copied ? 'teal' : undefined} onClick={copy}>
                        {copied ? t.tradesCopied : t.tradesCopy}
                      </Button>
                    )}
                  </CopyButton>
                </Group>
              )}
              <Text size="xs" c="dimmed">{o.i_marked_done ? t.tradesWaitingForPartner(o.partner_name) : t.tradesHowTo}</Text>
              {!o.i_marked_done && o.partner_marked_done && <Text size="xs" c="teal">{t.tradesPartnerDone(o.partner_name)}</Text>}
              {!o.i_marked_done && (
                <Group gap="xs" justify="flex-end">
                  {!o.partner_marked_done && (
                    <Button data-click-id="Trades/cancel-trade" variant="default" size="xs" loading={busy === `cancel:${o.id}`} disabled={busy !== null}
                      onClick={() => run(`cancel:${o.id}`, supabase.rpc('cancel_trade_offer', { p_offer: o.id }))}>
                      {t.tradesCancelTrade}
                    </Button>
                  )}
                  <Button data-click-id="Trades/mark-done" size="xs" color="teal" title={t.tradesMarkDoneHelp}
                    loading={busy === `done:${o.id}`} disabled={busy !== null}
                    onClick={() => run(`done:${o.id}`, supabase.rpc('mark_trade_done', { p_offer: o.id }))}>
                    {t.tradesMarkDone}
                  </Button>
                </Group>
              )}
            </Stack>
          )} />
          <OfferSection title={t.tradesSent} offers={sentPending} render={(o) => (
            <Group justify="flex-end">
              <Button data-click-id="Trades/cancel-offer" variant="default" size="xs" loading={busy === `cancel:${o.id}`} disabled={busy !== null}
                onClick={() => run(`cancel:${o.id}`, supabase.rpc('cancel_trade_offer', { p_offer: o.id }))}>
                {t.tradesCancelOffer}
              </Button>
            </Group>
          )} />
          <OfferSection title={t.tradesPast} offers={past} />
        </>
      )}
    </Stack>
  );
}

// One card a partner has that is on our wishlist, with the card to give for it
function PartnerRow({ row, divider, myTradeCards, openOfferKeys, busy, onOffer }: {
  row: PartnerCard;
  divider: boolean;
  myTradeCards: MyTradeCard[];
  openOfferKeys: Set<string>;
  busy: string | null;
  onOffer: (give: MyTradeCard) => void;
}) {
  const t = useLocalizationStore((state) => state.t);
  const wantedKeys = new Set(row.wanted_from_me.map((w) => cardKey(w.card.card_id, w.language)));
  const others = myTradeCards.filter(
    (m) => m.card.rarity_id === row.get_card.rarity_id && !wantedKeys.has(cardKey(m.card.card_id, m.language))
  );
  const label = (m: MyTradeCard) => `${m.card.card_name} · ${m.card.card_local_id} · ${m.language.toUpperCase()}`;
  const options = [
    ...(row.wanted_from_me.length
      ? [{ group: t.tradesTheyWant, items: row.wanted_from_me.map((m) => ({ value: cardKey(m.card.card_id, m.language), label: label(m) })) }]
      : []),
    ...(others.length
      ? [{ group: t.tradesOtherSameRarity, items: others.map((m) => ({ value: cardKey(m.card.card_id, m.language), label: label(m) })) }]
      : []),
  ];
  const all = [...row.wanted_from_me, ...others];
  const [give, setGive] = useState<string | null>(row.wanted_from_me[0] ? cardKey(row.wanted_from_me[0].card.card_id, row.wanted_from_me[0].language) : null);
  const giveCard = all.find((m) => cardKey(m.card.card_id, m.language) === give);
  const sent = giveCard && openOfferKeys.has(`${row.partner_account}|${cardKey(row.get_card.card_id, row.get_language)}|${give}`);
  const busyKey = `offer:${row.partner_account}:${cardKey(row.get_card.card_id, row.get_language)}`;

  return (
    <>
      {divider && <Divider />}
      <Group wrap="nowrap" align="flex-start" gap="md" data-click-context={`trade for: ${row.get_card.card_name} from ${row.partner_name}`}>
        <CardPicture cardImage={row.get_card.card_image} alt={row.get_card.card_name} width={72} radius={4} />
        <Stack gap="xs" style={{ flex: 1, minWidth: 0 }}>
          <div>
            <Text size="xs" c="dimmed">{t.tradesYouGet}</Text>
            <Text fw={600}>{row.get_card.card_name}</Text>
            <Group gap={6}>
              <CardMeta card={row.get_card} size="xs" />
              <Badge variant="light" color="gray" radius="sm" size="sm">{row.get_language.toUpperCase()}</Badge>
            </Group>
          </div>
          {all.length === 0 ? (
            <Text size="sm" c="dimmed">{t.tradesNoSameRarity}</Text>
          ) : (
            <Group gap="xs" align="flex-end" wrap="wrap">
              <Select data-click-id="Trades/give-select" label={t.tradesYouGive} placeholder={t.tradesPickCard}
                data={options} value={give} onChange={setGive} allowDeselect={false} size="sm" style={{ flex: 1, minWidth: 180 }} />
              {sent ? (
                <Badge color="teal" variant="light" size="lg" radius="sm">{t.tradesOfferSent}</Badge>
              ) : (
                <Button data-click-id="Trades/send-offer" leftSection={<IconArrowsExchange size={16} />}
                  disabled={!giveCard || busy !== null} loading={busy === busyKey}
                  onClick={() => giveCard && onOffer(giveCard)}>
                  {t.tradesSendOffer}
                </Button>
              )}
            </Group>
          )}
        </Stack>
      </Group>
    </>
  );
}

// A titled list of offers; render adds the buttons for each one
function OfferSection({ title, offers, render }: { title: string; offers: TradeOffer[]; render?: (o: TradeOffer) => React.ReactNode }) {
  const t = useLocalizationStore((state) => state.t);
  if (!offers.length) return null;
  return (
    <Stack gap="xs">
      <Title order={5}>{title} ({offers.length})</Title>
      {offers.map((o) => (
        <Paper key={o.id} withBorder radius="md" p="sm" data-click-context={`offer ${o.id} with ${o.partner_name}`}>
          <Group justify="space-between" mb="xs">
            <Group gap={6}>
              <Text size="sm" fw={600}>{t.tradesWith(o.partner_name)}</Text>
              {o.exclusive_trade_id != null && (
                <Badge size="sm" variant="light" color="grape" leftSection={<IconLock size={10} />}>{t.exclusiveBadge}</Badge>
              )}
            </Group>
            <Badge variant="light" color={o.status === 'completed' ? 'teal' : o.status === 'accepted' ? 'blue' : o.status === 'pending' ? 'yellow' : 'gray'}>
              {t.tradesStatus[o.status] ?? o.status}
            </Badge>
          </Group>
          <Group wrap="nowrap" gap="sm" align="center" mb={render ? 'sm' : 0}>
            <OfferCard label={t.tradesYouGive} card={o.my_card} language={o.my_language} />
            <IconArrowsExchange size={20} style={{ flexShrink: 0, opacity: 0.6 }} />
            <OfferCard label={t.tradesYouGet} card={o.their_card} language={o.their_language} />
          </Group>
          {render?.(o)}
        </Paper>
      ))}
    </Stack>
  );
}

function OfferCard({ label, card, language }: { label: string; card: PokemonCard; language: string }) {
  return (
    <Group wrap="nowrap" gap="xs" style={{ flex: 1, minWidth: 0 }}>
      <CardPicture cardImage={card.card_image} alt={card.card_name} width={44} radius={3} />
      <div style={{ minWidth: 0 }}>
        <Text size="xs" c="dimmed">{label}</Text>
        <Text size="sm" fw={600} lineClamp={2}>{card.card_name}</Text>
        <Text size="xs" c="dimmed">{card.card_local_id} · {language.toUpperCase()}</Text>
      </div>
    </Group>
  );
}
