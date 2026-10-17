import { SUPPORT_PAGE_ENABLED } from '../constants'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Anchor, Container, Group, Stack, Text, Title } from '@mantine/core'
import { useLocalizationStore } from '../store/useLocalizationStore'

export const Route = createFileRoute('/about')({ component: About })

function About() {
  const t = useLocalizationStore((state) => state.t)
  return (
    <Container size={760} px="md">
      <Stack gap="xl">
        <Title order={2}>{t.aboutTitle}</Title>
        <Stack gap="md">
          <Text>{t.aboutBody1}</Text>
          <Text>{t.aboutBody2}</Text>
        </Stack>
        <Group>
          <Anchor component={Link} to="/updates" data-click-id="About/updates">{t.updatesNav}</Anchor>
          {SUPPORT_PAGE_ENABLED && <Anchor component={Link} to="/support" data-click-id="About/support">{t.supportNav}</Anchor>}
        </Group>
      </Stack>
    </Container>
  )
}
