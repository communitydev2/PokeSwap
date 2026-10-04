import { useEffect, useState } from 'react';
import { Button, Group, Paper, Text, TextInput, Title } from '@mantine/core';
import { supabase } from '../../supabaseClient';
import { useAuthStore } from '../../store/userStore';

// Lets a signed-in user change their username. Banned words and duplicate
// usernames are rejected by the database, so their errors are shown here.
export function ChangeUsername() {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const userId = useAuthStore((state) => state.session?.user.id);

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
    const { data, error } = await supabase
      .from('user_account')
      .update({ username: trimmed })
      .eq('user_id', userId)
      .select();
    setSaving(false);

    if (error) {
      console.warn(error);
      if (error.message === 'Username contains a banned word') {
        setMessage({ ok: false, text: 'This username is inappropriate, please choose another one.' });
      } else if (error.code === '23505') {
        setMessage({ ok: false, text: 'This username already exists. Please pick another one.' });
      } else {
        setMessage({ ok: false, text: "Couldn't save your username. Please try again." });
      }
      return;
    }
    if (!data?.length) {
      setMessage({ ok: false, text: "Your account profile wasn't found, so the username couldn't be saved." });
      return;
    }

    setUser(data[0]);
    setMessage({ ok: true, text: 'Username updated.' });
  }

  return (
    <Paper withBorder radius="md" p="lg" maw={420}>
      <Title order={4} mb="xs">
        Your username
      </Title>
      <Group align="flex-end" wrap="nowrap">
        <TextInput
          data-click-id="ChangeUsername/username-input"
          label="Username"
          placeholder="Enter a new username"
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
        <Button data-click-id="ChangeUsername/save" onClick={handleSave} loading={saving} disabled={unchanged}>
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
