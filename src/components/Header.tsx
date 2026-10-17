import { ColorSchemeToggle } from './ColorSchemeToggle/ColorSchemeToggle';

import { Link, useNavigate } from '@tanstack/react-router';
import { IconChevronDown } from '@tabler/icons-react';
import {
  Badge,
  Burger,
  Button,
  Divider,
  Drawer,
  Group,
  ScrollArea,
  Text,
  Menu,
  Stack,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import classes from '../assets/Header.module.css';
import { useAuthStore } from '../store/userStore';
import { useStateStore } from '../store/useStateStore';
import { supabase } from '../supabaseClient';
import { useSavedAccountsStore } from '../store/savedAccountsStore';
import { useLocalizationStore } from '../store/useLocalizationStore';
import { NotificationBell } from './NotificationBell';

export function Header() {
  const [drawerOpened, { toggle: toggleDrawer, close: closeDrawer }] = useDisclosure(false);
  const authStore = useAuthStore();
  const useStateStoreHandle = useStateStore();

  const navigate = useNavigate();
  const savedAccounts = useSavedAccountsStore();
  const t = useLocalizationStore((state) => state.t);
  const session = authStore.session;
  // Signed in = has a session and has finished sign-up (chosen a username)
  const isSignedIn = Boolean(session && authStore.user?.username);
  const displayName = authStore.user?.username || session?.user.email || t.headerFallbackName;
  // Other accounts saved on this device that can be switched to
  const otherAccounts = savedAccounts.accounts.filter((a) => a.userId !== session?.user.id);

  // The Manage Cards menu lives on the home page, so go there first
  function handleManageCardsMenu() {
    closeDrawer();
    navigate({ to: '/' });
    useStateStoreHandle.setShowManageCardsMainMenu(true);
  }

  // The sign-in form (and username setup) is on the home page
  function handleLogIn() {
    closeDrawer();
    navigate({ to: '/' });
  }

  // Signs out of this account on this device and forgets it from the switcher
  async function handleLogOut() {
    closeDrawer();
    useStateStoreHandle.setShowManageCardsMainMenu(false);
    if (session) savedAccounts.remove(session.user.id);
    await supabase.auth.signOut({ scope: 'local' });
    navigate({ to: '/' });
  }

  async function handleSwitchAccount(userId: string) {
    closeDrawer();
    useStateStoreHandle.setShowManageCardsMainMenu(false);
    const { ok } = await savedAccounts.switchTo(userId);
    if (!ok) savedAccounts.setNotice(t.headerAccountSignedOut);
    navigate({ to: '/' });
  }

  // Shows the sign-in form while keeping the current account saved
  function handleAddAccount() {
    closeDrawer();
    useStateStoreHandle.setShowManageCardsMainMenu(false);
    savedAccounts.setAddingAccount(true);
    navigate({ to: '/' });
  }

  return (
    <>
      <header className={classes.header}>
        <Group className={classes.inner} gap="xs" wrap="nowrap" align="center" h="100%">
          <Link to="/" data-click-id="Header/logo" className={classes.logo}>{t.appName}</Link>

          <Group className={classes.nav} h="100%" gap={0} wrap="nowrap" visibleFrom="sm">
            <Link data-click-id="Header/home" to="/" className={classes.link}>
              {t.homeNav}
            </Link>

            <Link data-click-id="Header/updates" to="/updates" className={classes.link}>
              {t.updatesNav}
            </Link>
            <Link data-click-id="Header/support" to="/support" className={classes.link}>
              {t.supportNav}
            </Link>
          </Group>

          <Group gap="xs" wrap="nowrap" align="center" ml="auto">
            {isSignedIn && <NotificationBell />}
            <ColorSchemeToggle />
          </Group>

          {session ? (
            <Group visibleFrom="sm" gap="xs" wrap="nowrap" align="center">
              {isSignedIn ? (
                <Button data-click-id="Header/manage-cards" variant="default" onClick={handleManageCardsMenu}>{t.headerManageCards}</Button>
              ) : (
                !authStore.profileLoading && (
                  <Button data-click-id="Header/set-username" onClick={handleLogIn}>{t.headerSetUsername}</Button>
                )
              )}
              <Menu position="bottom-end" width={260} shadow="md" withinPortal>
                <Menu.Target>
                  <Button data-click-id="Header/account-menu" variant="subtle" color="gray" c="var(--mantine-color-text)" maw={200} mt={0} style={{ whiteSpace: 'nowrap' }} styles={{ label: { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }} rightSection={<IconChevronDown size={16} />}>
                    {t.headerGreeting(displayName)}
                    {authStore.isSupporter && (
                      <Badge ml={6} size="xs" variant="filled" color="pink">
                        {t.supporterBadge}
                      </Badge>
                    )}
                  </Button>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Label>{t.headerSignedInAs(session.user.email ?? '')}</Menu.Label>
                  {otherAccounts.length > 0 && <Menu.Label>{t.headerSwitchAccount}</Menu.Label>}
                  {otherAccounts.map((account, i) => (
                    <Menu.Item
                      key={account.userId}
                      data-click-id={`Header/switch-account:${i}`}
                      onClick={() => handleSwitchAccount(account.userId)}
                    >
                      <Text size="sm">{account.username || account.email}</Text>
                      {account.username && (
                        <Text size="xs" c="dimmed">
                          {account.email}
                        </Text>
                      )}
                    </Menu.Item>
                  ))}
                  <Menu.Item data-click-id="Header/add-account" onClick={handleAddAccount}>
                    {t.headerAddAccount}
                  </Menu.Item>
                  <Menu.Divider />
                  <Menu.Item data-click-id="Header/log-out" color="red" onClick={handleLogOut}>
                    {t.headerLogOut}
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            </Group>
          ) : (
            <Group visibleFrom="sm">
              <Button data-click-id="Header/log-in" onClick={handleLogIn}>{t.headerLogIn}</Button>
            </Group>
          )}

          <Burger data-click-id="Header/burger" opened={drawerOpened} onClick={toggleDrawer} hiddenFrom="sm" />
        </Group>
      </header>

      <Drawer
        opened={drawerOpened}
        onClose={closeDrawer}
        size="100%"
        padding="md"
        title={t.headerNavigation}
        hiddenFrom="sm"
        zIndex={1000000}
      >
        <ScrollArea h="calc(100vh - 80px)" mx="-md">
          <Divider my="sm" />

          <Link data-click-id="Header/drawer-home" to="/" onClick={closeDrawer} className={classes.link}>
            {t.homeNav}
          </Link>
          <Link data-click-id="Header/drawer-updates" to="/updates" className={classes.link} onClick={closeDrawer}>
            {t.updatesNav}
          </Link>
          <Link data-click-id="Header/drawer-support" to="/support" className={classes.link} onClick={closeDrawer}>
            {t.supportNav}
          </Link>

          <Divider my="sm" />

          {session ? (
            <Stack gap="xs" pb="xl" px="md">
              <Text size="sm" c="dimmed">
                {t.headerSignedInAs(session.user.email ?? '')}
              </Text>
              {isSignedIn ? (
                <Button data-click-id="Header/drawer-manage-cards" variant="default" onClick={handleManageCardsMenu}>{t.headerManageCards}</Button>
              ) : (
                <Button data-click-id="Header/drawer-set-username" onClick={handleLogIn}>{t.headerSetUsername}</Button>
              )}
              {otherAccounts.map((account, i) => (
                <Button
                  key={account.userId}
                  data-click-id={`Header/drawer-switch-account:${i}`}
                  variant="light"
                  onClick={() => handleSwitchAccount(account.userId)}
                >
                  {t.headerSwitchTo(account.username || account.email)}
                </Button>
              ))}
              <Button data-click-id="Header/drawer-add-account" variant="subtle" c="var(--mantine-color-text)" onClick={handleAddAccount}>{t.headerAddAccount}</Button>
              <Button data-click-id="Header/drawer-log-out" variant="subtle" color="red" onClick={handleLogOut}>{t.headerLogOut}</Button>
            </Stack>
          ) : (
            <Group justify="center" grow pb="xl" px="md">
              <Button data-click-id="Header/drawer-log-in" onClick={handleLogIn}>{t.headerLogIn}</Button>
            </Group>
          )}
        </ScrollArea>
      </Drawer>
    </>
  );
}

