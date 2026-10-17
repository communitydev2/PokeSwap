import { useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Alert, Button, Center, Container, Loader, Stack } from '@mantine/core';
import { useStateStore } from '../store/useStateStore';
import { useAuthStore } from '../store/userStore';
import { useSavedAccountsStore } from '../store/savedAccountsStore';
import { useLocalizationStore } from '../store/useLocalizationStore';
import { loadCardCatalogue } from '../utils/loadCardCatalogue';
import { Auth } from './Auth';
import { HomeMarket } from './market/HomeMarket';
import { Account } from './Account';
import { ChangeUsername } from './ChangeUsername/ChangeUsername';

export default function LandingPage({ signInOnly = false }: { signInOnly?: boolean }) {
  const navigate = useNavigate();
  const showManageCardsMainMenu = useStateStore((s) => s.showManageCardsMainMenu);
  const { session, profileLoading, profileError, authReady, user } = useAuthStore();
  const { addingAccount, notice, setNotice } = useSavedAccountsStore();
  const t = useLocalizationStore((state) => state.t);

  useEffect(() => {
    if (signInOnly && authReady && session && user?.username && !profileLoading && !addingAccount) {
      void navigate({ to: '/', replace: true });
    }
    if (!signInOnly && authReady && session && !user?.username && !profileLoading && !profileError) {
      void navigate({ to: '/login', replace: true });
    }
  }, [signInOnly, authReady, session, user?.username, profileLoading, profileError, addingAccount, navigate]);

  useEffect(() => {
    if (!signInOnly) void loadCardCatalogue();
  }, [signInOnly]);

  return (
    <Container size={760} px="md">
      <Stack gap="xl">
        {notice && (
          <Alert data-click-id="LandingPage/notice" color="yellow" withCloseButton onClose={() => setNotice(null)}>
            {notice}
          </Alert>
        )}
        {!authReady ? (
          signInOnly ? <Center py="xl"><Loader /></Center> : null
        ) : !session || addingAccount ? (
          signInOnly ? <Auth /> : null
        ) : profileLoading ? (
          <Center py="xl"><Loader /></Center>
        ) : profileError ? (
          <Alert color="red">{t.qaProfileFailed}
            <Button data-click-id="LandingPage/retry-profile" onClick={() => window.location.reload()}>{t.qaRetry}</Button>
          </Alert>
        ) : !user?.username ? (
          signInOnly ? <ChangeUsername key={session.user.id} mode="set" /> : null
        ) : (
          !signInOnly && <Account key={session.user.id} session={session} />
        )}
        {!signInOnly && (!session || !showManageCardsMainMenu) && <HomeMarket />}
      </Stack>
    </Container>
  );
}
