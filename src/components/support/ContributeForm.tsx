import { useState } from 'react';
import { Button, Chip, Group, NumberInput, Paper, SegmentedControl, Select, Stack, Text, Title } from '@mantine/core';
import { supabase } from '../../supabaseClient';
import { formatPence } from '../../utils/money';
import { useLocalizationStore } from '../../store/useLocalizationStore';
import { useAuthStore } from '../../store/userStore';

const PRESETS_PENCE = [300, 500, 1000];
const MIN_PENCE = 100;
const MAX_PENCE = 50000;

export type UpgradeGoalOption = { id: string; title: string };

// Choose monthly/one-off, amount and which bar to fund, then go to Stripe Checkout
export function ContributeForm({ upgradeGoals }: { upgradeGoals: UpgradeGoalOption[] }) {
  const t = useLocalizationStore((state) => state.t);
  const signedIn = useAuthStore((state) => Boolean(state.session));
  const [mode, setMode] = useState<'monthly' | 'one_off'>('monthly');
  const [preset, setPreset] = useState<string>(String(PRESETS_PENCE[1]));
  const [customPounds, setCustomPounds] = useState<number | string>('');
  const [goalId, setGoalId] = useState<string>('monthly');
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const amountPence = preset === 'custom' ? Math.round(Number(customPounds) * 100) : Number(preset);
  const validAmount = Number.isFinite(amountPence) && amountPence >= MIN_PENCE && amountPence <= MAX_PENCE;

  async function handleContinue() {
    setStarting(true);
    setError(null);
    const { data, error } = await supabase.functions.invoke('create-checkout', {
      body: { amountPence, mode, goalId: goalId === 'monthly' ? null : goalId },
    });
    if (error || !data?.url) {
      console.warn(error ?? data);
      setError(t.supportStartFailed);
      setStarting(false);
      return;
    }
    window.location.href = data.url;
  }

  return (
    <Paper withBorder radius="md" p="lg">
      <Title order={3} mb="md">
        {t.supportContributeTitle}
      </Title>
      <Stack gap="md">
        <SegmentedControl
          data-click-id="ContributeForm/mode"
          fullWidth
          value={mode}
          onChange={(value) => setMode(value as 'monthly' | 'one_off')}
          data={[
            { value: 'monthly', label: t.supportMonthly },
            { value: 'one_off', label: t.supportOneOff },
          ]}
        />

        <Chip.Group value={preset} onChange={(value) => setPreset(value as string)}>
          <Group gap="xs">
            {PRESETS_PENCE.map((pence) => (
              <Chip key={pence} wrapperProps={{ 'data-click-id': `ContributeForm/amount:${pence}` }} value={String(pence)} radius="sm">
                {formatPence(pence)}
              </Chip>
            ))}
            <Chip wrapperProps={{ 'data-click-id': 'ContributeForm/amount:custom' }} value="custom" radius="sm">
              {t.supportOtherAmount}
            </Chip>
          </Group>
        </Chip.Group>

        {preset === 'custom' && (
          <NumberInput
            data-click-id="ContributeForm/custom-amount"
            label={t.supportOtherAmount}
            description={t.supportAmountLimits}
            prefix="£"
            min={1}
            max={500}
            decimalScale={2}
            value={customPounds}
            onChange={setCustomPounds}
            error={customPounds !== '' && !validAmount ? t.supportAmountLimits : undefined}
          />
        )}

        <Select
          data-click-id="ContributeForm/goal-select"
          label={t.supportPutTowards}
          value={goalId}
          onChange={(value) => setGoalId(value ?? 'monthly')}
          allowDeselect={false}
          data={[
            { value: 'monthly', label: t.supportMonthlyCostsOption },
            ...upgradeGoals.map((goal) => ({ value: goal.id, label: goal.title })),
          ]}
        />

        <Button data-click-id="ContributeForm/continue" size="md" onClick={handleContinue} loading={starting} disabled={!validAmount}>
          {validAmount ? t.supportContinue(formatPence(amountPence), mode === 'monthly') : t.supportContributeTitle}
        </Button>
        {error && (
          <Text size="sm" c="red">
            {error}
          </Text>
        )}
        <Text size="xs" c="dimmed">
          {t.supportSecureNote}
          {!signedIn && ` ${t.supportSignInNote}`}
        </Text>
      </Stack>
    </Paper>
  );
}
