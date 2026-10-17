import { useEffect, useState } from 'react';
import { Alert, Badge, Button, Divider, Group, Loader, Stack, Text, Title } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { supabase } from '../../supabaseClient';
import { useLocalizationStore } from '../../store/useLocalizationStore';
import { useAuthStore } from '../../store/userStore';
import { useFriendAccounts } from '../../hooks/useFriendAccounts';
import { useMyTcgAccounts } from '../../hooks/useMyTcgAccounts';
import type { PokemonCard } from '../../types/PokemonCard';
import { TradeOfferModal } from './TradeOfferModal';

type Player = {
  tcg_account_id: string;
  player_name: string | null;
  side: 'has' | 'wants';
  language: string;
  quantity: number;
  exclusive_trade_id: number | null;
  is_mine: boolean;
};
export function CardPlayers({
  card,
  friendsOnly = false,
  onOpenExclusive,
}: {
  card: PokemonCard;
  friendsOnly?: boolean;
  onOpenExclusive: (exclusiveTradeId: number) => void;
}) {
  const { ids: friendIds, loading: friendsLoading } = useFriendAccounts();
  const phone = useMediaQuery('(max-width: 30em)');
  const t = useLocalizationStore((s) => s.t);
  const session = useAuthStore((s) => s.session);
  const { accounts, loading: accountsLoading, error: accountsError } = useMyTcgAccounts();
  const [rows, setRows] = useState<Player[]>([]);
  const [rarities, setRarities] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [offer, setOffer] = useState<Player | null>(null);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFailed(false);
    setOffer(null);
    async function load() {
      try {
        const [players, tradable] = await Promise.all([
          supabase.rpc('market_card_players', { p_card: card.card_id }),
          supabase.rpc('tradable_rarities'),
        ]);
        if (cancelled) return;
        if (players.error || tradable.error) throw players.error || tradable.error;
        setRows((players.data ?? []) as Player[]);
        setRarities((tradable.data ?? []) as string[]);
      } catch {
        if (!cancelled) setFailed(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [card.card_id, session?.user.id]);
  if (loading || (friendsOnly && friendsLoading)) return <Loader size="sm" mt="sm" />;
  if (failed)
    return (
      <Alert color="red" mt="sm">
        {t.marketCardsLoadFailed}
      </Alert>
    );
  const visibleRows = friendsOnly ? rows.filter((row) => friendIds.has(row.tcg_account_id)) : rows;
  const tradable = card.rarity_id !== null && rarities.includes(card.rarity_id);
  return (
    <Stack mt="md" gap="md">
      <Divider />
      {(['has', 'wants'] as const).map((side) => (
        <Stack key={side} gap="xs">
          <Title order={4}>{side === 'has' ? t.marketCardsHaveTitle : t.marketCardsWantTitle}</Title>
          {!visibleRows.some((r) => r.side === side) && (
            <Text size="sm" c="dimmed">
              {t.marketCardsNoPlayers}
            </Text>
          )}
          {visibleRows
            .filter((r) => r.side === side)
            .map((row) => {
              const key = `${side}:${row.tcg_account_id}:${row.language}`;
              return (
                <Group key={key} justify="space-between" wrap="wrap" align="flex-start" gap="xs">
                  <Group gap="xs" style={{ minWidth: 0, width: phone ? '100%' : undefined }}>
                    <Text size="sm">{row.player_name ?? t.marketSignInToSeePlayers}</Text>
                    <Badge size="sm" variant="light" color="gray">
                      {row.language.toUpperCase()}
                    </Badge>
                    {row.quantity > 1 && <Text size="sm">x{row.quantity}</Text>}
                    {friendIds.has(row.tcg_account_id) && <Badge size="sm" variant="light">{t.friendsFilterBadge}</Badge>}
                    {row.is_mine && <Badge size="sm" variant="light" color="teal">{t.marketYours}</Badge>}
                    {row.exclusive_trade_id !== null && (
                      <Badge size="sm" variant="light" color="grape">
                        {t.marketCardsExclusive}
                      </Badge>
                    )}
                  </Group>
                  {!row.is_mine &&
                    (!session ? (
                      <Text size="xs" c="dimmed">
                        {t.marketSignInToOffer}
                      </Text>
                    ) : accountsLoading ? (
                      <Loader size="xs" />
                    ) : accountsError ? (
                      <Text c="red">{t.marketAccountsLoadFailed}</Text>
                    ) : !accounts.length ? (
                      <Text size="xs" c="dimmed">
                        {t.marketNoAccount}
                      </Text>
                    ) : !tradable ? (
                      <Text size="xs" c="dimmed">
                        {t.marketCardsNotTradable}
                      </Text>
                    ) : (
                      <Button
                        size="xs"
                        variant="light"
                        mih={36}
                        data-click-id={`CardPlayers/action:${card.card_id}:${key}`}
                        onClick={() =>
                          side === 'has' && row.exclusive_trade_id !== null
                            ? onOpenExclusive(row.exclusive_trade_id)
                            : setOffer(row)
                        }
                      >
                        {side === 'has'
                          ? row.exclusive_trade_id !== null
                            ? t.marketCardsSeeExclusive
                            : t.marketCardsOfferTrade
                          : t.marketCardsOfferCard}
                      </Button>
                    ))}
                </Group>
              );
            })}
        </Stack>
      ))}
      {offer && (
        <TradeOfferModal
          opened
          onClose={() => setOffer(null)}
          mode={offer.side === 'has' ? 'get' : 'give'}
          card={card}
          partnerAccount={offer.tcg_account_id}
          partnerName={offer.player_name}
          language={offer.language}
        />
      )}
    </Stack>
  );
}
