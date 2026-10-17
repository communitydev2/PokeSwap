import { useEffect, useRef, useState } from 'react';
import { Button, Group, Paper, Text, TextInput, Title } from '@mantine/core';
import { useAuthStore } from '../../store/userStore';
import { useLocalizationStore } from '../../store/useLocalizationStore';
import { saveUsername } from '../../utils/saveUsername';

// Lets a signed-in user choose their first username (mode "set") or change it
// (mode "change"). Banned words and duplicates are rejected by the database.
export function ChangeUsername({ mode = 'change' }: { mode?: 'set' | 'change' }) {
  const busy = useRef(false);
  const t = useLocalizationStore((state) => state.t);
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
  }, [userId, user?.username]);

  useEffect(() => { setMessage(null); }, [userId]);

  const trimmed = username.trim();
  const unchanged = trimmed === (user?.username ?? '');

  async function handleSave() {
    if (!userId || busy.current) return;
    if (!trimmed) {
      setMessage({ ok: false, text: t.qaUsernameRequired });
      return;
    }

    if ([...trimmed].length > 30) {
      setMessage({ ok: false, text: t.qaUsernameTooLong });
      return;
    }
    busy.current = true;
    setSaving(true);
    setMessage(null);
    let result;
    try {
      result = await saveUsername(userId, trimmed);
    } catch {
      result = { error: t.qaUsernameFailed };
    } finally {
      busy.current = false;
      setSaving(false);
    }
    if (useAuthStore.getState().session?.user.id !== userId) return;

    if ('error' in result) {
      setMessage({ ok: false, text: result.error });
      return;
    }
    setUser(result.user);
    setMessage({ ok: true, text: t.qaUsernameSaved });
  }

  return (
    <Paper withBorder radius="md" p="md" w="100%">
      <Title order={mode === 'set' ? 3 : 4} mb="xs">
        {mode === 'set' ? t.qaUsernameChoose : t.qaUsernameTitle}
      </Title>
      {mode === 'set' && (
        <Text size="sm" c="dimmed" mb="sm">
          {email ? t.headerSignedInAs(email) + '. ' : ''}{t.qaUsernameIntro}
        </Text>
      )}
      <Group align="flex-end" wrap="nowrap">
        <TextInput
          data-click-id={mode === 'set' ? 'ChangeUsername/set-username-input' : 'ChangeUsername/username-input'}
          label={t.qaUsername}
          placeholder={mode === 'set' ? t.qaUsernamePlaceholder : t.qaUsernameNew}
          value={username}
          disabled={saving}
          onChange={(e) => {
            setUsername(e.target.value);
            setMessage(null);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !unchanged) { e.preventDefault(); handleSave(); }
          }}
          style={{ flex: 1, minWidth: 0 }}
        />
        <Button
          data-click-id={mode === 'set' ? 'ChangeUsername/set-save' : 'ChangeUsername/save'}
          onClick={handleSave}
          loading={saving}
          disabled={unchanged}
        >
          {t.qaSave}
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
