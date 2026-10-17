import { useState } from 'react';
import { Box, Tabs, Text, Title } from '@mantine/core';
import { MARKET_TAB } from '../../constants';
import { useLocalizationStore } from '../../store/useLocalizationStore';
import { CardMarket } from './CardMarket';
import { ExclusiveTradeMarket } from './ExclusiveTradeMarket';

export function HomeMarket() {
  const t = useLocalizationStore((s) => s.t);
  const [tab, setTab] = useState<string | null>(MARKET_TAB.cards);
  const [focusExclusiveId, setFocusExclusiveId] = useState<number | null>(null);
  const [exclusiveVisited, setExclusiveVisited] = useState(false);

  return (
    <Box w="100%">
      <Title order={2}>{t.marketTitle}</Title>
      <Text size="sm" c="dimmed" mt="xs" mb="md">
        {t.marketIntro}
      </Text>
      <Tabs value={tab} onChange={(value) => {
        setTab(value);
        if (value === MARKET_TAB.exclusive) setExclusiveVisited(true);
      }} keepMounted={false}>
        <Tabs.List>
          <Tabs.Tab value={MARKET_TAB.cards} data-click-id="HomeMarket/tab:cards">
            {t.marketTabCards}
          </Tabs.Tab>
          <Tabs.Tab
            value={MARKET_TAB.exclusive}
            data-click-id="HomeMarket/tab:exclusive"
            onClick={() => setFocusExclusiveId(null)}
          >
            {t.marketTabExclusive}
          </Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value={MARKET_TAB.cards} pt="md" keepMounted>
          <CardMarket
            onOpenExclusive={(id) => {
              setFocusExclusiveId(id);
              setExclusiveVisited(true);
              setTab(MARKET_TAB.exclusive);
            }}
          />
        </Tabs.Panel>
        <Tabs.Panel value={MARKET_TAB.exclusive} pt="md" keepMounted>
          {exclusiveVisited && <ExclusiveTradeMarket focusId={focusExclusiveId} />}
        </Tabs.Panel>
      </Tabs>
    </Box>
  );
}
