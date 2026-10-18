import { useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Button, MantineProvider, Stack, Text } from '@mantine/core';
import '@mantine/core/styles.css';
import type { Session } from '@supabase/supabase-js';
import { useAuthStore } from '../../src/store/userStore';
import { usePokemonCardStore } from '../../src/store/pokemonCardsStore';
import type { User } from '../../src/types/User';
import type { PokemonCard } from '../../src/types/PokemonCard';
import { useFriendAccounts, refreshFriendAccounts } from '../../src/hooks/useFriendAccounts';
import { ChangeUsername } from '../../src/components/ChangeUsername/ChangeUsername';
import { WantedCardsPicker } from '../../src/components/managecards/WantedCardsPicker';
import { ExclusiveTrades } from '../../src/components/managecards/ExclusiveTrades';
import { ExclusiveTradeMarket } from '../../src/components/market/ExclusiveTradeMarket';
import { CardPlayers } from '../../src/components/market/CardPlayers';
import { FriendsPage } from '../../src/components/friends/FriendsPage';
import { Trades } from '../../src/components/managecards/Trades';

export const cards: PokemonCard[] = Array.from({ length: 55 }, (_, index) => ({
  card_id: `card-${index}`, card_name: `Fixture ${String(index).padStart(2, '0')}`, card_local_id: `A1-${String(index).padStart(3, '0')}`,
  card_image: null, set_id: index < 30 ? 's1' : 's2', rarity_id: index < 54 ? 'r1' : 'r2',
}));
let root: Root | null = null;
const pickerCards = cards.slice(0, 54);
export function actor(id: string | null, username: string | null = 'Player', changedAt: string | null = null) {
  useAuthStore.getState().setSession(id ? { user: { id, email: `${id}@test.local` }, access_token: 'fixture', refresh_token: 'fixture', token_type: 'bearer' } as Session : null);
  useAuthStore.getState().setUser(id && username !== null ? { user_id: id, username, username_changed_at: changedAt } as User : null);
  useAuthStore.getState().setProfileLoading(false);
}
export function refreshFriends() { refreshFriendAccounts(); }
function FriendProbe({ id }: { id: string }) {
  const result = useFriendAccounts();
  return <Stack><Text data-testid={`friends-${id}`}>{result.loading ? 'loading' : result.error ? 'error' : [...result.ids].sort().join(',') || 'empty'}</Text>
    <Button data-click-id={`Fixture/retry-friends:${id}`} onClick={result.retry}>Retry friends</Button></Stack>;
}
function Picker({ initial }: { initial: string[] }) {
  const [value, setValue] = useState(initial);
  const [language, setLanguage] = useState('en');
  return <><Button data-click-id="Fixture/language" onClick={() => setLanguage((value) => value === 'en' ? 'jp' : 'en')}>Switch language</Button>
    <Text data-testid="selected-value">{value.join(',')}</Text>
    <WantedCardsPicker cards={pickerCards} value={value} onChange={setValue} tcgAccountId="account-a" language={language} rarityId="r1" /></>;
}
export function mount(kind: string, initial: string[] = []) {
  root?.unmount();
  usePokemonCardStore.setState({ pokemonCards: cards, catalogueStatus: 'ready',
    supabase_rarity: [{ rarity_id: 'r1', name: 'One Diamond', idx: 1 }, { rarity_id: 'r2', name: 'Two Diamond', idx: 2 }],
    supabase_expansion: [
      { set_id: 's1', set_code: 'A1', set_name: 'Genetic Apex', idx: 1, total_card_count: 30, official_card_count: 30 },
      { set_id: 's2', set_code: 'A2', set_name: 'Other Set', idx: 2, total_card_count: 25, official_card_count: 25 },
    ],
  });
  const component = kind === 'friends' ? <><FriendProbe id="a" /><FriendProbe id="b" /></>
    : kind === 'friendspage' ? <><FriendProbe id="a" /><FriendsPage /></>
    : kind === 'trades' ? <Trades tcgAccountId="account-a" />
    : kind === 'players' ? <CardPlayers card={cards[0]} friendsOnly onOpenExclusive={() => {}} />
    : kind === 'picker' ? <Picker initial={initial} />
    : kind === 'username' ? <ChangeUsername />
    : kind === 'setup' ? <ChangeUsername mode="set" />
    : kind === 'market' ? <ExclusiveTradeMarket />
    : <ExclusiveTrades tcgAccountId="account-a"
      myTradeCards={[{ id: 1, language: 'en', quantity: 1, card: cards[0] }, { id: 2, language: 'en', quantity: 1, card: cards[54] }]}
      listings={[]} openListings={[]} offers={[]} tradableRarities={new Set(['r1', 'r2'])} busy={null}
      run={async (_key, call) => !(await call).error} />;
  root = createRoot(document.getElementById('fixture-root')!);
  root.render(<MantineProvider defaultColorScheme="dark"><Stack maw={760} mx="auto" p="md">{component}</Stack></MantineProvider>);
}
