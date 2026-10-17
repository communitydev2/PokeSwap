import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Group,
  Modal,
  Paper,
  Select,
  Stack,
  Text,
  UnstyledButton,
} from '@mantine/core';
import { supabase } from '../../supabaseClient';
import { useAuthStore } from '../../store/userStore';
import { useLocalizationStore } from '../../store/useLocalizationStore';
import { useMyTcgAccounts } from '../../hooks/useMyTcgAccounts';
import { tradeErrorText } from '../../utils/tradeErrors';
import { CardPicture } from '../CardPicture';
import { CardMeta } from '../CardMeta';
import type { MarketExclusiveListing } from './ExclusiveTradeMarket';

export function ExclusiveOfferModal({
  opened,
  onClose,
  listing,
}: {
  opened: boolean;
  onClose: () => void;
  listing: MarketExclusiveListing;
}) {
  const t = useLocalizationStore((s) => s.t);
  const session = useAuthStore((s) => s.session);
  const { accounts, loading: accountsLoading } = useMyTcgAccounts();
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const account =
    accounts.find((a) => a.tcg_account_id === selectedAccount)?.tcg_account_id ?? accounts[0]?.tcg_account_id;
  const [eligible, setEligible] = useState<string[]>([]);
  const [loadedAccount, setLoadedAccount] = useState<string | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [error, setError] = useState<string>();
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [retry, setRetry] = useState(0);
  const sendingRef = useRef(false);

  useEffect(() => {
    setSent(false);
    setError(undefined);
    setPicked(null);
  }, [opened, listing.exclusive_trade_id, session]);

  useEffect(() => {
    let cancelled = false;
    setEligible([]);
    setPicked(null);
    setLoadedAccount(null);
    setLoadError(false);
    setError(undefined);
    if (!opened || !session || !account) {
      setLoading(false);
      return;
    }
    setLoading(true);
    async function load() {
      try {
        const trades = await supabase
          .from('cards_available_for_trade')
          .select('id, card_id, language')
          .eq('tcg_account_id', account!)
          .eq('language', listing.want_language);
        if (trades.error) throw trades.error;
        if (cancelled) return;
        const mine = (trades.data ?? []) as { id: number; card_id: string; language: string }[];
        const held = mine.length
          ? await supabase
              .from('exclusive_trade')
              .select('trade_card_id')
              .in(
                'trade_card_id',
                mine.map((r) => r.id),
              )
          : { data: [], error: null };
        if (held.error) throw held.error;
        if (cancelled) return;
        const heldIds = new Set((held.data ?? []).map((r) => r.trade_card_id));
        const available = new Set(mine.filter((r) => !heldIds.has(r.id)).map((r) => r.card_id));
        const ids = listing.want_cards.filter((c) => available.has(c.card_id)).map((c) => c.card_id);
        setEligible(ids);
        setPicked(ids[0] ?? null);
        setLoadedAccount(account!);
      } catch {
        if (!cancelled) setLoadError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [opened, account, listing, session, retry]);

  const ready = !!session && !!account && loadedAccount === account && !loading && !loadError;

  async function send() {
    if (!ready || !picked || !eligible.includes(picked) || listing.is_mine || sendingRef.current || sent)
      return;
    sendingRef.current = true;
    setSending(true);
    setError(undefined);
    try {
      const result = await supabase.rpc('send_exclusive_offer', {
        p_from: account,
        p_exclusive: listing.exclusive_trade_id,
        p_give_card: picked,
      });
      if (result.error) setError(tradeErrorText(t, result.error.message));
      else setSent(true);
    } catch (e) {
      setError(tradeErrorText(t, e instanceof Error ? e.message : undefined));
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }

  return (
    <Modal
      opened={opened}
      onClose={sending ? () => {} : onClose}
      title={t.marketExclusiveOffer}
      size="lg"
      closeButtonProps={{
        ...{ 'data-click-id': 'ExclusiveOfferModal/dismiss' },
        'aria-label': t.marketExclusiveDismiss,
        disabled: sending,
      }}
    >
      <Stack gap="sm">
        {sent ? (
          <Alert color="green">{t.marketOfferSent}</Alert>
        ) : (
          <>
            {!session ? (
              <Text size="sm" c="dimmed">
                {t.marketSignInToOffer}
              </Text>
            ) : accountsLoading ? (
              <Text size="sm" c="dimmed">
                {t.marketExclusiveEligibilityLoading}
              </Text>
            ) : !account ? (
              <Text size="sm" c="dimmed">
                {t.marketNoAccount}
              </Text>
            ) : null}
            {session && accounts.length > 1 && (
              <Select
                data-click-id="ExclusiveOfferModal/account"
                label={t.marketExclusiveAccount}
                data={accounts.map((a) => ({
                  value: a.tcg_account_id,
                  label: `${a.tcg_id_username} | ${a.tcg_id}`,
                }))}
                value={account ?? null}
                allowDeselect={false}
                disabled={sending}
                onChange={setSelectedAccount}
              />
            )}
            <Paper withBorder radius="md" p="sm">
              <Group wrap="nowrap">
                <CardPicture
                  cardImage={listing.card.card_image}
                  alt={listing.card.card_name}
                  width={56}
                  radius={4}
                />
                <div>
                  <Text size="xs" c="dimmed">
                    {t.marketExclusiveYouGet}
                  </Text>
                  <Text fw={600}>{listing.card.card_name}</Text>
                  <CardMeta card={listing.card} size="xs" />
                  <Badge size="sm" variant="light" color="gray">
                    {listing.language.toUpperCase()}
                  </Badge>
                </div>
              </Group>
            </Paper>
            <Text fw={600} size="sm">
              {t.marketExclusiveYouGive}
            </Text>
            {loading && (
              <Text size="sm" c="dimmed" role="status">
                {t.marketExclusiveEligibilityLoading}
              </Text>
            )}
            {loadError && (
              <Alert color="red">
                <Stack gap="xs">
                  <Text size="sm">{t.marketExclusiveEligibilityFailed}</Text>
                  <Button
                    data-click-id="ExclusiveOfferModal/retry"
                    size="xs"
                    onClick={() => setRetry((n) => n + 1)}
                  >
                    {t.marketExclusiveRetry}
                  </Button>
                </Stack>
              </Alert>
            )}
            {listing.want_cards.map((card) => {
              const canGive = ready && eligible.includes(card.card_id);
              return (
                <UnstyledButton
                  key={card.card_id}
                  data-click-id={`ExclusiveOfferModal/pick:${card.card_id}`}
                  disabled={!canGive || sending}
                  aria-pressed={picked === card.card_id}
                  onClick={() => setPicked(card.card_id)}
                  style={{
                    width: '100%',
                    padding: 8,
                    borderRadius: 8,
                    opacity: canGive ? 1 : 0.45,
                    border: `1px solid ${picked === card.card_id && canGive ? 'var(--mantine-color-blue-filled)' : 'var(--mantine-color-default-border)'}`,
                  }}
                >
                  <Group wrap="nowrap">
                    <CardPicture cardImage={card.card_image} alt={card.card_name} width={40} radius={3} />
                    <div>
                      <Text size="sm" fw={600}>
                        {card.card_name}
                      </Text>
                      <CardMeta card={card} size="xs" />
                      {ready && !canGive && (
                        <Text size="xs" c="dimmed">
                          {t.marketExclusiveNotEligible(listing.want_language.toUpperCase())}
                        </Text>
                      )}
                    </div>
                  </Group>
                </UnstyledButton>
              );
            })}
            {ready && eligible.length === 0 && (
              <Text size="sm" c="dimmed">
                {t.marketExclusiveNoneEligible(listing.want_language.toUpperCase())}
              </Text>
            )}
            {error && <Alert color="red">{error}</Alert>}
          </>
        )}
        <Group justify="flex-end">
          <Button
            data-click-id="ExclusiveOfferModal/close"
            variant="default"
            disabled={sending}
            onClick={onClose}
          >
            {t.close}
          </Button>
          {!sent && (
            <Button
              data-click-id="ExclusiveOfferModal/send"
              loading={sending}
              disabled={!ready || !picked || !eligible.includes(picked) || listing.is_mine}
              onClick={() => void send()}
            >
              {t.marketExclusiveSend}
            </Button>
          )}
        </Group>
      </Stack>
    </Modal>
  );
}
