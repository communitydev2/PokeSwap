import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActionIcon, Badge, Box, Button, Group, Indicator, Popover, ScrollArea, Stack, Text, UnstyledButton } from '@mantine/core';
import { IconBell } from '@tabler/icons-react';
import { useNavigate } from '@tanstack/react-router';
import { supabase } from '../supabaseClient';
import { useAuthStore } from '../store/userStore';
import { useStateStore } from '../store/useStateStore';
import { useLocalizationStore } from '../store/useLocalizationStore';
import { CardPicture } from './CardPicture';

// A row of the notification table (supabase/migrations/*_notifications.sql)
type Notification = {
  id: number;
  kind: string;
  read_at: string | null;
  created_at: string;
  tcg_account_id: string;
  partner_name: string;
  exclusive: boolean;
  account: { tcg_id_username: string | null; tcg_id: string } | null;
  my_card: { card_name: string; card_image: string | null } | null;
  their_card: { card_name: string; card_image: string | null } | null;
};

const SELECT =
  'id, kind, read_at, created_at, tcg_account_id, partner_name, exclusive, ' +
  'account:player_tcg_account(tcg_id_username, tcg_id), ' +
  'my_card:card!notification_my_card_id_fkey(card_name, card_image), ' +
  'their_card:card!notification_their_card_id_fkey(card_name, card_image)';

// Header bell with trade notifications for all of the player's Pocket accounts.
// Clicking one opens that account's offers in Manage Cards.
export function NotificationBell() {
  const t = useLocalizationStore((state) => state.t);
  const userId = useAuthStore((state) => state.user?.user_id);
  const setShowManageCardsMainMenu = useStateStore((state) => state.setShowManageCardsMainMenu);
  const setTradesRequest = useStateStore((state) => state.setTradesRequest);
  const navigate = useNavigate();
  const [opened, setOpened] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);

  const load = useCallback(async () => {
    if (!userId) return;
    const [list, count] = await Promise.all([
      supabase.from('notification').select(SELECT).order('created_at', { ascending: false }).limit(50),
      supabase.from('notification').select('id', { count: 'exact', head: true }).is('read_at', null),
    ]);
    if (list.error || count.error) {
      console.warn(list.error ?? count.error);
      return;
    }
    setItems(list.data as unknown as Notification[]);
    setUnread(count.count ?? 0);
  }, [userId]);

  // Live updates, plus a refresh when the tab gets focus and once a minute in case the live connection drops
  useEffect(() => {
    if (!userId) return;
    load();
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notification', filter: `user_id=eq.${userId}` }, () => load())
      .subscribe();
    const timer = window.setInterval(load, 60_000);
    window.addEventListener('focus', load);
    return () => {
      supabase.removeChannel(channel);
      window.clearInterval(timer);
      window.removeEventListener('focus', load);
    };
  }, [userId, load]);

  // Grouped by Pocket account, newest first
  const groups = useMemo(() => {
    const byAccount = new Map<string, Notification[]>();
    for (const n of items) byAccount.set(n.tcg_account_id, [...(byAccount.get(n.tcg_account_id) ?? []), n]);
    return [...byAccount.values()];
  }, [items]);

  async function markRead(ids: number[]) {
    if (!ids.length) return;
    const now = new Date().toISOString();
    setItems((list) => list.map((n) => (ids.includes(n.id) ? { ...n, read_at: n.read_at ?? now } : n)));
    setUnread((count) => Math.max(0, count - items.filter((n) => ids.includes(n.id) && !n.read_at).length));
    const { error } = await supabase.from('notification').update({ read_at: now }).in('id', ids).is('read_at', null);
    if (error) console.warn(error);
    load();
  }

  async function markAllRead() {
    const now = new Date().toISOString();
    setItems((list) => list.map((n) => ({ ...n, read_at: n.read_at ?? now })));
    setUnread(0);
    const { error } = await supabase.from('notification').update({ read_at: now }).is('read_at', null);
    if (error) console.warn(error);
    load();
  }

  function openNotification(n: Notification) {
    setOpened(false);
    if (!n.read_at) markRead([n.id]);
    navigate({ to: '/' });
    setShowManageCardsMainMenu(true);
    setTradesRequest({ tcgAccountId: n.tcg_account_id, seq: Date.now() });
  }

  if (!userId) return null;

  return (
    <Popover opened={opened} onChange={setOpened} position="bottom-end" width={360} shadow="md" withinPortal>
      <Popover.Target>
        <Indicator label={unread > 99 ? '99+' : unread} size={18} color="red" disabled={unread === 0} offset={4}>
          <ActionIcon data-click-id="NotificationBell/open" variant="default" size="lg" radius="md"
            aria-label={t.notificationsOpen(unread)} onClick={() => setOpened((o) => !o)}>
            <IconBell size={18} />
          </ActionIcon>
        </Indicator>
      </Popover.Target>
      <Popover.Dropdown p={0} maw="calc(100vw - 32px)">
        <Group justify="space-between" px="md" py="sm">
          <Text fw={600}>{t.notifications}</Text>
          {unread > 0 && (
            <Button data-click-id="NotificationBell/mark-all-read" size="compact-xs" variant="subtle" onClick={markAllRead}>
              {t.notificationsMarkAllRead}
            </Button>
          )}
        </Group>
        <ScrollArea.Autosize mah={440} type="auto">
          {items.length === 0 && (
            <Text size="sm" c="dimmed" ta="center" px="md" pb="lg">{t.notificationsEmpty}</Text>
          )}
          {groups.map((group) => (
            <Box key={group[0].tcg_account_id} pb="xs">
              <Text size="xs" fw={700} c="dimmed" tt="uppercase" px="md" py={4}>
                {group[0].account?.tcg_id_username ?? group[0].account?.tcg_id ?? ''}
              </Text>
              <Stack gap={0}>
                {group.map((n) => (
                  <UnstyledButton key={n.id} data-click-id={`NotificationBell/item:${n.id}`} onClick={() => openNotification(n)}
                    px="md" py="xs" style={{ background: n.read_at ? undefined : 'var(--mantine-color-blue-light)' }}>
                    <Group wrap="nowrap" gap="sm" align="flex-start">
                      <CardPicture cardImage={n.their_card?.card_image} alt={n.their_card?.card_name ?? ''} width={32} radius={3} />
                      <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                        <Text size="sm" fw={n.read_at ? 400 : 600}>
                          {(t.notificationMessage[n.kind] ?? t.notificationMessage.offer_received)(
                            n.partner_name, n.my_card?.card_name ?? '', n.their_card?.card_name ?? ''
                          )}
                        </Text>
                        <Group gap={6}>
                          <Text size="xs" c="dimmed">{t.timeAgo(new Date(n.created_at))}</Text>
                          {n.exclusive && <Badge size="xs" variant="light" color="grape">{t.exclusiveBadge}</Badge>}
                        </Group>
                      </Stack>
                      {!n.read_at && <Box w={8} h={8} mt={6} style={{ borderRadius: '50%', background: 'var(--mantine-color-blue-filled)', flexShrink: 0 }} />}
                    </Group>
                  </UnstyledButton>
                ))}
              </Stack>
            </Box>
          ))}
        </ScrollArea.Autosize>
      </Popover.Dropdown>
    </Popover>
  );
}
