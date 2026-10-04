import { useState } from 'react';
import { ActionIcon, Button, Container, Group, Paper, Stack, Text, TextInput, Title } from '@mantine/core';
import classes from '../../assets/ManageTCGAccountsMenu.module.css';
import { supabase } from '../../supabaseClient';
import { useAuthStore } from '../../store/userStore';


type AccountRow = { key: number; name: string; tcgId: string };
type RowErrors = { name?: string; tcgId?: string };

let nextKey = 1;
const emptyRow = (): AccountRow => ({ key: nextKey++, name: '', tcgId: '' });

// Form for adding one or more Pokémon TCG Pocket accounts. Starts with one row;
// more can be added. Everything is validated before saving, all rows are saved
// in one request, and onCreated lets the parent reload its account list.
export function ManageTCGAccountsMenu({ onCreated }: { onCreated?: () => void }) {
  const userId = useAuthStore((state) => state.session?.user.id);
  const [rows, setRows] = useState<AccountRow[]>(() => [emptyRow()]);
  const [errors, setErrors] = useState<Record<number, RowErrors>>({});
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
    const found: Record<number, RowErrors> = {};
    const seenIds = new Set<string>();
    for (const row of rows) {
      const rowErrors: RowErrors = {};
      const id = row.tcgId.replace(/[\s-]/g, '');
      if (!row.name.trim()) rowErrors.name = 'Enter the account name';
      if (!id) rowErrors.tcgId = 'Enter the account ID';
      else if (!/^\d+$/.test(id)) rowErrors.tcgId = 'The ID should only contain numbers';
      else if (seenIds.has(id)) rowErrors.tcgId = 'This ID is already in the list';
      seenIds.add(id);
      if (rowErrors.name || rowErrors.tcgId) found[row.key] = rowErrors;
    }
    setErrors(found);
    return Object.keys(found).length === 0;
  }

  async function handleSubmit() {
    setMessage(null);
    if (!userId || !validate()) return;

    setSaving(true);
    const { error } = await supabase.from('player_tcg_account').insert(
      rows.map((row) => ({
        user_id: userId,
        tcg_id_username: row.name.trim(),
        // Sent as text: 16-digit IDs are too long for a JavaScript number
        tcg_id: row.tcgId.replace(/[\s-]/g, ''),
      })),
    );
    setSaving(false);

    if (error) {
      console.warn(error);
      setMessage({
        ok: false,
        text: error.code === '23505' ? 'One of these accounts has already been added.' : "Couldn't save your accounts. Please try again.",
      });
      return;
    }
    setMessage({ ok: true, text: rows.length === 1 ? 'Account added.' : `${rows.length} accounts added.` });
    setRows([emptyRow()]);
    onCreated?.();
  }

  return (
    <Container size={460} my={30}>
      <Title className={classes.title} ta="center">
        Add your Pokémon TCG Pocket accounts
      </Title>
      <Text c="dimmed" size="sm" ta="center" mt="xs" mb="lg">
        Add at least one account to start managing your cards.
      </Text>

      <Stack gap="sm">
        {rows.map((row, i) => (
          <Paper key={row.key} withBorder radius="md" p="md">
            <Group justify="space-between" mb="xs">
              <Text fw={500}>Account {i + 1}</Text>
              {rows.length > 1 && (
                <ActionIcon
                  data-click-id={`ManageTCGAccountsMenu/remove-account:${i}`}
                  variant="subtle"
                  color="gray"
                  aria-label={`Remove account ${i + 1}`}
                  onClick={() => removeRow(row.key)}
                >
                  ×
                </ActionIcon>
              )}
            </Group>
            <Stack gap="xs">
              <TextInput
                data-click-id={`ManageTCGAccountsMenu/account-name:${i}`}
                withAsterisk
                label="Account name"
                placeholder="pokePlayer555"
                value={row.name}
                error={errors[row.key]?.name}
                onChange={(e) => updateRow(row.key, 'name', e.target.value)}
              />
              <TextInput
                data-click-id={`ManageTCGAccountsMenu/account-id-number:${i}`}
                withAsterisk
                label="Account ID"
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
          + Add another account
        </Button>
        <Button data-click-id="ManageTCGAccountsMenu/submit-accounts" onClick={handleSubmit} loading={saving}>
          {rows.length === 1 ? 'Save account' : `Save ${rows.length} accounts`}
        </Button>
      </Group>

      {message && (
        <Text size="sm" mt="sm" ta="center" c={message.ok ? 'teal' : 'red'}>
          {message.text}
        </Text>
      )}
    </Container>
  );
}
