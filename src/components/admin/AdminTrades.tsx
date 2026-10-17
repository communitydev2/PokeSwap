import { useEffect, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Group,
  Modal,
  SegmentedControl,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
} from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { useLocalizationStore } from '../../store/useLocalizationStore';
import { adminRpc, formatDateTime } from './adminRpc';

type Offer = {
  id: number;
  created_at: string;
  status: string;
  exclusive: boolean;
  from_name: string;
  to_name: string;
  give_card: string;
  give_language: string;
  get_card: string;
  get_language: string;
  from_done: boolean;
  to_done: boolean;
  total_count: number;
};
type Exclusive = {
  id: number;
  created_at: string;
  owner_name: string;
  card: string;
  language: string;
  wanted_count: number;
  pending_offers: number;
  total_count: number;
};

export function AdminTrades() {
  const t = useLocalizationStore((s) => s.t);
  const [mode, setMode] = useState('offers');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [query] = useDebouncedValue(search, 300);
  const [page, setPage] = useState(0);
  const [revision, setRevision] = useState(0);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [exclusive, setExclusive] = useState<Exclusive[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selection, setSelection] = useState<{
    id: number;
    mode: string;
  } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    const args = { p_search: query, p_limit: 50, p_offset: page * 50 };
    void (async () => {
      if (mode === 'offers') {
        const result = await adminRpc<Offer[]>('admin_trade_offers', {
          ...args,
          p_status: status || null,
        });
        if (!active) return;
        setOffers(result.data ?? []);
        setTotal(Number(result.data?.[0]?.total_count ?? 0));
        setError(result.error);
      } else {
        const result = await adminRpc<Exclusive[]>(
          'admin_exclusive_trades',
          args,
        );
        if (!active) return;
        setExclusive(result.data ?? []);
        setTotal(Number(result.data?.[0]?.total_count ?? 0));
        setError(result.error);
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [mode, status, query, page, revision]);
  const pages = Math.max(1, Math.ceil(total / 50));
  useEffect(() => {
    if (!loading && !error && page >= pages) setPage(pages - 1);
  }, [loading, error, page, pages]);
  const confirm = async () => {
    if (!selection || busy) return;
    setBusy(true);
    setActionError(null);
    const result =
      selection.mode === 'offers'
        ? await adminRpc('admin_cancel_trade_offer', { p_offer: selection.id })
        : await adminRpc('admin_end_exclusive_trade', { p_id: selection.id });
    setBusy(false);
    if (result.error) setActionError(result.error);
    else {
      setSelection(null);
      setRevision((v) => v + 1);
    }
  };
  const open = (id: number) => {
    setActionError(null);
    setSelection({ id, mode });
  };
  const yesNo = (value: boolean) => (value ? t.adminToolsYes : t.adminToolsNo);
  return (
    <Stack style={{ minWidth: 0 }}>
      <SegmentedControl
        ref={(node) => {
          node?.querySelectorAll('input').forEach((input) => {
            input.dataset.clickId = 'AdminTrades/mode:' + input.value;
            const label = input.nextElementSibling;
            if (label instanceof HTMLElement)
              label.dataset.clickId = 'AdminTrades/mode-label:' + input.value;
          });
        }}
        fullWidth
        value={mode}
        onChange={(value) => {
          setMode(value);
          setPage(0);
        }}
        data={[
          { value: 'offers', label: t.adminToolsOffers },
          { value: 'exclusive', label: t.adminToolsExclusiveTrades },
        ]}
      />
      <TextInput
        label={t.adminToolsSearch}
        value={search}
        onChange={(e) => {
          setSearch(e.currentTarget.value);
          setPage(0);
        }}
        data-click-id="AdminTrades/search"
      />
      {mode === 'offers' && (
        <Select
          label={t.adminToolsStatus}
          value={status}
          onChange={(value) => {
            setStatus(value ?? '');
            setPage(0);
          }}
          allowDeselect={false}
          data-click-id="AdminTrades/status"
          data={[
            { value: '', label: t.adminToolsAll },
            ...[
              'pending',
              'accepted',
              'declined',
              'cancelled',
              'completed',
            ].map((value) => ({
              value,
              label: t.adminToolsOfferStatuses[value],
            })),
          ]}
          renderOption={({ option }) => (
            <span
              data-click-id={'AdminTrades/status:' + (option.value || 'all')}
            >
              {option.label}
            </span>
          )}
        />
      )}
      {error && (
        <Alert color="red">
          <Stack gap="xs">
            <Text style={{ overflowWrap: 'anywhere' }}>{error}</Text>
            <Button
              data-click-id="AdminTrades/retry"
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
            {total === 0 ? (
              <Text>{t.adminNothingHere}</Text>
            ) : (
              <Table.ScrollContainer minWidth={mode === 'offers' ? 1100 : 800}>
                <Table striped highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      {(mode === 'offers'
                        ? [
                            t.adminToolsCreated,
                            t.adminToolsStatus,
                            t.adminToolsExclusive,
                            t.adminToolsPlayers,
                            t.adminToolsGives,
                            t.adminToolsGets,
                            t.adminToolsDone,
                            t.adminToolsActions,
                          ]
                        : [
                            t.adminToolsCreated,
                            t.adminToolsOwner,
                            t.adminToolsCard,
                            t.adminToolsWanted,
                            t.adminToolsPending,
                            t.adminToolsActions,
                          ]
                      ).map((label) => (
                        <Table.Th key={label}>{label}</Table.Th>
                      ))}
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {mode === 'offers'
                      ? offers.map((row) => (
                          <Table.Tr
                            key={row.id}
                            data-click-context={'offer:' + row.id}
                          >
                            <Table.Td>
                              {formatDateTime(row.created_at)}
                            </Table.Td>
                            <Table.Td style={{ whiteSpace: 'nowrap' }}>
                              <Badge style={{ maxWidth: 'none' }}
                                color={
                                  row.status === 'completed'
                                    ? 'green'
                                    : row.status === 'pending'
                                      ? 'yellow'
                                      : 'gray'
                                }
                              >
                                {t.adminToolsOfferStatuses[row.status] ??
                                  row.status}
                              </Badge>
                            </Table.Td>
                            <Table.Td style={{ whiteSpace: 'nowrap' }}>
                              {row.exclusive ? (
                                <Badge style={{ maxWidth: 'none' }}>{t.adminToolsExclusive}</Badge>
                              ) : (
                                '—'
                              )}
                            </Table.Td>
                            <Table.Td>
                              {row.from_name} → {row.to_name}
                            </Table.Td>
                            <Table.Td>
                              {row.give_card}
                              <Text size="xs" c="dimmed">
                                {row.give_language}
                              </Text>
                            </Table.Td>
                            <Table.Td>
                              {row.get_card}
                              <Text size="xs" c="dimmed">
                                {row.get_language}
                              </Text>
                            </Table.Td>
                            <Table.Td>
                              {yesNo(row.from_done)} / {yesNo(row.to_done)}
                            </Table.Td>
                            <Table.Td>
                              {['pending', 'accepted'].includes(row.status) && (
                                <Button
                                  size="xs"
                                  color="red"
                                  variant="light"
                                  data-click-id={'AdminTrades/cancel:' + row.id}
                                  onClick={() => open(row.id)}
                                >
                                  {t.adminToolsCancelOffer}
                                </Button>
                              )}
                            </Table.Td>
                          </Table.Tr>
                        ))
                      : exclusive.map((row) => (
                          <Table.Tr
                            key={row.id}
                            data-click-context={'exclusive:' + row.id}
                          >
                            <Table.Td>
                              {formatDateTime(row.created_at)}
                            </Table.Td>
                            <Table.Td>{row.owner_name}</Table.Td>
                            <Table.Td>
                              {row.card}
                              <Text size="xs" c="dimmed">
                                {row.language}
                              </Text>
                            </Table.Td>
                            <Table.Td>{row.wanted_count}</Table.Td>
                            <Table.Td>{row.pending_offers}</Table.Td>
                            <Table.Td>
                              <Button
                                size="xs"
                                color="red"
                                variant="light"
                                data-click-id={'AdminTrades/end:' + row.id}
                                onClick={() => open(row.id)}
                              >
                                {t.adminToolsEndExclusive}
                              </Button>
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
                data-click-id="AdminTrades/previous"
                onClick={() => setPage((v) => v - 1)}
              >
                {t.adminPrevious}
              </Button>
              <Text size="sm">{t.adminToolsPage(page + 1, pages)}</Text>
              <Button
                variant="default"
                disabled={page + 1 >= pages}
                data-click-id="AdminTrades/next"
                onClick={() => setPage((v) => v + 1)}
              >
                {t.adminNext}
              </Button>
            </Group>
          </>
        )
      )}
      <Modal
        opened={selection !== null}
        onClose={() => {
          if (!busy) setSelection(null);
        }}
        title={
          selection?.mode === 'offers'
            ? t.adminToolsCancelOffer
            : t.adminToolsEndExclusive
        }
        size="sm"
        closeButtonProps={{
          ...{ 'data-click-id': 'AdminTrades/close-confirm' },
          'aria-label': t.adminCancel,
        }}
        closeOnClickOutside={!busy}
        closeOnEscape={!busy}
      >
        <Stack>
          <Text>
            {selection?.mode === 'offers'
              ? t.adminToolsCancelOfferConfirm
              : t.adminToolsEndExclusiveConfirm}
          </Text>
          {actionError && (
            <Alert color="red" style={{ overflowWrap: 'anywhere' }}>
              {actionError}
            </Alert>
          )}
          <Group justify="flex-end">
            <Button
              variant="default"
              disabled={busy}
              data-click-id="AdminTrades/dismiss-confirm"
              onClick={() => setSelection(null)}
            >
              {t.adminCancel}
            </Button>
            <Button
              color="red"
              loading={busy}
              data-click-id="AdminTrades/confirm"
              onClick={() => void confirm()}
            >
              {t.adminConfirm}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
