import type { ReactNode } from 'react';
import { Group, Paper, Progress, Text, Title } from '@mantine/core';
import { formatPence } from '../../utils/money';
import { useLocalizationStore } from '../../store/useLocalizationStore';

// One goal's progress: title, "£X of £Y", bar, optional description and extra content
export function FundingBar({
  title,
  description,
  raisedPence,
  targetPence,
  note,
  children,
}: {
  title: string;
  description?: string | null;
  raisedPence: number;
  targetPence: number;
  note?: string;
  children?: ReactNode;
}) {
  const t = useLocalizationStore((state) => state.t);
  const percent = targetPence > 0 ? Math.min(100, (raisedPence / targetPence) * 100) : 0;
  const reached = raisedPence >= targetPence;

  return (
    <Paper withBorder radius="md" p="lg">
      <Group justify="space-between" align="baseline" mb={4} wrap="nowrap">
        <Title order={4}>{title}</Title>
        <Text fw={600} style={{ whiteSpace: 'nowrap' }}>
          {t.supportRaisedOf(formatPence(raisedPence), formatPence(targetPence))}
        </Text>
      </Group>
      {description && (
        <Text size="sm" c="dimmed" mb="sm">
          {description}
        </Text>
      )}
      <Progress value={percent} size="lg" radius="xl" color={reached ? 'teal' : 'blue'} aria-label={title} />
      <Text size="xs" c={reached ? 'teal' : 'dimmed'} mt={6}>
        {reached ? t.supportGoalReached : note}
      </Text>
      {children}
    </Paper>
  );
}
