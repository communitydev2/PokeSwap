import { useState } from 'react';
import { Badge, Group, Paper, Switch, Text, Title } from '@mantine/core';
import { supabase } from '../../supabaseClient';
import { useLocalizationStore } from '../../store/useLocalizationStore';
import { useAuthStore } from '../../store/userStore';

// Thank-you list of supporters who opted in, plus the opt-in switch for the signed-in user
export function SupportersList({ usernames, onOptInChanged }: { usernames: string[]; onOptInChanged: () => void }) {
  const t = useLocalizationStore((state) => state.t);
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  async function handleToggle(show: boolean) {
    if (!user || saving) return;
    setFailed(false);
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('user_account')
        .update({ show_in_supporters: show })
        .eq('user_id', user.user_id)
        .select()
        .maybeSingle();

      if (useAuthStore.getState().session?.user.id !== user.user_id) return;
      if (error || !data) {
        setFailed(true);
        console.warn(error);
        return;
      }
      if (data) setUser(data);
      onOptInChanged();
    } catch (error) {
      console.warn(error);
      setFailed(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Paper withBorder radius="md" p="md">
      <Title order={4} mb="sm">
        {t.supportThankYouList}
      </Title>
      {usernames.length ? (
        <Group gap="xs">
          {usernames.map((name) => (
            <Badge key={name} variant="light" size="lg" radius="sm" tt="none">
              {name}
            </Badge>
          ))}
        </Group>
      ) : (
        <Text size="sm" c="dimmed">
          {t.supportNoSupportersYet}
        </Text>
      )}
      {failed && <Text size="sm" c="red" mt="sm">{t.qaOptInFailed}</Text>}
      {user?.username && (
        <Switch
          wrapperProps={{ 'data-click-id': 'SupportersList/show-me' }}
          mt="md"
          label={t.supportShowMe}
          checked={Boolean(user.show_in_supporters)}
          disabled={saving}
          onChange={(e) => handleToggle(e.currentTarget.checked)}
        />
      )}
    </Paper>
  );
}
