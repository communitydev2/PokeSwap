import { useEffect, useState } from 'react';
import { Button, Group, Paper, Text, TextInput, Title } from '@mantine/core';
import { useAuthStore } from '../../store/userStore';
import { saveUsername } from '../../utils/saveUsername';

// Lets a signed-in user choose their first username (mode "set") or change it
// (mode "change"). Banned words and duplicates are rejected by the database.
export function ChangeUsername({ mode = 'change' }: { mode?: 'set' | 'change' }) {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const userId = useAuthStore((state) => state.session?.user.id);
  const email = useAuthStore((state) => state.session?.user.email);

  const [username, setUsername] = useState(user?.username ?? '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  // Fill the field once the profile has loaded
  useEffect(() => {
    setUsername(user?.username ?? '');
  }, [user?.username]);

  const trimmed = username.trim();
  const unchanged = trimmed === (user?.username ?? '');

  async function handleSave() {
    if (!userId) return;
    if (!trimmed) {
      setMessage({ ok: false, text: 'Please write a username.' });
      return;
    }

    setSaving(true);
    setMessage(null);
    const result = await saveUsername(userId, trimmed);
    setSaving(false);

    if ('error' in result) {
      setMessage({ ok: false, text: result.error });
      return;
    }
    setUser(result.user);
    setMessage({ ok: true, text: 'Username updated.' });
  }

  return (
    <Paper withBorder radius="md" p="lg" maw={420} mx={mode === 'set' ? 'auto' : undefined}>
      <Title order={mode === 'set' ? 3 : 4} mb="xs">
        {mode === 'set' ? 'Choose your username' : 'Your username'}
      </Title>
      {mode === 'set' && (
        <Text size="sm" c="dimmed" mb="sm">
          {email ? `Signed in as ${email}. ` : ''}Pick the name other players will see.
        </Text>
      )}
      <Group align="flex-end" wrap="nowrap">
        <TextInput
          data-click-id={mode === 'set' ? 'ChangeUsername/set-username-input' : 'ChangeUsername/username-input'}
          label="Username"
          placeholder={mode === 'set' ? 'Enter your username' : 'Enter a new username'}
          value={username}
          onChange={(e) => {
            setUsername(e.target.value);
            setMessage(null);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !unchanged) handleSave();
          }}
          style={{ flex: 1 }}
        />
        <Button
          data-click-id={mode === 'set' ? 'ChangeUsername/set-save' : 'ChangeUsername/save'}
          onClick={handleSave}
          loading={saving}
          disabled={unchanged}
        >
          Save
        </Button>
      </Group>
      {message && (
        <Text size="sm" mt="xs" c={message.ok ? 'teal' : 'red'}>
          {message.text}
        </Text>
      )}
    </Paper>
  );
}
