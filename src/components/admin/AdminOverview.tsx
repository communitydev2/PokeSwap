import { useEffect, useState } from "react";
import {
  Alert,
  Badge,
  Box,
  Button,
  Group,
  Flex,
  Loader,
  Paper,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { adminRpc, formatDateTime } from "./adminRpc";
import { useLocalizationStore } from "../../store/useLocalizationStore";
type Sync = {
  started_at: string;
  finished_at: string | null;
  sets_added: string[];
  cards_added: number;
  cards_updated: number;
  error: string | null;
};
type Overview = Record<string, unknown> & {
  offers: Record<string, number>;
  last_card_sync: Sync | null;
};
type Day = { day: string; sign_ups: number; sign_ins: number };
export function AdminOverview() {
  const t = useLocalizationStore((s) => s.t);
  const [days, setDays] = useState("30"),
    [attempt, setAttempt] = useState(0);
  const [stats, setStats] = useState<Overview | null>(null),
    [daily, setDaily] = useState<Day[]>([]);
  const [loading, setLoading] = useState(true),
    [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    void Promise.all([
      adminRpc<Overview>("admin_overview"),
      adminRpc<Day[]>("admin_daily_counts", { p_days: Number(days) }),
    ]).then(([overview, counts]) => {
      if (!active) return;
      setStats(overview.data);
      setDaily(counts.data ?? []);
      setError(overview.error ?? counts.error);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [days, attempt]);
  const maximum = Math.max(
    1,
    ...daily.flatMap((d) => [d.sign_ups, d.sign_ins]),
  );
  return (
    <Stack>
      {error && (
        <Alert color="red">
          <Stack>
            <Text>{error}</Text>
            <Button
              data-click-id="AdminOverview/retry"
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
        stats && (
          <>
            <SimpleGrid cols={{ base: 2, sm: 3 }}>
              {Object.entries(t.adminStatLabels).map(([key, label]) => (
                <Paper key={key} withBorder p="md">
                  <Text size="sm" c="dimmed">
                    {label}
                  </Text>
                  <Text size="xl" fw={700}>
                    {Number(stats[key] ?? 0).toLocaleString()}
                  </Text>
                </Paper>
              ))}
            </SimpleGrid>
            <Title order={3}>{t.adminOffersByStatus}</Title>
            <Group>
              {Object.entries(stats.offers ?? {}).map(([status, count]) => (
                <Badge
                  key={status}
                  color={
                    (
                      {
                        pending: "yellow",
                        accepted: "blue",
                        declined: "gray",
                        cancelled: "red",
                        completed: "teal",
                        done: "teal",
                      } as Record<string, string>
                    )[status] ?? "gray"
                  }
                >
                  {t.adminToolsOfferStatuses[status] ?? status}: {count}
                </Badge>
              ))}
            </Group>
            <Title order={3}>{t.adminLastSync}</Title>
            {stats.last_card_sync ? (
              <Paper withBorder p="md">
                <Stack gap="xs">
                  <Text>
                    {formatDateTime(stats.last_card_sync.started_at)} —{" "}
                    {formatDateTime(stats.last_card_sync.finished_at)}
                  </Text>
                  <Text>
                    {t.adminSyncSets}:{" "}
                    {(stats.last_card_sync.sets_added ?? []).join(", ") || "—"}
                  </Text>
                  <Text>
                    {t.adminSyncCards}: {stats.last_card_sync.cards_added} ·{" "}
                    {t.adminSyncUpdated}: {stats.last_card_sync.cards_updated}
                  </Text>
                  {stats.last_card_sync.error && (
                    <Alert color="red">{stats.last_card_sync.error}</Alert>
                  )}
                </Stack>
              </Paper>
            ) : (
              <Text c="dimmed">{t.adminNothingHere}</Text>
            )}
            <Flex
              direction={{ base: "column", sm: "row" }}
              justify="space-between"
              align={{ base: "stretch", sm: "center" }}
              gap="sm"
            >
              <Title order={3}>{t.adminDailyCounts}</Title>
              <SegmentedControl
                data-click-id="AdminOverview/days"
                ref={(node) => {
                  node?.querySelectorAll("input").forEach((input) => {
                    input.dataset.clickId = "AdminOverview/days:" + input.value;
                    const label = node.querySelector(
                      'label[for="' + input.id + '"]',
                    );
                    label?.setAttribute(
                      "data-click-id",
                      "AdminOverview/days-label:" + input.value,
                    );
                  });
                }}
                value={days}
                onChange={setDays}
                data={[
                  { value: "7", label: t.adminDays7 },
                  { value: "30", label: t.adminDays30 },
                  { value: "90", label: t.adminDays90 },
                ]}
                name="admin-days"
              />
            </Flex>
            <Group>
              <Badge color="blue">{t.adminSignUps}</Badge>
              <Badge color="teal">{t.adminSignIns}</Badge>
            </Group>
            <Text size="xs" c="dimmed">
              {t.adminChartMax(maximum)}
            </Text>
            <Box
              role="img"
              aria-label={t.adminDailyCounts}
              style={{ overflowX: "auto" }}
            >
              <Group
                gap={2}
                align="end"
                wrap="nowrap"
                h={180}
                style={{ minWidth: daily.length * 7 }}
              >
                {daily.map((d) => (
                  <Box
                    key={d.day}
                    title={
                      d.day +
                      " · " +
                      t.adminSignUps +
                      ": " +
                      d.sign_ups +
                      " · " +
                      t.adminSignIns +
                      ": " +
                      d.sign_ins
                    }
                    style={{
                      flex: 1,
                      height: "100%",
                      display: "flex",
                      alignItems: "end",
                      gap: 1,
                    }}
                  >
                    <Box
                      bg="blue"
                      style={{
                        flex: 1,
                        height: (d.sign_ups / maximum) * 100 + "%",
                        minHeight: d.sign_ups ? 2 : 0,
                      }}
                    />
                    <Box
                      bg="teal"
                      style={{
                        flex: 1,
                        height: (d.sign_ins / maximum) * 100 + "%",
                        minHeight: d.sign_ins ? 2 : 0,
                      }}
                    />
                  </Box>
                ))}
              </Group>
              <Group justify="space-between">
                <Text size="xs">{daily[0]?.day}</Text>
                <Text size="xs">{daily.at(-1)?.day}</Text>
              </Group>
            </Box>
          </>
        )
      )}
    </Stack>
  );
}
