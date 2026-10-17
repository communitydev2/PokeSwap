import { useEffect, useState } from 'react';
import { Alert, Badge, Button, Group, Loader, Modal, Select, Stack, Text, UnstyledButton } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { supabase } from '../../supabaseClient';
import { useLocalizationStore } from '../../store/useLocalizationStore';
import { useAuthStore } from '../../store/userStore';
import { useMyTcgAccounts } from '../../hooks/useMyTcgAccounts';
import { tradeErrorText } from '../../utils/tradeErrors';
import type { PokemonCard } from '../../types/PokemonCard';
import { CardPicture } from '../CardPicture';
import { CardMeta } from '../CardMeta';

type TradeRow = { id: number; language: string; quantity: number; card: PokemonCard };
type Props = {
  opened: boolean;
  onClose: () => void;
  mode: 'get' | 'give';
  card: PokemonCard;
  partnerAccount: string;
  partnerName: string | null;
  language: string;
};

// Read a trade list and remove cards reserved for an exclusive trade.
async function availableCards(account: string, rarity: string | null): Promise<TradeRow[]> {
  const { data, error } = await supabase
    .from('cards_available_for_trade')
    .select('id, language, quantity, card(*)')
    .eq('tcg_account_id', account);
  if (error) throw error;
  const rows = ((data ?? []) as unknown as TradeRow[]).filter(
    (r) => r.card && r.card.rarity_id === rarity && r.quantity > 0,
  );
  if (!rows.length) return [];
  const held = await supabase
    .from('exclusive_trade')
    .select('trade_card_id')
    .in(
      'trade_card_id',
      rows.map((r) => r.id),
    );
  if (held.error) throw held.error;
  const excluded = new Set((held.data ?? []).map((r) => r.trade_card_id));
  return rows.filter((r) => !excluded.has(r.id));
}

export function TradeOfferModal({ opened, onClose, mode, card, partnerAccount, partnerName, language }: Props) {
  const phone = useMediaQuery('(max-width: 36em)');
  const t = useLocalizationStore((s) => s.t);
  const session = useAuthStore((s) => s.session);
  const { accounts, loading: accountsLoading } = useMyTcgAccounts();
  const [chosenAccount, setChosenAccount] = useState<string | null>(null);
  const account =
    accounts.find((a) => a.tcg_account_id === chosenAccount)?.tcg_account_id ?? accounts[0]?.tcg_account_id;
  const [options, setOptions] = useState<TradeRow[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [hasCard, setHasCard] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadedFor, setLoadedFor] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const requestKey = JSON.stringify([account, mode, card.card_id, card.rarity_id, partnerAccount, language]);
  useEffect(() => {
    setSent(false);
    setChosenAccount(null);
  }, [opened]);
  useEffect(() => {
    let cancelled = false;
    setOptions([]);
    setSelected(null);
    setHasCard(false);
    setError(null);
    setLoadedFor('');
    if (!opened || !account || !session) {
      setLoading(false);
      return;
    }
    setLoading(true);
    async function load() {
      try {
        const mine = await availableCards(account!, card.rarity_id);
        const owns = mode === 'get' || mine.some((r) => r.card.card_id === card.card_id && r.language === language);
        const choices = mode === 'get' ? mine : owns ? await availableCards(partnerAccount, card.rarity_id) : [];
        if (cancelled) return;
        setHasCard(owns);
        setOptions(choices);
        setLoadedFor(requestKey);
      } catch (e) {
        if (!cancelled) setError(tradeErrorText(t, e instanceof Error ? e.message : undefined));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [opened, account, session, requestKey, mode, card.card_id, card.rarity_id, partnerAccount, language, t]);
  const picked = options.find((r) => r.id === selected);
  const ready =
    !!session && !!account && !!picked && hasCard && !loading && loadedFor === requestKey && !sending && !sent;
  const give = mode === 'get' ? picked : { card, language };
  const get = mode === 'get' ? { card, language } : picked;
  async function send() {
    if (!ready || !give || !get) return;
    setSending(true);
    setError(null);
    try {
      const result = await supabase.rpc('create_trade_offer', {
        p_from: account,
        p_give_card: give.card.card_id,
        p_give_language: give.language,
        p_to: partnerAccount,
        p_get_card: get.card.card_id,
        p_get_language: get.language,
      });
      if (result.error) {
        setError(tradeErrorText(t, result.error.message));
        return;
      }
      setSent(true);
    } catch (e) {
      setError(tradeErrorText(t, e instanceof Error ? e.message : undefined));
    } finally {
      setSending(false);
    }
  }
  function preview(label: string, value: { card: PokemonCard; language: string } | undefined) {
    if (!value) return null;
    return (
      <Stack gap="xs">
        <Text fw={600}>{label}</Text>
        <Group wrap="nowrap">
          <CardPicture cardImage={value.card.card_image} alt={value.card.card_name} width={56} />
          <div style={{ minWidth: 0 }}>
            <Text>{value.card.card_name}</Text>
            <CardMeta card={value.card} size="xs" />
            <Badge size="sm" color="gray">
              {value.language.toUpperCase()}
            </Badge>
          </div>
        </Group>
      </Stack>
    );
  }
  return (
    <Modal
      fullScreen={phone}
      styles={{ body: { display: 'flex', flexDirection: 'column', minHeight: phone ? 'calc(100dvh - 64px)' : undefined } }}
      opened={opened}
      onClose={sending ? () => {} : onClose}
      size="lg"
      title={t.marketCardsOfferTitle}
      closeButtonProps={{ ...{ 'data-click-id': 'TradeOfferModal/close-icon' }, 'aria-label': t.close }}
    >
      <Stack gap="sm" style={{ flex: 1, minWidth: 0 }}>
        <Text size="sm">{partnerName ?? t.marketSignInToSeePlayers}</Text>
        {sent ? (
          <>
            <Alert color="green">{t.marketOfferSent}</Alert>
            <Button mt="auto" data-click-id="TradeOfferModal/close-success" onClick={onClose}>
              {t.close}
            </Button>
          </>
        ) : (
          <>
            {!session ? (
              <Text c="dimmed">{t.marketSignInToOffer}</Text>
            ) : accountsLoading ? (
              <Loader size="sm" />
            ) : !accounts.length ? (
              <Text c="dimmed">{t.marketNoAccount}</Text>
            ) : (
              <>
                {accounts.length > 1 && (
                  <Select
                    data-click-id="TradeOfferModal/account"
                    label={t.selectPocketAccount}
                    value={account ?? null}
                    disabled={sending}
                    allowDeselect={false}
                    onChange={(value) => {
                      setChosenAccount(value);
                      setError(null);
                    }}
                    data={accounts.map((a) => ({
                      value: a.tcg_account_id,
                      label: `${a.tcg_id_username} | ${a.tcg_id}`,
                    }))}
                    renderOption={({ option }) => (
                      <span data-click-id={`TradeOfferModal/account-option:${option.value}`}>{option.label}</span>
                    )}
                  />
                )}
                {loading || (loadedFor !== requestKey && !error) ? (
                  <Loader size="sm" />
                ) : (
                  <>
                    {mode === 'give' && !hasCard ? (
                      <Text c="dimmed">{t.marketCardsNeedCard}</Text>
                    ) : !options.length ? (
                      <Text c="dimmed">{mode === 'get' ? t.marketCardsNeedSameRarity : t.marketCardsPartnerEmpty}</Text>
                    ) : (
                      <Stack gap="xs">
                        <Text size="sm">{mode === 'get' ? t.marketCardsPickYours : t.marketCardsPickTheirs}</Text>
                        {options.map((row) => (
                          <UnstyledButton
                            key={row.id}
                            data-click-id={`TradeOfferModal/card:${row.id}`}
                            disabled={sending}
                            aria-pressed={selected === row.id}
                            onClick={() => {
                              setSelected(row.id);
                              setError(null);
                            }}
                            p="xs"
                            style={{
                              border:
                                '1px solid ' +
                                (selected === row.id
                                  ? 'var(--mantine-color-blue-filled)'
                                  : 'var(--mantine-color-default-border)'),
                              borderRadius: 8,
                              background: selected === row.id ? 'var(--mantine-color-blue-light)' : undefined,
                            }}
                          >
                            <Group wrap="nowrap">
                              <CardPicture cardImage={row.card.card_image} alt={row.card.card_name} width={40} />
                              <div style={{ minWidth: 0 }}>
                                <Text size="sm">{row.card.card_name}</Text>
                                <CardMeta card={row.card} size="xs" />
                                <Text size="xs">{row.language.toUpperCase()}</Text>
                              </div>
                            </Group>
                          </UnstyledButton>
                        ))}
                      </Stack>
                    )}
                    {picked && (
                      <>
                        {preview(t.tradesYouGive, give)}
                        {preview(t.tradesYouGet, get)}
                      </>
                    )}
                  </>
                )}
              </>
            )}
            {error && <Alert color="red">{error}</Alert>}
            <Group justify="flex-end" grow={phone} wrap="nowrap" mt="auto" pt="md" style={{ position: 'sticky', bottom: 0, background: 'var(--mantine-color-body)', zIndex: 1 }}>
              <Button data-click-id="TradeOfferModal/close" variant="default" disabled={sending} onClick={onClose}>
                {t.close}
              </Button>
              <Button
                data-click-id="TradeOfferModal/send"
                disabled={!ready}
                loading={sending}
                onClick={() => void send()}
              >
                {t.tradesSendOffer}
              </Button>
            </Group>
          </>
        )}
      </Stack>
    </Modal>
  );
}
