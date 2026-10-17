import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';
import {
  Alert,
  Badge,
  Button,
  Container,
  Group,
  Loader,
  Modal,
  Paper,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { supabase } from '../../supabaseClient';
import { useAuthStore } from '../../store/userStore';
import { useLocalizationStore } from '../../store/useLocalizationStore';
import { CardPicture } from '../CardPicture';
import { TradeOfferModal } from '../market/TradeOfferModal';
import type { PokemonCard } from '../../types/PokemonCard';

type Friend = {
  user_id: string;
  username: string;
  status: 'friend' | 'incoming' | 'outgoing';
  request_id: number;
  since: string;
  pocket_accounts: { tcg_account_id: string; name: string; tcg_id: string }[];
};
type Card = {
  tcg_account_id: string;
  account_name: string;
  list: string;
  card_id: string;
  card_name: string;
  card_local_id: string;
  set_name: string;
  card_image: string | null;
  language: string;
  quantity: number;
  exclusive: boolean;
};

export function FriendsPage() {
  const t = useLocalizationStore((s) => s.t);
  const userId = useAuthStore((s) => s.session?.user.id);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selected, setSelected] = useState<Friend | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const generation = useRef(0);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState<{ target: string; message: string } | null>(null);
  const [notice, setNotice] = useState('');
  const [copied, setCopied] = useState('');
  const [remove, setRemove] = useState<Friend | null>(null);
  const [offer, setOffer] = useState<{ row: Card; card: PokemonCard } | null>(null);
  const load = useCallback(async () => {
    const seq = ++generation.current;
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const list = await supabase.rpc('list_friends');
      if (list.error) throw list.error;
      const rows = (list.data ?? []) as Friend[];
      let detail: Card[] = [];
      if (selected && rows.some((r) => r.user_id === selected.user_id && r.status === 'friend')) {
        const result = await supabase.rpc('friend_cards', { p_user: selected.user_id });
        if (result.error) throw result.error;
        detail = (result.data ?? []) as Card[];
      }
      if (seq !== generation.current) return;
      setFriends(rows);
      setCards(detail);
      if (selected && !rows.some((r) => r.user_id === selected.user_id && r.status === 'friend'))
        setSelected(null);
    } catch (e) {
      if (seq === generation.current)
        setError(t.friendsErrors[(e as { message?: string }).message ?? ''] ?? t.friendsFailed);
    } finally {
      if (seq === generation.current) setLoading(false);
    }
  }, [userId, selected, t]);
  useEffect(() => {
    void load();
    return () => {
      generation.current++;
    };
  }, [load]);
  useEffect(() => {
    setSelected(null);
    setFriends([]);
    setCards([]);
    setOffer(null);
    setRemove(null);
    setNotice('');
    setError('');
    setActionError(null);
    setUsername('');
    setCopied('');
  }, [userId]);
  async function action(
    run: () => PromiseLike<{ error: { message: string } | null; data?: unknown }>,
    target: string,
    sent = false,
  ) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setActionError(null);
    setNotice('');
    const actor = userId;
    try {
      const result = await run();
      if (useAuthStore.getState().session?.user.id !== actor) return;
      if (result.error) throw result.error;
      if (sent) {
        setNotice(result.data === 'accepted' ? t.friendsAccepted : t.friendsSent);
        setUsername('');
      }
      setRemove(null);
      await load();
    } catch (e) {
      if (useAuthStore.getState().session?.user.id === actor) {
        await load();
        setActionError({ target, message: t.friendsErrors[(e as { message?: string }).message ?? ''] ?? t.friendsActionFailed });
      }
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }
  async function openOffer(row: Card) {
    await action(async () => {
      const result = await supabase.from('card').select('*').eq('card_id', row.card_id).single();
      if (!result.error && result.data && useAuthStore.getState().session?.user.id === userId)
        setOffer({ row, card: result.data as PokemonCard });
      return result;
    }, 'offer:' + [row.tcg_account_id, row.list, row.card_id, row.language].join(':'));
  }
  async function copy(id: string, key: string) {
    try {
      await navigator.clipboard.writeText(id);
      setCopied(key);
    } catch {
      setActionError({ target: 'copy:' + key, message: t.friendsCopyFailed });
    }
  }
  function showActionError(target: string) {
    return actionError?.target === target ? (
      <Alert color="red" role="alert">{actionError.message}</Alert>
    ) : null;
  }
  if (!userId)
    return (
      <Container size="md" py="xl">
        <Stack>
          <Title order={1}>{t.friendsTitle}</Title>
          <Text>{t.friendsSignIn}</Text>
          <Link to="/" data-click-id="Friends/sign-in">
            {t.friendsHome}
          </Link>
        </Stack>
      </Container>
    );
  return (
    <Container size="md" py="xl">
      <Stack gap="lg">
        <Title order={1}>{selected?.username ?? t.friendsTitle}</Title>
        {error && (
          <Alert color="red" role="alert">
            {error}
            <Button
              variant="subtle"
              data-click-id="Friends/retry"
              onClick={() => void load()}
              disabled={busy}
            >
              {t.friendsRetry}
            </Button>
          </Alert>
        )}
        {notice && (
          <Alert color="green" role="status">
            {notice}
          </Alert>
        )}
        {selected ? (
          <Button
            variant="default"
            data-click-id="Friends/back"
            onClick={() => {
              setSelected(null);
              setOffer(null);
            }}
            disabled={busy}
          >
            {t.friendsBack}
          </Button>
        ) : (
          <Paper withBorder p="md">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (username.trim())
                  void action(
                    () => supabase.rpc('send_friend_request', { p_username: username.trim() }),
                    'send',
                    true,
                  );
              }}
            >
              <Stack>
                <Title order={2}>{t.friendsAdd}</Title>
                <TextInput
                  label={t.friendsUsername}
                  error={actionError?.target === 'send' ? actionError.message : undefined}
                  value={username}
                  onChange={(e) => setUsername(e.currentTarget.value)}
                  disabled={busy}
                  data-click-id="Friends/username"
                />
                <Button type="submit" disabled={busy || !username.trim()} data-click-id="Friends/send">
                  {t.friendsSend}
                </Button>
              </Stack>
            </form>
          </Paper>
        )}
        {loading ? (
          <Group>
            <Loader size="sm" />
            <Text role="status">{t.friendsLoading}</Text>
          </Group>
        ) : selected ? (
          <>
            {[
              ...new Map([
                ...selected.pocket_accounts.map((a) => [a.tcg_account_id, a.name] as const),
                ...cards.map((c) => [c.tcg_account_id, c.account_name] as const),
              ]).entries(),
            ].map(([id, name]) => (
              <Paper key={id} withBorder p="md">
                <Stack>
                  <Title order={2}>{name}</Title>
                  {['wishlist', 'trade'].map((list) => (
                    <Stack key={list}>
                      <Title order={3}>{list === 'wishlist' ? t.friendsWishlist : t.friendsTrade}</Title>
                      {!cards.some((c) => c.tcg_account_id === id && c.list === list) && (
                        <Text c="dimmed">{t.friendsNoCards}</Text>
                      )}
                      {cards
                        .filter((c) => c.tcg_account_id === id && c.list === list)
                        .map((c) => {
                          const key = [id, list, c.card_id, c.language].join(':');
                          return (
                            <Paper key={key} withBorder p="sm" data-click-context={key}>
                              <Group align="flex-start" wrap="nowrap">
                                <CardPicture
                                  cardImage={c.card_image}
                                  alt={c.card_name}
                                  width={60}
                                  zoom={false}
                                />
                                <Stack gap={4} style={{ minWidth: 0, flex: 1 }}>
                                  <Text fw={600}>{c.card_name}</Text>
                                  <Text size="sm">
                                    {c.set_name} · {c.card_local_id}
                                  </Text>
                                  <Text size="sm">
                                    {c.language.toUpperCase()} · {t.quantity}: {c.quantity}
                                  </Text>
                                  {c.exclusive && <Badge color="grape">{t.exclusiveBadge}</Badge>}
                                  {list === 'trade' && !c.exclusive && (
                                    <Button
                                      size="xs"
                                      disabled={busy}
                                      data-click-id={'Friends/offer:' + key}
                                      onClick={() => void openOffer(c)}
                                    >
                                      {t.friendsOffer}
                                    </Button>
                                  )}
                                  {showActionError('offer:' + key)}
                                </Stack>
                              </Group>
                            </Paper>
                          );
                        })}
                    </Stack>
                  ))}
                </Stack>
              </Paper>
            ))}
            {!selected.pocket_accounts.length && !cards.length && (
              <Text c="dimmed">{t.friendsNoAccounts}</Text>
            )}
          </>
        ) : (
          <>
            <Title order={2}>{t.friendsRequests}</Title>
            {(['incoming', 'outgoing'] as const).map((status) => (
              <Stack key={status}>
                <Title order={3}>{status === 'incoming' ? t.friendsIncoming : t.friendsOutgoing}</Title>
                {!friends.some((f) => f.status === status) && <Text c="dimmed">{t.friendsNoRequests}</Text>}
                {friends
                  .filter((f) => f.status === status)
                  .map((f) => (
                    <Paper withBorder p="md" key={f.user_id}>
                      <Group justify="space-between">
                        <Text style={{ overflowWrap: 'anywhere' }}>{f.username}</Text>
                        <Group>
                          {status === 'incoming' ? (
                            <>
                              {[true, false].map((accept) => (
                                <Button
                                  key={String(accept)}
                                  disabled={busy}
                                  variant={accept ? 'filled' : 'default'}
                                  data-click-id={'Friends/' + (accept ? 'accept:' : 'decline:') + f.user_id}
                                  onClick={() =>
                                    void action(() =>
                                      supabase.rpc('respond_friend_request', {
                                        p_request: f.request_id,
                                        p_accept: accept,
                                      }),
                                      'request:' + f.user_id,
                                    )
                                  }
                                >
                                  {accept ? t.tradesAccept : t.tradesDecline}
                                </Button>
                              ))}
                            </>
                          ) : (
                            <Button
                              disabled={busy}
                              data-click-id={'Friends/cancel:' + f.user_id}
                              onClick={() =>
                                void action(() => supabase.rpc('remove_friend', { p_user: f.user_id }), 'request:' + f.user_id)
                              }
                            >
                              {t.cancel}
                            </Button>
                          )}
                        </Group>
                      </Group>
                      {showActionError('request:' + f.user_id)}
                    </Paper>
                  ))}
              </Stack>
            ))}
            <Title order={2}>{t.friendsTitle}</Title>
            {!friends.some((f) => f.status === 'friend') && <Text c="dimmed">{t.friendsEmpty}</Text>}
            {friends
              .filter((f) => f.status === 'friend')
              .map((f) => (
                <Paper withBorder p="md" key={f.user_id}>
                  <Stack>
                    <Text fw={600} style={{ overflowWrap: 'anywhere' }}>
                      {f.username}
                    </Text>
                    <Text size="sm" c="dimmed">
                      {t.friendsSince(new Date(f.since).toLocaleDateString())}
                    </Text>
                    {!f.pocket_accounts.length && <Text c="dimmed">{t.friendsNoAccounts}</Text>}
                    {f.pocket_accounts.map((a) => (
                      <Group key={a.tcg_account_id} justify="space-between">
                        <div style={{ minWidth: 0 }}>
                          <Text style={{ overflowWrap: 'anywhere' }}>{a.name}</Text>
                          <Text size="sm" style={{ overflowWrap: 'anywhere' }}>
                            {a.tcg_id
                              .replace(/\s/g, '')
                              .match(/.{1,4}/g)
                              ?.join(' ')}
                          </Text>
                        </div>
                        <Button
                          variant="light"
                          data-click-id={'Friends/copy:' + a.tcg_account_id}
                          onClick={() => void copy(a.tcg_id, a.tcg_account_id)}
                        >
                          {copied === a.tcg_account_id ? t.tradesCopied : t.tradesCopy}
                        </Button>
                      {showActionError('copy:' + a.tcg_account_id)}
                      </Group>
                    ))}
                    <Group>
                      <Button
                        disabled={busy}
                        data-click-id={'Friends/cards:' + f.user_id}
                        onClick={() => {
                          setSelected(f);
                          setNotice('');
                        }}
                      >
                        {t.friendsSeeCards}
                      </Button>
                      <Button
                        disabled={busy}
                        variant="default"
                        color="red"
                        data-click-id={'Friends/remove:' + f.user_id}
                        onClick={() => { setActionError(null); setRemove(f); }}
                      >
                        {t.friendsRemove}
                      </Button>
                    </Group>
                  </Stack>
                </Paper>
              ))}
          </>
        )}
        <Modal
          opened={!!remove}
          onClose={() => {
            if (!busy) setRemove(null);
          }}
          title={t.friendsRemove}
          closeButtonProps={{ 'aria-label': t.close, ...{ 'data-click-id': 'Friends/remove-close' } }}
        >
          <Stack>
            <Text>{t.friendsRemoveConfirm(remove?.username ?? '')}</Text>
            {showActionError('remove:' + remove?.user_id)}
            <Group>
              <Button
                disabled={busy}
                variant="default"
                data-click-id="Friends/remove-cancel"
                onClick={() => setRemove(null)}
              >
                {t.cancel}
              </Button>
              <Button
                color="red"
                loading={busy}
                data-click-id="Friends/remove-confirm"
                onClick={() => {
                  if (remove) void action(() => supabase.rpc('remove_friend', { p_user: remove.user_id }), 'remove:' + remove.user_id);
                }}
              >
                {t.friendsRemove}
              </Button>
            </Group>
          </Stack>
        </Modal>
        {offer && (
          <TradeOfferModal
            opened
            mode="get"
            card={offer.card}
            partnerAccount={offer.row.tcg_account_id}
            partnerName={offer.row.account_name}
            language={offer.row.language}
            onClose={() => {
              setOffer(null);
              void load();
            }}
          />
        )}
      </Stack>
    </Container>
  );
}
