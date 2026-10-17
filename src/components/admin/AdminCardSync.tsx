import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Button,
  Group,
  Modal,
  Stack,
  Table,
  Text,
  Tooltip,
} from '@mantine/core';
import { useLocalizationStore } from '../../store/useLocalizationStore';
import { adminRpc, formatDateTime } from './adminRpc';

type Run = {
  id: number;
  started_at: string;
  finished_at: string | null;
  sets_added: string[] | null;
  cards_added: number | null;
  cards_updated: number | null;
  error: string | null;
};
type Watch = { baseline: number; deadline: number };

export function AdminCardSync() {
  const t = useLocalizationStore((s) => s.t);
  const [rows, setRows] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [opened, setOpened] = useState(false);
  const [busy, setBusy] = useState(false);
  const [watch, setWatch] = useState<Watch | null>(null);
  const [notice, setNotice] = useState<
    'started' | 'finished' | 'timeout' | null
  >(null);
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    let pollTimer: ReturnType<typeof setTimeout> | undefined;
    let deadlineTimer: ReturnType<typeof setTimeout> | undefined;
    setLoading(true);
    setError(null);
    const load = async () => {
      const result = await adminRpc<Run[]>('admin_card_sync_runs', {
        p_limit: 50,
      });
      if (!active) return;
      setLoading(false);
      setError(result.error);
      if (!result.error) setRows(result.data ?? []);
      if (!watch) return;
      if (
        !result.error &&
        result.data?.some(
          (run) => Number(run.id) > watch.baseline && run.finished_at !== null,
        )
      ) {
        setNotice('finished');
        setWatch(null);
        return;
      }
      if (Date.now() < watch.deadline)
        pollTimer = setTimeout(() => void load(), 10000);
    };
    if (watch)
      deadlineTimer = setTimeout(
        () => {
          if (active) {
            setNotice('timeout');
            setWatch(null);
          }
        },
        Math.max(0, watch.deadline - Date.now()),
      );
    void load();
    return () => {
      active = false;
      clearTimeout(pollTimer);
      clearTimeout(deadlineTimer);
    };
  }, [revision, watch]);

  const start = async () => {
    if (busy || watch) return;
    setBusy(true);
    setActionError(null);
    // Read a fresh baseline so an existing run finishing cannot satisfy this request.
    const latest = await adminRpc<Run[]>('admin_card_sync_runs', {
      p_limit: 1,
    });
    if (!mounted.current) return;
    if (latest.error) {
      setBusy(false);
      setActionError(latest.error);
      return;
    }
    const result = await adminRpc('admin_run_card_sync');
    if (!mounted.current) return;
    setBusy(false);
    if (result.error) {
      setActionError(result.error);
      return;
    }
    setOpened(false);
    setNotice('started');
    setWatch({
      baseline: Number(latest.data?.[0]?.id ?? 0),
      deadline: Date.now() + 180000,
    });
  };

  return (
    <Stack style={{ minWidth: 0 }}>
      <Group justify="space-between">
        <Button
          variant="default"
          data-click-id="AdminCardSync/refresh"
          onClick={() => setRevision((v) => v + 1)}
        >
          {t.adminToolsRefresh}
        </Button>
        <Button
          disabled={watch !== null}
          data-click-id="AdminCardSync/run"
          onClick={() => {
            setActionError(null);
            setOpened(true);
          }}
        >
          {t.adminToolsRunSync}
        </Button>
      </Group>
      {notice && (
        <Alert color={notice === 'timeout' ? 'yellow' : 'blue'} role="status">
          {notice === 'started'
            ? t.adminToolsSyncStarted
            : notice === 'finished'
              ? t.adminToolsSyncFinished
              : t.adminToolsSyncWaitEnded}
        </Alert>
      )}
      {error && (
        <Alert color="red">
          <Stack gap="xs">
            <Text style={{ overflowWrap: 'anywhere' }}>{error}</Text>
            <Button
              data-click-id="AdminCardSync/retry"
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
        !error &&
        (rows.length === 0 ? (
          <Text>{t.adminNothingHere}</Text>
        ) : (
          <Table.ScrollContainer minWidth={950}>
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  {[
                    t.adminToolsStarted,
                    t.adminToolsFinished,
                    t.adminToolsSetsAdded,
                    t.adminToolsCardsAdded,
                    t.adminToolsCardsUpdated,
                    t.adminToolsError,
                  ].map((label) => (
                    <Table.Th key={label}>{label}</Table.Th>
                  ))}
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {rows.map((row) => (
                  <Table.Tr key={row.id} data-click-context={'sync:' + row.id}>
                    <Table.Td>{formatDateTime(row.started_at)}</Table.Td>
                    <Table.Td>
                      {row.finished_at
                        ? formatDateTime(row.finished_at)
                        : t.adminToolsRunning}
                    </Table.Td>
                    <Table.Td
                      style={{ maxWidth: 260, overflowWrap: 'anywhere' }}
                    >
                      {row.sets_added?.join(', ') || '—'}
                    </Table.Td>
                    <Table.Td>{row.cards_added ?? '—'}</Table.Td>
                    <Table.Td>{row.cards_updated ?? '—'}</Table.Td>
                    <Table.Td>
                      {row.error ? (
                        <Tooltip
                          label={row.error}
                          multiline
                          w={280}
                          withArrow
                          openDelay={200}
                          events={{ hover: true, focus: true, touch: true }}
                          styles={{ tooltip: { overflowWrap: 'anywhere' } }}
                        >
                          <Text
                            c="red"
                            size="sm"
                            truncate
                            maw={280}
                            tabIndex={0}
                            data-click-id={'AdminCardSync/error:' + row.id}
                          >
                            {row.error}
                          </Text>
                        </Tooltip>
                      ) : (
                        '—'
                      )}
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        ))
      )}
      <Modal
        opened={opened}
        onClose={() => {
          if (!busy) setOpened(false);
        }}
        title={t.adminToolsRunSync}
        size="sm"
        closeButtonProps={{
          ...{ 'data-click-id': 'AdminCardSync/close-confirm' },
          'aria-label': t.adminCancel,
        }}
        closeOnEscape={!busy}
        closeOnClickOutside={!busy}
      >
        <Stack>
          <Text>{t.adminToolsRunSyncConfirm}</Text>
          {actionError && (
            <Alert color="red" style={{ overflowWrap: 'anywhere' }}>
              {actionError}
            </Alert>
          )}
          <Group justify="flex-end">
            <Button
              variant="default"
              disabled={busy}
              data-click-id="AdminCardSync/dismiss-confirm"
              onClick={() => setOpened(false)}
            >
              {t.adminCancel}
            </Button>
            <Button
              loading={busy}
              data-click-id="AdminCardSync/confirm"
              onClick={() => void start()}
            >
              {t.adminConfirm}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
