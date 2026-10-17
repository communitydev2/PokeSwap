import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Group,
  Modal,
  Stack,
  Table,
  Text,
  TextInput,
} from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { useLocalizationStore } from '../../store/useLocalizationStore';
import { adminRpc } from './adminRpc';

type Word = { id: string; word: string; total_count: number };

export function AdminModeration() {
  const t = useLocalizationStore((s) => s.t);
  const [search, setSearch] = useState('');
  const [query] = useDebouncedValue(search, 300);
  const [word, setWord] = useState('');
  const [rows, setRows] = useState<Word[]>([]);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Word | null>(null);
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState(false);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    void adminRpc<Word[]>('admin_banned_words', {
      p_search: query,
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
  }, [query, page, revision]);
  const pages = Math.max(1, Math.ceil(total / 50));
  useEffect(() => {
    if (!loading && !error && page >= pages) setPage(pages - 1);
  }, [loading, error, page, pages]);
  const add = async () => {
    if (adding) return;
    setAdding(true);
    setAddError(null);
    const result = await adminRpc('admin_add_banned_word', { p_word: word });
    setAdding(false);
    if (result.error) setAddError(result.error);
    else {
      setWord('');
      setRevision((v) => v + 1);
    }
  };
  const remove = async () => {
    if (!selected || removing) return;
    setRemoving(true);
    setRemoveError(null);
    const result = await adminRpc('admin_remove_banned_word', {
      p_id: selected.id,
    });
    setRemoving(false);
    if (result.error) setRemoveError(result.error);
    else {
      setSelected(null);
      setRevision((v) => v + 1);
    }
  };
  return (
    <Stack style={{ minWidth: 0 }}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void add();
        }}
      >
        <Stack gap="xs">
          <TextInput
            label={t.adminToolsAddWord}
            value={word}
            disabled={adding}
            onChange={(event) => setWord(event.currentTarget.value)}
            data-click-id="AdminModeration/word"
          />
          {addError && (
            <Alert color="red" style={{ overflowWrap: 'anywhere' }}>
              {addError}
            </Alert>
          )}
          <Button
            type="submit"
            loading={adding}
            data-click-id="AdminModeration/add"
          >
            {t.adminToolsAddWord}
          </Button>
        </Stack>
      </form>
      <TextInput
        label={t.adminToolsWordSearch}
        value={search}
        onChange={(event) => {
          setSearch(event.currentTarget.value);
          setPage(0);
        }}
        data-click-id="AdminModeration/search"
      />
      {error && (
        <Alert color="red">
          <Stack gap="xs">
            <Text style={{ overflowWrap: 'anywhere' }}>{error}</Text>
            <Button
              data-click-id="AdminModeration/retry"
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
              <Table.ScrollContainer minWidth={420}>
                <Table striped highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>{t.adminToolsWord}</Table.Th>
                      <Table.Th>{t.adminToolsActions}</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {rows.map((row) => (
                      <Table.Tr
                        key={row.id}
                        data-click-context={'word:' + row.id}
                      >
                        <Table.Td style={{ overflowWrap: 'anywhere' }}>
                          {row.word}
                        </Table.Td>
                        <Table.Td>
                          <Button
                            color="red"
                            variant="light"
                            size="xs"
                            data-click-id={'AdminModeration/remove:' + row.id}
                            onClick={() => {
                              setSelected(row);
                              setRemoveError(null);
                            }}
                          >
                            {t.adminToolsRemoveWord}
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
                data-click-id="AdminModeration/previous"
                onClick={() => setPage((v) => v - 1)}
              >
                {t.adminPrevious}
              </Button>
              <Text size="sm">{t.adminToolsPage(page + 1, pages)}</Text>
              <Button
                variant="default"
                disabled={page + 1 >= pages}
                data-click-id="AdminModeration/next"
                onClick={() => setPage((v) => v + 1)}
              >
                {t.adminNext}
              </Button>
            </Group>
          </>
        )
      )}
      <Modal
        opened={selected !== null}
        onClose={() => {
          if (!removing) setSelected(null);
        }}
        title={t.adminToolsRemoveWord}
        size="sm"
        closeButtonProps={{
          ...{ 'data-click-id': 'AdminModeration/close-confirm' },
          'aria-label': t.adminCancel,
        }}
        closeOnEscape={!removing}
        closeOnClickOutside={!removing}
      >
        <Stack>
          <Text style={{ overflowWrap: 'anywhere' }}>
            {t.adminToolsRemoveWordConfirm(selected?.word ?? '')}
          </Text>
          {removeError && (
            <Alert color="red" style={{ overflowWrap: 'anywhere' }}>
              {removeError}
            </Alert>
          )}
          <Group justify="flex-end">
            <Button
              variant="default"
              disabled={removing}
              data-click-id="AdminModeration/dismiss-confirm"
              onClick={() => setSelected(null)}
            >
              {t.adminCancel}
            </Button>
            <Button
              color="red"
              loading={removing}
              data-click-id="AdminModeration/confirm"
              onClick={() => void remove()}
            >
              {t.adminConfirm}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
