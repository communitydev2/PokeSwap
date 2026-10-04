import { useCallback, useEffect, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Alert, Anchor, Center, Container, Group, Loader, Stack, Text, Title } from '@mantine/core'
import { supabase } from '../supabaseClient'
import { useLocalizationStore } from '../store/useLocalizationStore'
import { formatPence } from '../utils/money'
import { FundingBar } from '../components/support/FundingBar'
import { ContributeForm } from '../components/support/ContributeForm'
import { SupportersList } from '../components/support/SupportersList'

export const Route = createFileRoute('/support')({
  component: Support,
})

type Goal = {
  id: string
  kind: 'monthly' | 'upgrade'
  title: string
  description: string | null
  target_pence: number
  raised_pence: number
  sort: number
}
type Cost = { id: string; label: string; amount_pence: number }

// Optional: Stripe's no-code customer portal link, so monthly supporters can manage or cancel
const portalUrl = import.meta.env.VITE_STRIPE_PORTAL_URL as string | undefined

function Support() {
  const t = useLocalizationStore((state) => state.t)
  const [goals, setGoals] = useState<Goal[] | null>(null)
  const [costs, setCosts] = useState<Cost[]>([])
  const [supporters, setSupporters] = useState<string[]>([])
  const [notSetUp, setNotSetUp] = useState(false)
  const [thanks, setThanks] = useState(() => new URLSearchParams(window.location.search).has('thanks'))

  const loadSupporters = useCallback(async () => {
    const { data } = await supabase.from('supporters_public').select('username')
    setSupporters((data ?? []).map((row) => row.username))
  }, [])

  useEffect(() => {
    async function load() {
      const [goalsResult, costsResult] = await Promise.all([
        supabase.from('funding_progress').select('*').order('sort'),
        supabase.from('monthly_costs').select('id, label, amount_pence').order('sort'),
      ])
      if (goalsResult.error) {
        console.warn(goalsResult.error)
        setNotSetUp(true)
        return
      }
      setGoals(goalsResult.data as Goal[])
      setCosts((costsResult.data ?? []) as Cost[])
      loadSupporters()
    }
    load()
  }, [loadSupporters])

  const monthly = goals?.find((goal) => goal.kind === 'monthly')
  const upgrades = goals?.filter((goal) => goal.kind === 'upgrade') ?? []

  return (
    <Container size="sm" pb="xl">
      <Title order={1} mb="xs">
        {t.supportTitle}
      </Title>
      <Text c="dimmed" mb="xl">
        {t.supportIntro}
      </Text>

      {thanks && (
        <Alert data-click-id="Support/thanks" color="teal" title={t.supportThanksTitle} withCloseButton onClose={() => setThanks(false)} mb="lg">
          {t.supportThanksBody}
        </Alert>
      )}

      {notSetUp ? (
        <Alert color="yellow">{t.supportNotSetUp}</Alert>
      ) : !goals ? (
        <Center py="xl">
          <Loader />
        </Center>
      ) : (
        <Stack gap="lg">
          {monthly && (
            <FundingBar
              title={`${monthly.title} · ${t.supportThisMonth}`}
              description={monthly.description}
              raisedPence={monthly.raised_pence}
              targetPence={monthly.target_pence}
              note={t.supportMonthlyResets}
            >
              {costs.length > 0 && (
                <>
                  <Text size="sm" fw={500} mt="md" mb={4}>
                    {t.supportWhereMoneyGoes}
                  </Text>
                  <Stack gap={2}>
                    {costs.map((cost) => (
                      <Group key={cost.id} justify="space-between">
                        <Text size="sm">{cost.label}</Text>
                        <Text size="sm" c="dimmed">
                          {formatPence(cost.amount_pence)}
                        </Text>
                      </Group>
                    ))}
                  </Stack>
                </>
              )}
            </FundingBar>
          )}

          <ContributeForm upgradeGoals={upgrades.map(({ id, title }) => ({ id, title }))} />

          {upgrades.length > 0 && (
            <>
              <Title order={3}>{t.supportUpgrades}</Title>
              {upgrades.map((goal) => (
                <FundingBar
                  key={goal.id}
                  title={goal.title}
                  description={goal.description}
                  raisedPence={goal.raised_pence}
                  targetPence={goal.target_pence}
                />
              ))}
            </>
          )}

          <SupportersList usernames={supporters} onOptInChanged={loadSupporters} />

          {portalUrl && (
            <Anchor data-click-id="Support/manage" href={portalUrl} target="_blank" rel="noreferrer" size="sm" ta="center">
              {t.supportManage}
            </Anchor>
          )}
        </Stack>
      )}
    </Container>
  )
}
