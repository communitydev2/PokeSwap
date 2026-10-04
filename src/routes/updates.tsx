import { createFileRoute } from '@tanstack/react-router'
import { Badge, Card, Container, Group, Image, Stack, Text, Title } from '@mantine/core'
import { visibleUpdates } from '../updates/updates'

export const Route = createFileRoute('/updates')({
  component: Updates,
})

function formatDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function Updates() {
  return (
    <Container size="sm" pb="xl">
      <Title order={1} mb="xs">
        Updates
      </Title>
      <Text c="dimmed" mb="xl">
        Everything new on the site, latest first.
      </Text>

      <Stack gap="xl">
        {visibleUpdates.map((update) => (
          <Card key={update.id} id={update.id} withBorder radius="md" padding="lg" component="article">
            {update.screenshot && (
              <Card.Section mb="md">
                <Image src={update.screenshot} alt={`Screenshot: ${update.title}`} />
              </Card.Section>
            )}

            <Group justify="space-between" mb="xs" wrap="nowrap" align="flex-start">
              <Title order={3}>{update.title}</Title>
              <Text size="sm" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
                {formatDate(update.date)}
              </Text>
            </Group>

            {(update.tags || update.audience === 'dev') && (
              <Group gap="xs" mb="sm">
                {update.audience === 'dev' && (
                  <Badge variant="filled" color="gray" size="sm">
                    dev
                  </Badge>
                )}
                {update.tags?.map((tag) => (
                  <Badge key={tag} variant="light" size="sm">
                    {tag}
                  </Badge>
                ))}
              </Group>
            )}

            <Text fw={500} mb="sm">
              {update.summary}
            </Text>
            {update.body.map((paragraph, i) => (
              <Text key={i} size="sm" mb="xs">
                {paragraph}
              </Text>
            ))}
          </Card>
        ))}
      </Stack>
    </Container>
  )
}
