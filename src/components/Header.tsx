import { ColorSchemeToggle } from './ColorSchemeToggle/ColorSchemeToggle';

import { Link, useNavigate } from '@tanstack/react-router'
import {
  IconBook,
  IconChartPie3,
  IconChevronDown,
  IconCode,
  IconCoin,
  IconFingerprint,
  IconNotification,
} from '@tabler/icons-react';
import {
  Anchor,
  Box,
  Burger,
  Button,
  Center,
  Collapse,
  Divider,
  Drawer,
  Group,
  HoverCard,
  ScrollArea,
  SimpleGrid,
  Text,
  ThemeIcon,
  UnstyledButton,
  useMantineTheme,
  Menu,
  Stack,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { MantineLogo } from '@mantinex/mantine-logo';
import classes from '../assets/Header.module.css';
import { useAuthStore } from '../store/userStore';
import { useStateStore } from '../store/useStateStore';
import { supabase } from '../supabaseClient';
import { useSavedAccountsStore } from '../store/savedAccountsStore';



const mockdata = [
  {
    icon: IconCode,
    title: 'Open source',
    description: 'This Pokémon’s cry is very loud and distracting',
  },
  {
    icon: IconCoin,
    title: 'Free for everyone',
    description: 'The fluid of Smeargle’s tail secretions changes',
  },
  {
    icon: IconBook,
    title: 'Documentation',
    description: 'Yanma is capable of seeing 360 degrees without',
  },
  {
    icon: IconFingerprint,
    title: 'Security',
    description: 'The shell’s rounded shape and the grooves on its.',
  },
  {
    icon: IconChartPie3,
    title: 'Analytics',
    description: 'This Pokémon uses its flying ability to quickly chase',
  },
  {
    icon: IconNotification,
    title: 'Notifications',
    description: 'Combusken battles with the intensely hot flames it spews',
  },
];

export function Header() {
  const [drawerOpened, { toggle: toggleDrawer, close: closeDrawer }] = useDisclosure(false);
  const [linksOpened, { toggle: toggleLinks }] = useDisclosure(false);
  const theme = useMantineTheme();
  const authStore =useAuthStore();
  const useStateStoreHandle = useStateStore();


  const navigate = useNavigate();
  const savedAccounts = useSavedAccountsStore();
  const session = authStore.session;
  // Signed in = has a session and has finished sign-up (chosen a username)
  const isSignedIn = Boolean(session && authStore.user?.username);
  const displayName = authStore.user?.username || session?.user.email || 'there';
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
    if (!ok) savedAccounts.setNotice('That account was signed out. Please sign in to it again.');
    navigate({ to: '/' });
  }

  // Shows the sign-in form while keeping the current account saved
  function handleAddAccount() {
    closeDrawer();
    useStateStoreHandle.setShowManageCardsMainMenu(false);
    savedAccounts.setAddingAccount(true);
    navigate({ to: '/' });
  }



  const links = mockdata.map((item) => (
    <UnstyledButton data-click-id={`Header/features-item:${item.title}`} className={classes.subLink} key={item.title}>
      <Group wrap="nowrap" align="flex-start">
        <ThemeIcon size={34} variant="default" radius="md">
          <item.icon size={22} color={theme.colors.blue[6]} />
        </ThemeIcon>
        <div>
          <Text size="sm" fw={500}>
            {item.title}
          </Text>
          <Text size="xs" c="dimmed">
            {item.description}
          </Text>
        </div>
      </Group>
    </UnstyledButton>
  ));

  return (
    <Box pb={120}>
      <header className={classes.header}>
        <Group justify="space-between" h="100%">
          
          <MantineLogo size={30} />

          <Group h="100%" gap={0} visibleFrom="sm">
            <a data-click-id="Header/home" href="#" className={classes.link}>
              Home
            </a>

            <HoverCard width={600} position="bottom" radius="md" shadow="md" withinPortal>
              <HoverCard.Target>
                <a data-click-id="Header/features" href="#" className={classes.link}>
                  <Center inline>
                    <Box component="span" mr={5}>
                      Features
                    </Box>
                    <IconChevronDown size={16} color={theme.colors.blue[6]} />
                  </Center>
                </a>
              </HoverCard.Target>

              <HoverCard.Dropdown style={{ overflow: 'hidden' }}>
                <Group justify="space-between" px="md">
                  <Text fw={500}>Features</Text>
                  <Anchor data-click-id="Header/features-view-all" href="#" fz="xs">
                    View all
                  </Anchor>
                </Group>

                <Divider my="sm" />

                <SimpleGrid cols={2} spacing={0}>
                  {links}
                </SimpleGrid>

                <div className={classes.dropdownFooter}>
                  <Group justify="space-between">
                    <div>
                      <Text fw={500} fz="sm">
                        Get started
                      </Text>
                      <Text size="xs" c="dimmed">
                        Their food sources have decreased, and their numbers
                      </Text>
                    </div>
                    <Button data-click-id="Header/features-get-started" variant="default">Get started</Button>
                  </Group>
                </div>
              </HoverCard.Dropdown>
            </HoverCard>
            <a data-click-id="Header/learn" href="#" className={classes.link}>
              Learn
            </a>
            <a data-click-id="Header/academy" href="#" className={classes.link}>
              Academy
            </a>
            <Link data-click-id="Header/updates" to="/updates" className={classes.link}>
              Updates
            </Link>
          </Group>

            <ColorSchemeToggle />

            {session ? (
              <Group visibleFrom="sm">
                {isSignedIn ? (
                  <Button data-click-id="Header/manage-cards" variant="default" onClick={handleManageCardsMenu}>Manage Cards</Button>
                ) : (
                  !authStore.profileLoading && (
                    <Button data-click-id="Header/set-username" onClick={handleLogIn}>Set username</Button>
                  )
                )}
                <Menu position="bottom-end" width={260} shadow="md" withinPortal>
                  <Menu.Target>
                    <Button data-click-id="Header/account-menu" variant="subtle" rightSection={<IconChevronDown size={16} />}>
                      Hi {displayName}
                    </Button>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Label>Signed in as {session.user.email}</Menu.Label>
                    {otherAccounts.length > 0 && <Menu.Label>Switch account</Menu.Label>}
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
                      Add another account
                    </Menu.Item>
                    <Menu.Divider />
                    <Menu.Item data-click-id="Header/log-out" color="red" onClick={handleLogOut}>
                      Log out
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>
              </Group>
            ) : (
              <Group visibleFrom="sm">
                <Button data-click-id="Header/log-in" onClick={handleLogIn}>Log in</Button>
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
        title="Navigation"
        hiddenFrom="sm"
        zIndex={1000000}
      >
        <ScrollArea h="calc(100vh - 80px" mx="-md">
          <Divider my="sm" />

          <a data-click-id="Header/drawer-home" href="#" className={classes.link}>
            Home
          </a>
          <UnstyledButton data-click-id="Header/drawer-features" className={classes.link} onClick={toggleLinks}>
            <Center inline>
              <Box component="span" mr={5}>
                Features
              </Box>
              <IconChevronDown size={16} color={theme.colors.blue[6]} />
            </Center>
          </UnstyledButton>
          <Collapse in={linksOpened}>{links}</Collapse>
          <a data-click-id="Header/drawer-learn" href="#" className={classes.link}>
            Learn
          </a>
          <a data-click-id="Header/drawer-academy" href="#" className={classes.link}>
            Academy
          </a>
          <Link data-click-id="Header/drawer-updates" to="/updates" className={classes.link} onClick={closeDrawer}>
            Updates
          </Link>

          <Divider my="sm" />

          {session ? (
            <Stack gap="xs" pb="xl" px="md">
              <Text size="sm" c="dimmed">
                Signed in as {session.user.email}
              </Text>
              {isSignedIn ? (
                <Button data-click-id="Header/drawer-manage-cards" variant="default" onClick={handleManageCardsMenu}>Manage Cards</Button>
              ) : (
                <Button data-click-id="Header/drawer-set-username" onClick={handleLogIn}>Set username</Button>
              )}
              {otherAccounts.map((account, i) => (
                <Button
                  key={account.userId}
                  data-click-id={`Header/drawer-switch-account:${i}`}
                  variant="light"
                  onClick={() => handleSwitchAccount(account.userId)}
                >
                  Switch to {account.username || account.email}
                </Button>
              ))}
              <Button data-click-id="Header/drawer-add-account" variant="subtle" onClick={handleAddAccount}>Add another account</Button>
              <Button data-click-id="Header/drawer-log-out" variant="subtle" color="red" onClick={handleLogOut}>Log out</Button>
            </Stack>
          ) : (
            <Group justify="center" grow pb="xl" px="md">
              <Button data-click-id="Header/drawer-log-in" onClick={handleLogIn}>Log in</Button>
            </Group>
          )}
        </ScrollArea>
      </Drawer>
    </Box>
  );
}

