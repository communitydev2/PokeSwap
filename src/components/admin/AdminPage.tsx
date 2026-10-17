import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Alert,
  Button,
  Center,
  Container,
  Image,
  Loader,
  Stack,
  Tabs,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { supabase } from "../../supabaseClient";
import { useLocalizationStore } from "../../store/useLocalizationStore";
import { ADMIN_TAB } from "../../constants";
import { adminRpc } from "./adminRpc";
import { AdminOverview } from "./AdminOverview";
import { AdminSignIns } from "./AdminSignIns";
import { AdminUsers } from "./AdminUsers";
import { AdminTrades } from "./AdminTrades";
import { AdminModeration } from "./AdminModeration";
import { AdminCardSync } from "./AdminCardSync";
import { AdminActivity } from "./AdminActivity";
type Gate = {
  kind: "loading" | "signed-out" | "denied" | "enroll" | "verify" | "ready";
  email?: string;
  factorId?: string;
  qr?: string;
  secret?: string;
};
export default function AdminPage() {
  const t = useLocalizationStore((s) => s.t);
  const [gate, setGate] = useState<Gate>({ kind: "loading" });
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const epoch = useRef(0),
    submitting = useRef(false),
    refresh = useRef(() => {});
  const [tab, setTab] = useState<string>(() => {
    try {
      const v = localStorage.getItem("admin-tab");
      if (v && Object.values(ADMIN_TAB).some((x) => x === v)) return v;
    } catch {}
    return ADMIN_TAB.overview;
  });
  useEffect(() => {
    let disposed = false,
      queue = Promise.resolve();
    async function check(version: number) {
      const current = () => !disposed && version === epoch.current;
      try {
        const sessionResult = await supabase.auth.getSession();
        if (sessionResult.error) throw sessionResult.error;
        if (!current()) return;
        const session = sessionResult.data.session;
        if (!session) {
          setGate({ kind: "signed-out" });
          return;
        }
        const listed = await adminRpc<boolean>("admin_am_i_listed");
        if (!current()) return;
        if (listed.error) throw new Error(listed.error);
        if (!listed.data) {
          setGate({ kind: "denied" });
          return;
        }
        const assurance =
          await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (assurance.error) throw assurance.error;
        if (!current()) return;
        if (assurance.data.currentLevel === "aal2") {
          setGate({ kind: "ready", email: session.user.email });
          return;
        }
        const factors = await supabase.auth.mfa.listFactors();
        if (factors.error) throw factors.error;
        if (!current()) return;
        const verified = factors.data.totp.find((f) => f.status === "verified");
        if (verified) {
          setGate({ kind: "verify", factorId: verified.id });
          return;
        }
        for (const factor of factors.data.all.filter(
          (f) => f.factor_type === "totp" && f.status === "unverified",
        )) {
          if (!current()) return;
          const removed = await supabase.auth.mfa.unenroll({
            factorId: factor.id,
          });
          if (removed.error) throw removed.error;
        }
        if (!current()) return;
        const enrolled = await supabase.auth.mfa.enroll({
          factorType: "totp",
          friendlyName: useLocalizationStore.getState().t.adminFactorName,
        });
        if (enrolled.error) throw enrolled.error;
        if (current())
          setGate({
            kind: "enroll",
            factorId: enrolled.data.id,
            qr: enrolled.data.totp.qr_code,
            secret: enrolled.data.totp.secret,
          });
      } catch (err) {
        if (current())
          setError(
            err instanceof Error
              ? err.message
              : useLocalizationStore.getState().t.adminRequestFailed,
          );
      }
    }
    function schedule() {
      const version = ++epoch.current;
      setGate({ kind: "loading" });
      setError(null);
      setCode("");
      // Defer Auth calls until the auth callback has released its lock.
      queue = queue
        .then(() => new Promise<void>((resolve) => setTimeout(resolve, 0)))
        .then(() => check(version));
    }
    refresh.current = schedule;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(schedule);
    schedule();
    return () => {
      disposed = true;
      ++epoch.current;
      subscription.unsubscribe();
    };
  }, []);
  async function verify(value: string) {
    if (submitting.current || value.length !== 6 || !gate.factorId) return;
    submitting.current = true;
    setBusy(true);
    setError(null);
    const version = epoch.current;
    try {
      const challenge = await supabase.auth.mfa.challenge({
        factorId: gate.factorId,
      });
      if (challenge.error) throw challenge.error;
      if (version !== epoch.current) return;
      const result = await supabase.auth.mfa.verify({
        factorId: gate.factorId,
        challengeId: challenge.data.id,
        code: value,
      });
      if (result.error) {
        if (version === epoch.current) setError(t.adminWrongCode);
        return;
      }
      refresh.current();
    } catch {
      if (version === epoch.current) setError(t.adminRequestFailed);
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }
  const labels = {
    overview: t.adminOverview,
    "sign-ins": t.adminSignIns,
    users: t.adminUsers,
    trades: t.adminTrades,
    moderation: t.adminModeration,
    "card-sync": t.adminCardSync,
    activity: t.adminActivity,
  };
  return (
    <Container size={gate.kind === "ready" ? "lg" : 760} px="md">
      <Stack>
        <Title order={2}>{t.adminTitle}</Title>
        {error && (
          <Alert color="red">
            <Stack>
              <Text>{error}</Text>
              {gate.kind === "loading" && (
                <Button
                  data-click-id="AdminPage/retry"
                  onClick={() => refresh.current()}
                >
                  {t.adminRetry}
                </Button>
              )}
            </Stack>
          </Alert>
        )}
        {gate.kind === "loading" && !error && (
          <Center mih={180}>
            <Loader aria-label={t.adminLoading} />
          </Center>
        )}
        {gate.kind === "signed-out" && (
          <>
            <Text>{t.adminSignInIntro}</Text>
            <Button component={Link} to="/" data-click-id="AdminPage/sign-in">
              {t.adminSignIn}
            </Button>
          </>
        )}
        {gate.kind === "denied" && <Text>{t.adminListedOnly}</Text>}
        {(gate.kind === "enroll" || gate.kind === "verify") && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void verify(code);
            }}
          >
            <Stack>
              <Title order={3}>
                {gate.kind === "enroll"
                  ? t.adminEnrollTitle
                  : t.adminVerifyTitle}
              </Title>
              {gate.kind === "enroll" && (
                <>
                  <Text>{t.adminEnrollHelp}</Text>
                  <Image
                    src={gate.qr}
                    alt={t.adminQrAlt}
                    w={220}
                    h={220}
                    style={{ background: "white" }}
                  />
                  <Text size="sm">{t.adminSecret}</Text>
                  <Text ff="monospace" style={{ overflowWrap: "anywhere" }}>
                    {gate.secret}
                  </Text>
                </>
              )}
              <TextInput
                data-click-id="AdminPage/code"
                label={t.adminCode}
                value={code}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                disabled={busy}
                onChange={(e) => {
                  const value = e.currentTarget.value
                    .replace(/\D/g, "")
                    .slice(0, 6);
                  setCode(value);
                  if (value.length === 6) void verify(value);
                }}
              />
              <Button
                data-click-id="AdminPage/verify"
                type="submit"
                loading={busy}
                disabled={code.length !== 6}
              >
                {t.adminVerify}
              </Button>
            </Stack>
          </form>
        )}
        {gate.kind === "ready" && (
          <>
            <Text size="sm" c="dimmed">
              {gate.email}
            </Text>
            <Tabs
              value={tab}
              keepMounted={false}
              onChange={(v) => {
                if (!v) return;
                setTab(v);
                try {
                  localStorage.setItem("admin-tab", v);
                } catch {}
              }}
            >
              <Tabs.List>
                {Object.values(ADMIN_TAB).map((v) => (
                  <Tabs.Tab
                    key={v}
                    value={v}
                    data-click-id={"AdminPage/tab:" + v}
                  >
                    {labels[v]}
                  </Tabs.Tab>
                ))}
              </Tabs.List>
              <Tabs.Panel value={ADMIN_TAB.overview} pt="md">
                <AdminOverview />
              </Tabs.Panel>
              <Tabs.Panel value={ADMIN_TAB.signIns} pt="md">
                <AdminSignIns />
              </Tabs.Panel>
              <Tabs.Panel value={ADMIN_TAB.users} pt="md">
                <AdminUsers />
              </Tabs.Panel>
              <Tabs.Panel value={ADMIN_TAB.trades} pt="md">
                <AdminTrades />
              </Tabs.Panel>
              <Tabs.Panel value={ADMIN_TAB.moderation} pt="md">
                <AdminModeration />
              </Tabs.Panel>
              <Tabs.Panel value={ADMIN_TAB.cardSync} pt="md">
                <AdminCardSync />
              </Tabs.Panel>
              <Tabs.Panel value={ADMIN_TAB.activity} pt="md">
                <AdminActivity />
              </Tabs.Panel>
            </Tabs>
          </>
        )}
      </Stack>
    </Container>
  );
}
