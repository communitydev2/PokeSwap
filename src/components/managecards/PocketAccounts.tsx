import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Group, Modal, Paper, SimpleGrid, Stack, Text, TextInput, UnstyledButton } from '@mantine/core';
import { supabase } from '../../supabaseClient';
import { useAuthStore } from '../../store/userStore';
import { useLocalizationStore } from '../../store/useLocalizationStore';
import { ManageTCGAccountsMenu } from './ManageTCGAccountsMenu';
import { normalizeFriendId, validateAccounts, type AccountErrors, type AccountFields } from './accountValidation';

type Account = { tcg_account_id: string; tcg_id_username: string; tcg_id: string };
type Counts = { wishlist: number; trade: number; exclusive: number; offers: number };
export type AccountDestination = keyof Counts;
export type AccountBack = { onClick: () => void; disabled: boolean };
const zero = (): Counts => ({ wishlist: 0, trade: 0, exclusive: 0, offers: 0 });

export function PocketAccounts({ onChanged, onNavigate, onBackChanged }: {
  onBackChanged: (back: AccountBack | null) => void;
  onChanged: () => void;
  onNavigate: (id: string, destination: AccountDestination) => void;
}) {
  const userId = useAuthStore((s) => s.session?.user.id);
  // A different sign-in gets a fresh component, including all pending edits.
  return userId ? <AccountScreen key={userId} userId={userId} onBackChanged={onBackChanged} onChanged={onChanged} onNavigate={onNavigate} /> : null;
}

function AccountScreen({ userId, onChanged, onNavigate, onBackChanged }: {
  onBackChanged: (back: AccountBack | null) => void;
  userId: string; onChanged: () => void; onNavigate: (id: string, destination: AccountDestination) => void;
}) {
  const t = useLocalizationStore((s) => s.t);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [counts, setCounts] = useState<Record<string, Counts>>({});
  const [drafts, setDrafts] = useState<Record<string, AccountFields>>({});
  const [errors, setErrors] = useState<Partial<Record<string, AccountErrors>>>({});
  const [detail, setDetail] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [reload, setReload] = useState(0);
  const alive = useRef(true);
  const running = useRef(false);
  const current = () => alive.current && useAuthStore.getState().session?.user.id === userId;
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true); setFailed(false);
      try {
        const result = await supabase.from('player_tcg_account').select('tcg_account_id, tcg_id_username, tcg_id').eq('user_id', userId).order('created_at');
        if (result.error) throw result.error;
        const rows = result.data as Account[];
        const ids = rows.map((a) => a.tcg_account_id);
        const totals: Record<string, Counts> = Object.fromEntries(ids.map((id) => [id, zero()]));
        if (ids.length) {
          // Page the grouped reads so PostgREST's row limit cannot truncate totals.
          const read = async (table: string, select: string, filter: (q: any) => any) => {
            const all: any[] = [];
            for (let offset = 0; ; offset += 1000) {
              const page = await filter(supabase.from(table).select(select)).order('id').range(offset, offset + 999);
              if (page.error) throw page.error;
              all.push(...page.data);
              if (page.data.length < 1000) return all;
            }
          };
          const [wish, trade, exclusive, offers] = await Promise.all([
            read('wishlist', 'id, tcg_account_id, quantity', (q) => q.in('tcg_account_id', ids)),
            read('cards_available_for_trade', 'id, tcg_account_id, quantity', (q) => q.in('tcg_account_id', ids)),
            read('exclusive_trade', 'id, trade:cards_available_for_trade!inner(tcg_account_id)', (q) => q.in('trade.tcg_account_id', ids)),
            read('trade_offer', 'id, from_account, to_account', (q) => q.in('status', ['pending', 'accepted']).or('from_account.in.(' + ids.join(',') + '),to_account.in.(' + ids.join(',') + ')')),
          ]);
          for (const row of wish) totals[row.tcg_account_id].wishlist += row.quantity;
          for (const row of trade) totals[row.tcg_account_id].trade += row.quantity;
          for (const row of exclusive) totals[row.trade.tcg_account_id].exclusive++;
          for (const row of offers) for (const id of new Set<string>([row.from_account, row.to_account])) if (totals[id]) totals[id].offers++;
        }
        if (cancelled || !current()) return;
        setAccounts(rows); setCounts(totals);
        setDrafts(Object.fromEntries(rows.map((a) => [a.tcg_account_id, { name: a.tcg_id_username, tcgId: a.tcg_id }])));
      } catch (error) {
        console.warn(error);
        if (!cancelled && current()) setFailed(true);
      } finally { if (!cancelled && current()) setLoading(false); }
    }
    load();
    return () => { cancelled = true; };
  }, [userId, reload]);

  const account = accounts.find((a) => a.tcg_account_id === detail);
  useEffect(() => {
    onBackChanged(account ? {
      onClick: () => { setDetail(null); setErrors({}); setMessage(null); },
      disabled: busy,
    } : null);
    return () => onBackChanged(null);
  }, [account, busy, onBackChanged]);

  function update(id: string, field: keyof AccountFields, value: string) {
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
    setErrors((prev) => ({ ...prev, [id]: { ...prev[id], [field]: undefined } }));
    setMessage(null);
  }
  async function save(ids: string[]) {
    if (running.current || !current()) return;
    const changes = accounts.filter((a) => ids.includes(a.tcg_account_id)).map((original) => {
      const draft = drafts[original.tcg_account_id];
      const idChanged = normalizeFriendId(draft.tcgId) !== normalizeFriendId(original.tcg_id);
      return {
        original,
        idChanged,
        normalized: { name: draft.name.trim(), tcgId: idChanged ? normalizeFriendId(draft.tcgId) : original.tcg_id },
      };
    }).filter(({ original, normalized }) => normalized.name !== original.tcg_id_username || normalized.tcgId !== original.tcg_id);
    const found: Partial<Record<string, AccountErrors>> = {};
    for (const { original, normalized, idChanged } of changes) {
      const id = original.tcg_account_id;
      const rowErrors = validateAccounts([{ key: id, ...normalized }], t)[id] ?? {};
      if (!idChanged) delete rowErrors.tcgId;
      else if (accounts.some((other) => other.tcg_account_id !== id && normalizeFriendId(drafts[other.tcg_account_id].tcgId) === normalized.tcgId)) {
        rowErrors.tcgId = t.qaManageAccountDuplicate;
      }
      if (rowErrors.name || rowErrors.tcgId) found[id] = rowErrors;
    }
    setErrors(found);
    if (Object.keys(found).length) return;
    running.current = true; setBusy(true); setMessage(null);
    const saved = new Map<string, AccountFields>();
    const failures: Partial<Record<string, AccountErrors>> = {};
    for (const { original, normalized } of changes) {
      if (!current()) break;
      const id = original.tcg_account_id;
      try {
        const result = await supabase.from('player_tcg_account').update({ tcg_id_username: normalized.name, tcg_id: normalized.tcgId }).eq('tcg_account_id', id).eq('user_id', userId).select('tcg_account_id').single();
        if (result.error) throw result.error;
        saved.set(id, normalized);
      } catch (error) {
        failures[id] = { tcgId: (error as { code?: string }).code === '23505' ? t.pocketAccountsRegistered : t.qaManageAccountSaveFailed };
      }
    }
    if (current()) {
      setAccounts((prev) => prev.map((a) => saved.has(a.tcg_account_id) ? { ...a, tcg_id_username: saved.get(a.tcg_account_id)!.name, tcg_id: saved.get(a.tcg_account_id)!.tcgId } : a));
      setDrafts((prev) => ({ ...prev, ...Object.fromEntries(saved) }));
      setErrors(failures); setBusy(false);
      setMessage(Object.keys(failures).length ? t.pocketAccountsPartial : t.pocketAccountsSaved);
      if (!Object.keys(failures).length) setEditing(false);
    }
    if (saved.size && useAuthStore.getState().session?.user.id === userId) onChanged();
    running.current = false;
  }
  async function remove(account: Account) {
    if (running.current || !current() || confirmation !== account.tcg_id_username) return;
    running.current = true; setBusy(true); setMessage(null);
    try {
      const result = await supabase.from('player_tcg_account').delete().eq('tcg_account_id', account.tcg_account_id).eq('user_id', userId).select('tcg_account_id').single();
      if (result.error) throw result.error;
      if (current()) { setRemoving(false); setDetail(null); setConfirmation(''); setReload((n) => n + 1); }
      if (useAuthStore.getState().session?.user.id === userId) onChanged();
    } catch (error) { console.warn(error); if (current()) setMessage(t.pocketAccountsDeleteFailed); }
    finally { running.current = false; if (current()) setBusy(false); }
  }
  const fields = (a: Account) => <Stack gap="sm">
    <TextInput data-click-id={`PocketAccounts/name:${a.tcg_account_id}`} label={t.qaManageAccountName} value={drafts[a.tcg_account_id]?.name ?? ''} disabled={busy} error={errors[a.tcg_account_id]?.name} onChange={(e) => update(a.tcg_account_id, 'name', e.target.value)} />
    <TextInput data-click-id={`PocketAccounts/friend-id:${a.tcg_account_id}`} label={t.qaManageAccountId} inputMode="numeric" value={drafts[a.tcg_account_id]?.tcgId ?? ''} disabled={busy} error={errors[a.tcg_account_id]?.tcgId} onChange={(e) => update(a.tcg_account_id, 'tcgId', e.target.value)} />
  </Stack>;
  const labels = { wishlist: t.pocketAccountsWishlist, trade: t.pocketAccountsTrade, exclusive: t.pocketAccountsExclusive, offers: t.pocketAccountsOffers };
  const summary = (a: Account, links = false) => <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="xs">
    {(Object.keys(labels) as AccountDestination[]).map((key) => links ? <Button key={key} data-click-id={`PocketAccounts/${key}:${a.tcg_account_id}`} variant="light" styles={{ label: { whiteSpace: 'normal' } }} h="auto" mih={54} onClick={() => onNavigate(a.tcg_account_id, key)}>{labels[key]}: {counts[a.tcg_account_id]?.[key] ?? 0}</Button> : <Text key={key} size="sm">{labels[key]}: {counts[a.tcg_account_id]?.[key] ?? 0}</Text>)}
  </SimpleGrid>;
  if (loading) return <Text role="status">{t.pocketAccountsLoading}</Text>;
  if (failed) return <Stack><Alert color="red">{t.marketAccountsLoadFailed}</Alert><Button data-click-id="PocketAccounts/retry" onClick={() => setReload((n) => n + 1)}>{t.pocketAccountsRetry}</Button></Stack>;
  return <Stack gap="md" data-click-context="Pocket accounts">
    {message && <Alert color={Object.keys(errors).length || message === t.pocketAccountsDeleteFailed ? 'red' : 'teal'}>{message}</Alert>}
    {account ? <>
      <Text fw={600} style={{ overflowWrap: 'anywhere' }}>{account.tcg_id_username}</Text>
      {fields(account)}
      <Button data-click-id="PocketAccounts/save" loading={busy} onClick={() => save([account.tcg_account_id])}>{t.pocketAccountsSave}</Button>
      {summary(account, true)}
      <Button data-click-id="PocketAccounts/remove" color="red" variant="light" disabled={busy} onClick={() => { setConfirmation(''); setRemoving(true); }}>{t.pocketAccountsRemove}</Button>
      <Modal opened={removing} onClose={() => { if (!busy) setRemoving(false); }} title={t.pocketAccountsRemove} closeButtonProps={{ disabled: busy, ...{ 'data-click-id': 'PocketAccounts/remove-close' } }} centered>
        <Stack><Text>{t.pocketAccountsDeleteWarning(account.tcg_id_username)}</Text>
          <TextInput data-click-id="PocketAccounts/remove-name" label={t.pocketAccountsConfirmName} value={confirmation} disabled={busy} onChange={(e) => setConfirmation(e.target.value)} />
          {message === t.pocketAccountsDeleteFailed && <Alert color="red">{message}</Alert>}
          <Group justify="flex-end"><Button data-click-id="PocketAccounts/remove-cancel" variant="default" disabled={busy} onClick={() => setRemoving(false)}>{t.cancel}</Button><Button data-click-id="PocketAccounts/remove-confirm" color="red" disabled={confirmation !== account.tcg_id_username} loading={busy} onClick={() => remove(account)}>{t.pocketAccountsRemove}</Button></Group>
        </Stack>
      </Modal>
    </> : <>
      {accounts.length === 0 ? <Text>{t.pocketAccountsEmpty}</Text> : <Group justify="flex-end">
        {editing ? <><Button data-click-id="PocketAccounts/cancel-all" variant="default" disabled={busy} onClick={() => { setEditing(false); setErrors({}); setMessage(null); setDrafts(Object.fromEntries(accounts.map((a) => [a.tcg_account_id, { name: a.tcg_id_username, tcgId: a.tcg_id }]))); }}>{t.cancel}</Button><Button data-click-id="PocketAccounts/save-all" loading={busy} onClick={() => save(accounts.map((a) => a.tcg_account_id))}>{t.pocketAccountsSaveAll}</Button></> : <Button data-click-id="PocketAccounts/edit-all" variant="default" onClick={() => { setEditing(true); setMessage(null); }}>{t.pocketAccountsEditAll}</Button>}
      </Group>}
      {accounts.map((a) => <Paper key={a.tcg_account_id} withBorder radius="md" p="md" data-click-context={a.tcg_id_username}>
        {editing ? fields(a) : <UnstyledButton data-click-id={`PocketAccounts/open:${a.tcg_account_id}`} w="100%" onClick={() => { setDetail(a.tcg_account_id); setErrors({}); setMessage(null); }}><Stack gap="xs"><Text fw={600} style={{ overflowWrap: 'anywhere' }}>{a.tcg_id_username}</Text><Text ff="monospace">{a.tcg_id.match(/.{1,4}/g)?.join(' ')}</Text>{summary(a)}</Stack></UnstyledButton>}
      </Paper>)}
      {!editing && <ManageTCGAccountsMenu onCreated={() => { setReload((n) => n + 1); onChanged(); }} />}
    </>}
  </Stack>;
}
