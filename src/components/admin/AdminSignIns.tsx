import { useEffect, useState } from "react";
import { useDebouncedValue } from "@mantine/hooks";
import {
  Alert,
  Badge,
  Button,
  Group,
  Loader,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
} from "@mantine/core";
import { adminRpc, formatDateTime } from "./adminRpc";
import { useLocalizationStore } from "../../store/useLocalizationStore";
type SignIn = {
  id: string;
  created_at: string;
  action: string;
  username: string | null;
  email: string | null;
  ip_address: string | null;
  total_count: number;
};
export function AdminSignIns() {
  const t = useLocalizationStore((s) => s.t);
  const [search, setSearch] = useState(""),
    [query] = useDebouncedValue(search, 300);
  const [action, setAction] = useState<string | null>(""),
    [page, setPage] = useState(0),
    [attempt, setAttempt] = useState(0);
  const [rows, setRows] = useState<SignIn[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setRows([]);
    void adminRpc<SignIn[]>("admin_sign_ins", {
      p_search: query,
      p_action: action || null,
      p_limit: 50,
      p_offset: page * 50,
    }).then((result) => {
      if (!active) return;
      setRows(result.data ?? []);
      setError(result.error);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [query, action, page, attempt]);
  useEffect(() => {
    setPage(0);
  }, [query, action]);
  const pages = Math.max(1, Math.ceil(Number(rows[0]?.total_count ?? 0) / 50));
  return (
    <Stack>
      <TextInput
        data-click-id="AdminSignIns/search"
        label={t.adminSearch}
        value={search}
        onChange={(e) => setSearch(e.currentTarget.value)}
      />
      <Select
        data-click-id="AdminSignIns/action"
        label={t.adminAction}
        value={action}
        onChange={setAction}
        allowDeselect={false}
        data={[
          { value: "", label: t.adminAllActions },
          ...Object.entries(t.adminAuditActions).map(([value, label]) => ({
            value,
            label,
          })),
        ]}
      />
      {error && (
        <Alert color="red">
          <Stack>
            <Text>{error}</Text>
            <Button
              data-click-id="AdminSignIns/retry"
              onClick={() => setAttempt((x) => x + 1)}
            >
              {t.adminRetry}
            </Button>
          </Stack>
        </Alert>
      )}
      {loading ? (
        <Loader aria-label={t.adminLoading} />
      ) : (
        !error &&
        (rows.length ? (
          <Table.ScrollContainer minWidth={650}>
            <Table striped>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>{t.adminTime}</Table.Th>
                  <Table.Th>{t.adminAction}</Table.Th>
                  <Table.Th>
                    {t.adminUsername} / {t.adminEmail}
                  </Table.Th>
                  <Table.Th>{t.adminIp}</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {rows.map((row) => (
                  <Table.Tr key={row.id}>
                    <Table.Td>{formatDateTime(row.created_at)}</Table.Td>
                    <Table.Td>
                      <Badge
                        color={
                          row.action === "login"
                            ? "green"
                            : row.action === "user_signedup"
                              ? "blue"
                              : row.action === "user_deleted"
                                ? "red"
                                : "gray"
                        }
                      >
                        {t.adminAuditActions[row.action] ?? row.action}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{row.username ?? "—"}</Text>
                      <Text size="xs" c="dimmed">
                        {row.email ?? "—"}
                      </Text>
                    </Table.Td>
                    <Table.Td>{row.ip_address ?? "—"}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        ) : (
          <Text c="dimmed">{t.adminNothingHere}</Text>
        ))
      )}
      <Group justify="space-between">
        <Button
          data-click-id="AdminSignIns/previous"
          disabled={loading || page === 0}
          onClick={() => setPage((p) => p - 1)}
        >
          {t.adminPrevious}
        </Button>
        <Text>{t.adminPageNumber(page + 1, pages)}</Text>
        <Button
          data-click-id="AdminSignIns/next"
          disabled={loading || page + 1 >= pages}
          onClick={() => setPage((p) => p + 1)}
        >
          {t.adminNext}
        </Button>
      </Group>
    </Stack>
  );
}
