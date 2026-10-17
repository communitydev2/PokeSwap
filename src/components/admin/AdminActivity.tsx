import { useEffect, useState } from 'react';
import { Alert, Button, Group, Stack, Table, Text } from '@mantine/core';
import { useLocalizationStore } from '../../store/useLocalizationStore';
import { adminRpc, formatDateTime } from './adminRpc';

type Log = {
  id: number;
  created_at: string;
  admin_email: string | null;
  action: string;
  target: string | null;
  details: unknown;
  total_count: number;
};

export function AdminActivity() {
  const t = useLocalizationStore((s) => s.t);
  const [page, setPage] = useState(0);
  const [revision, setRevision] = useState(0);
  const [rows, setRows] = useState<Log[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    void adminRpc<Log[]>('admin_log_list', {
      p_limit: 50,
      p_offset: page * 50,
    }).then((result) => {
      if (!active) return;
      setRows(result.data ?? []);
      setTotal(Number(result.data?.[0]?.total_count ?? 0));
      setError(result.error);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [page, revision]);
  function description(row: Log) {
    const details =
      row.details &&
      typeof row.details === 'object' &&
      !Array.isArray(row.details)
        ? (row.details as Record<string, unknown>)
        : {};
    const text = (...keys: string[]) => {
      for (const key of keys)
        if (typeof details[key] === 'string' && details[key])
          return details[key] as string;
      return '';
    };
    const email = text('email', 'user_email');
    const username = text('username', 'user_username');
    const user =
      email && username ? email + ' (' + username + ')' : email || username;
    const label = t.adminActivityLabels[row.action] ?? row.action;
    const fallback = label + (row.target ? ': ' + row.target : '');
    switch (row.action) {
      case 'delete_user':
        return user ? t.adminActivityDelete(user) : fallback;
      case 'run_card_sync':
        return label;
      case 'ban_user':
        return user &&
          (details.days === null || typeof details.days === 'number')
          ? t.adminActivityBan(user, details.days as number | null)
          : fallback;
      case 'set_username': {
        const before = text('old_username', 'previous_username');
        const after = text('new_username', 'username');
        return before && after
          ? t.adminActivityRename(before, after)
          : fallback;
      }
      case 'unban_user':
      case 'sign_out_user':
        return user ? label + ': ' + user : fallback;
      case 'add_banned_word':
      case 'remove_banned_word':
        return text('word') ? label + ' “' + text('word') + '”' : fallback;
      case 'cancel_trade_offer': {
        const from = text('from_name', 'from_username', 'from_player');
        const to = text('to_name', 'to_username', 'to_player');
        const give = text('give_card', 'give_card_name');
        const get = text('get_card', 'get_card_name');
        return from && to && give && get
          ? t.adminActivityOffer(from, to, give, get)
          : fallback;
      }
      case 'end_exclusive_trade': {
        const owner = text('owner_name', 'owner', 'owner_username');
        const card = text('card', 'card_name');
        return owner && card ? t.adminActivityExclusive(owner, card) : fallback;
      }
      default:
        return fallback;
    }
  }
  const pages = Math.max(1, Math.ceil(total / 50));
  useEffect(() => {
    if (!loading && !error && page >= pages) setPage(pages - 1);
  }, [loading, error, page, pages]);
  return (
    <Stack style={{ minWidth: 0 }}>
      {error && (
        <Alert color="red">
          <Stack gap="xs">
            <Text style={{ overflowWrap: 'anywhere' }}>{error}</Text>
            <Button
              data-click-id="AdminActivity/retry"
              onClick={() => setRevision((v) => v + 1)}
            >
              {t.adminRetry}
            </Button>
          </Stack>
        </Alert>
      )}
      {loading ? (
        <Text role="status">{t.adminLoading}</Text>
      ) : (
        !error && (
          <>
            {rows.length === 0 ? (
              <Text>{t.adminNothingHere}</Text>
            ) : (
              <Table.ScrollContainer minWidth={900}>
                <Table striped highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      {[
                        t.adminToolsTime,
                        t.adminToolsAdminEmail,
                        t.adminToolsAction,
                        t.adminToolsDetails,
                      ].map((label) => (
                        <Table.Th key={label}>{label}</Table.Th>
                      ))}
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {rows.map((row) => (
                      <Table.Tr key={row.id}>
                        <Table.Td>{formatDateTime(row.created_at)}</Table.Td>
                        <Table.Td>{row.admin_email ?? '—'}</Table.Td>
                        <Table.Td>
                          {t.adminActivityLabels[row.action] ?? row.action}
                        </Table.Td>
                        <Table.Td
                          style={{ overflowWrap: 'anywhere', maxWidth: 520 }}
                        >
                          {description(row)}
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </Table.ScrollContainer>
            )}
            <Group justify="space-between">
              <Button
                variant="default"
                disabled={page === 0}
                data-click-id="AdminActivity/previous"
                onClick={() => setPage((v) => v - 1)}
              >
                {t.adminPrevious}
              </Button>
              <Text size="sm">{t.adminToolsPage(page + 1, pages)}</Text>
              <Button
                variant="default"
                disabled={page + 1 >= pages}
                data-click-id="AdminActivity/next"
                onClick={() => setPage((v) => v + 1)}
              >
                {t.adminNext}
              </Button>
            </Group>
          </>
        )
      )}
    </Stack>
  );
}
