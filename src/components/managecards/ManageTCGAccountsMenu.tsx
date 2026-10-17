import { validateAccounts, normalizeFriendId } from './accountValidation';
import { useRef, useState } from 'react';
import { ActionIcon, Button, Group, Paper, Stack, Text, TextInput, Title } from '@mantine/core';
import { supabase } from '../../supabaseClient';
import { useAuthStore } from '../../store/userStore';
import { useLocalizationStore } from '../../store/useLocalizationStore';


type AccountRow = { key: number; name: string; tcgId: string };
type RowErrors = { name?: string; tcgId?: string };

let nextKey = 1;
const emptyRow = (): AccountRow => ({ key: nextKey++, name: '', tcgId: '' });

// Form for adding one or more Pokémon TCG Pocket accounts. Starts with one row;
// more can be added. Everything is validated before saving, all rows are saved
// in one request, and onCreated lets the parent reload its account list.
export function ManageTCGAccountsMenu({ onCreated }: { onCreated?: () => void }) {
  const t = useLocalizationStore((state) => state.t);
  const submitting = useRef(false);
  const userId = useAuthStore((state) => state.session?.user.id);
  const [rows, setRows] = useState<AccountRow[]>(() => [emptyRow()]);
  const [errors, setErrors] = useState<Partial<Record<number, RowErrors>>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  function updateRow(key: number, field: 'name' | 'tcgId', value: string) {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, [field]: value } : row)));
    setErrors((current) => ({ ...current, [key]: { ...current[key], [field]: undefined } }));
    setMessage(null);
  }

  function removeRow(key: number) {
    setRows((current) => current.filter((row) => row.key !== key));
  }

  function validate(): boolean {
    const found = validateAccounts(rows, t);
    setErrors(found);
    return Object.keys(found).length === 0;
  }

  async function handleSubmit() {
    if (submitting.current) return;
    setMessage(null);
    if (!userId || !validate()) return;

    submitting.current = true;
    setSaving(true);
    try {
    const { error } = await supabase.from('player_tcg_account').insert(
      rows.map((row) => ({
        user_id: userId,
        tcg_id_username: row.name.trim(),
        // Sent as text: 16-digit IDs are too long for a JavaScript number
        tcg_id: normalizeFriendId(row.tcgId),
      })),
    );
    setSaving(false);

    if (error) {
      console.warn(error);
      setMessage({
        ok: false,
        text: error.code === '23505' ? t.qaManageAccountExists : t.qaManageAccountSaveFailed,
      });
      return;
    }
    setMessage({ ok: true, text: t.qaManageAccountsAdded(rows.length) });
    setRows([emptyRow()]);
    onCreated?.();
    } catch (error) {
      console.warn(error);
      setMessage({ ok: false, text: t.qaManageAccountSaveFailed });
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  }

  return (
    <Stack gap="md" w="100%" my="xl">
      <Title order={2}>
        {t.qaManageAccountsTitle}
      </Title>
      <Text c="dimmed" size="sm">
        {t.qaManageAccountsIntro}
      </Text>

      <Stack gap="sm">
        {rows.map((row, i) => (
          <Paper key={row.key} withBorder radius="md" p="md">
            <Group justify="space-between" mb="xs">
              <Text fw={500}>{t.qaManageAccountNumber(i + 1)}</Text>
              {rows.length > 1 && (
                <ActionIcon
                  data-click-id={`ManageTCGAccountsMenu/remove-account:${i}`}
                  disabled={saving}
                  variant="subtle"
                  size={36}
                  color="gray"
                  aria-label={t.qaManageRemoveAccount(i + 1)}
                  onClick={() => removeRow(row.key)}
                >
                  ×
                </ActionIcon>
              )}
            </Group>
            <Stack gap="xs">
              <TextInput
                data-click-id={`ManageTCGAccountsMenu/account-name:${i}`}
                disabled={saving}
                withAsterisk
                label={t.qaManageAccountName}
                placeholder="pokePlayer555"
                value={row.name}
                error={errors[row.key]?.name}
                onChange={(e) => updateRow(row.key, 'name', e.target.value)}
              />
              <TextInput
                data-click-id={`ManageTCGAccountsMenu/account-id-number:${i}`}
                disabled={saving}
                withAsterisk
                label={t.qaManageAccountId}
                placeholder="1234 5678 9012 3456"
                inputMode="numeric"
                value={row.tcgId}
                error={errors[row.key]?.tcgId}
                onChange={(e) => updateRow(row.key, 'tcgId', e.target.value)}
              />
            </Stack>
          </Paper>
        ))}
      </Stack>

      <Group justify="space-between" mt="md">
        <Button
          data-click-id="ManageTCGAccountsMenu/add-row"
          variant="subtle"
          onClick={() => setRows((current) => [...current, emptyRow()])}
        >
          {t.qaManageAddAccount}
        </Button>
        <Button data-click-id="ManageTCGAccountsMenu/submit-accounts" onClick={handleSubmit} loading={saving}>
          {t.qaManageSaveAccounts(rows.length)}
        </Button>
      </Group>

      {message && (
        <Text size="sm" mt="sm" ta="center" c={message.ok ? 'teal' : 'red'}>
          {message.text}
        </Text>
      )}
    </Stack>
  );
}
