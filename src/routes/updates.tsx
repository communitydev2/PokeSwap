import { createFileRoute } from '@tanstack/react-router'
import { Badge, Paper, Container, Group, Image, Stack, Text, Title } from '@mantine/core'
import { useEffect, useState } from 'react'
import { visibleUpdates, type Update } from '../updates/updates'
import { fetchAddedSets } from '../utils/newSets'
import { useLocalizationStore } from '../store/useLocalizationStore'

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
  const t = useLocalizationStore((state) => state.t)
  // Written articles plus one automatic article per expansion the card sync added
  const [articles, setArticles] = useState<Update[]>(visibleUpdates)

  useEffect(() => {
    fetchAddedSets().then((sets) => {
      if (!sets.length) return
      const newSetArticles: Update[] = sets.map((set) => ({
        id: `new-set-${set.set_code}`,
        date: set.added_at.slice(0, 10),
        audience: 'user',
        title: t.newSetArticleTitle(set.set_name),
        summary: t.newSetArticleSummary(set.set_name, set.total_card_count ?? 0),
        body: [t.newSetArticleBody],
        tags: ['new set'],
      }))
      setArticles([...newSetArticles, ...visibleUpdates].sort((a, b) => b.date.localeCompare(a.date)))
    })
  }, [t])

  return (
    <Container size={760} px="md">
      <Title order={2} mb="xs">
        {t.updatesNav}
      </Title>
      <Text c="dimmed" mb="xl">
        {t.updatesIntro}
      </Text>

      <Stack gap="xl">
        {articles.map((update) => (
          <Paper key={update.id} id={update.id} withBorder radius="md" p="md" component="article">
            {update.screenshot && (
              <Stack mb="md">
                <Image src={update.screenshot} alt={t.updateScreenshotAlt(update.title)} radius="md" w="100%" />
              </Stack>
            )}

            <Group justify="space-between" mb="xs" wrap="wrap" align="flex-start">
              <Title order={4}>{update.title}</Title>
              <Text size="sm" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
                {formatDate(update.date)}
              </Text>
            </Group>

            {(update.tags || update.audience === 'dev') && (
              <Group gap="xs" mb="sm">
                {update.audience === 'dev' && (
                  <Badge variant="light" color="gray" size="sm">
                    {t.updateDevBadge}
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
          </Paper>
        ))}
      </Stack>
    </Container>
  )
}
