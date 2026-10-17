import { useEffect, useRef, useState } from "react";
import { useDebouncedValue } from "@mantine/hooks";
import {
  Alert,
  Badge,
  Button,
  Group,
  Loader,
  Menu,
  Modal,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
} from "@mantine/core";
import { adminRpc, formatDateTime } from "./adminRpc";
import { useLocalizationStore } from "../../store/useLocalizationStore";
type User = {
  user_id: string;
  email: string | null;
  username: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  banned_until: string | null;
  is_admin: boolean;
  tcg_accounts: number;
  wishlist_cards: number;
  trade_cards: number;
  open_offers: number;
  total_count: number;
};
type Action = "rename" | "ban" | "unban" | "sign-out";
function banned(user: User) {
  return (
    !!user.banned_until && new Date(user.banned_until).getTime() > Date.now()
  );
}
// Permanent bans are stored as 100 years from now
function permanentlyBanned(user: User) {
  return (
    !!user.banned_until &&
    new Date(user.banned_until).getFullYear() - new Date().getFullYear() > 50
  );
}
export function AdminUsers() {
  const t = useLocalizationStore((s) => s.t);
  const [search, setSearch] = useState(""),
    [query] = useDebouncedValue(search, 300);
  const [page, setPage] = useState(0),
    [attempt, setAttempt] = useState(0),
    [rows, setRows] = useState<User[]>([]);
  const [loading, setLoading] = useState(true),
    [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<{
      user: User;
      action: Action;
    } | null>(null),
    [name, setName] = useState(""),
    [duration, setDuration] = useState<string | null>("7");
  const [busy, setBusy] = useState(false),
    [actionError, setActionError] = useState<string | null>(null);
  const alive = useRef(true),
    pending = useRef(false);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setRows([]);
    void adminRpc<User[]>("admin_users_list", {
      p_search: query,
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
  }, [query, page, attempt]);
  useEffect(() => setPage(0), [query]);
  function open(user: User, action: Action) {
    setSelected({ user, action });
    setName(user.username ?? "");
    setDuration("7");
    setActionError(null);
  }
  async function confirm() {
    if (!selected || pending.current) return;
    pending.current = true;
    setBusy(true);
    setActionError(null);
    const { user, action } = selected;
    const fn = {
      rename: "admin_set_username",
      ban: "admin_ban_user",
      unban: "admin_unban_user",
      "sign-out": "admin_sign_out_user",
    }[action];
    const args: Record<string, unknown> = { p_user: user.user_id };
    if (action === "rename") args.p_username = name;
    if (action === "ban")
      args.p_days = duration === "permanent" ? null : Number(duration);
    const result = await adminRpc(fn, args);
    pending.current = false;
    if (!alive.current) return;
    setBusy(false);
    if (result.error) {
      setActionError(result.error);
      return;
    }
    setSelected(null);
    setAttempt((x) => x + 1);
  }
  const labels = {
    rename: t.adminRename,
    ban: t.adminBan,
    unban: t.adminUnban,
    "sign-out": t.adminSignOutEverywhere,
  };
  const pages = Math.max(1, Math.ceil(Number(rows[0]?.total_count ?? 0) / 50));
  return (
    <Stack>
      <TextInput
        data-click-id="AdminUsers/search"
        label={t.adminSearch}
        value={search}
        onChange={(e) => setSearch(e.currentTarget.value)}
      />
      {error && (
        <Alert color="red">
          <Stack>
            <Text>{error}</Text>
            <Button
              data-click-id="AdminUsers/retry"
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
          <Table.ScrollContainer minWidth={1080}>
            <Table striped>
              <Table.Thead>
                <Table.Tr>
                  {[
                    t.adminUsername,
                    t.adminEmail,
                    t.adminJoined,
                    t.adminLastSignIn,
                    t.adminPocketAccounts,
                    t.adminWishlistTrade,
                    t.adminOpenOffers,
                    t.adminStatus,
                    t.adminActions,
                  ].map((label) => (
                    <Table.Th key={label}>{label}</Table.Th>
                  ))}
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {rows.map((user) => (
                  <Table.Tr
                    key={user.user_id}
                    data-click-context={user.user_id}
                  >
                    <Table.Td>{user.username ?? "—"}</Table.Td>
                    <Table.Td>{user.email ?? "—"}</Table.Td>
                    <Table.Td>{formatDateTime(user.created_at)}</Table.Td>
                    <Table.Td>{formatDateTime(user.last_sign_in_at)}</Table.Td>
                    <Table.Td>{user.tcg_accounts}</Table.Td>
                    <Table.Td>
                      {user.wishlist_cards} / {user.trade_cards}
                    </Table.Td>
                    <Table.Td>{user.open_offers}</Table.Td>
                    <Table.Td miw={100} style={{ whiteSpace: "nowrap" }}>
                      <Badge
                        color={
                          user.is_admin
                            ? "blue"
                            : banned(user)
                              ? "red"
                              : "green"
                        }
                        style={{ whiteSpace: "nowrap", maxWidth: "none" }}
                      >
                        {user.is_admin
                          ? t.adminAdmin
                          : banned(user)
                            ? permanentlyBanned(user)
                              ? t.adminPermanentBan
                              : t.adminBannedUntil(
                                  formatDateTime(user.banned_until),
                                )
                            : t.adminActive}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Menu withinPortal>
                        <Menu.Target>
                          <Button
                            data-click-id={"AdminUsers/actions:" + user.user_id}
                            size="xs"
                            variant="light"
                          >
                            {t.adminActions}
                          </Button>
                        </Menu.Target>
                        <Menu.Dropdown>
                          <Menu.Item
                            data-click-id={"AdminUsers/rename:" + user.user_id}
                            onClick={() => open(user, "rename")}
                          >
                            {t.adminRename}
                          </Menu.Item>
                          {!user.is_admin && (
                            <Menu.Item
                              data-click-id={"AdminUsers/ban:" + user.user_id}
                              color="red"
                              onClick={() => open(user, "ban")}
                            >
                              {t.adminBan}
                            </Menu.Item>
                          )}
                          {banned(user) && (
                            <Menu.Item
                              data-click-id={"AdminUsers/unban:" + user.user_id}
                              onClick={() => open(user, "unban")}
                            >
                              {t.adminUnban}
                            </Menu.Item>
                          )}
                          <Menu.Item
                            data-click-id={
                              "AdminUsers/sign-out:" + user.user_id
                            }
                            color="red"
                            onClick={() => open(user, "sign-out")}
                          >
                            {t.adminSignOutEverywhere}
                          </Menu.Item>
                        </Menu.Dropdown>
                      </Menu>
                    </Table.Td>
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
          data-click-id="AdminUsers/previous"
          disabled={loading || page === 0}
          onClick={() => setPage((p) => p - 1)}
        >
          {t.adminPrevious}
        </Button>
        <Text>{t.adminPageNumber(page + 1, pages)}</Text>
        <Button
          data-click-id="AdminUsers/next"
          disabled={loading || page + 1 >= pages}
          onClick={() => setPage((p) => p + 1)}
        >
          {t.adminNext}
        </Button>
      </Group>
      <Modal
        opened={!!selected}
        onClose={() => {
          if (!busy) setSelected(null);
        }}
        title={selected ? labels[selected.action] : ""}
        size="sm"
        closeOnEscape={!busy}
        closeOnClickOutside={!busy}
        closeButtonProps={{
          disabled: busy,
          "aria-label": t.close,
          ...{ "data-click-id": "AdminUsers/modal-close" },
        }}
      >
        {selected && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void confirm();
            }}
          >
            <Stack>
              <Text size="sm">
                {selected.user.username ?? selected.user.email}
              </Text>
              {actionError && <Alert color="red">{actionError}</Alert>}
              {selected.action === "rename" && (
                <TextInput
                  data-click-id="AdminUsers/new-name"
                  label={t.adminUsername}
                  value={name}
                  disabled={busy}
                  onChange={(e) => setName(e.currentTarget.value)}
                />
              )}
              {selected.action === "ban" && (
                <>
                  <Text>{t.adminBanHelp}</Text>
                  <Select
                    data-click-id="AdminUsers/ban-duration"
                    label={t.adminBanDuration}
                    value={duration}
                    onChange={setDuration}
                    disabled={busy}
                    allowDeselect={false}
                    data={[
                      { value: "7", label: t.adminBan7 },
                      { value: "30", label: t.adminBan30 },
                      { value: "permanent", label: t.adminBanPermanent },
                    ]}
                  />
                </>
              )}
              {selected.action === "unban" && <Text>{t.adminUnbanHelp}</Text>}
              {selected.action === "sign-out" && (
                <Text>{t.adminSignOutHelp}</Text>
              )}
              <Group justify="end">
                <Button
                  data-click-id="AdminUsers/cancel"
                  variant="default"
                  disabled={busy}
                  onClick={() => setSelected(null)}
                >
                  {t.adminCancel}
                </Button>
                <Button
                  data-click-id="AdminUsers/confirm"
                  type="submit"
                  color={selected.action === "rename" ? "blue" : "red"}
                  loading={busy}
                  disabled={selected.action === "rename" && !name.trim()}
                >
                  {t.adminConfirm}
                </Button>
              </Group>
            </Stack>
          </form>
        )}
      </Modal>
    </Stack>
  );
}
