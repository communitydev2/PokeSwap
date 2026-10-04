import { Button, Group, useMantineColorScheme } from '@mantine/core';

export function ColorSchemeToggle() {
  const { setColorScheme } = useMantineColorScheme();

  return (
    <Group justify="center" mt="">
      <Button data-click-id="ColorSchemeToggle/light" onClick={() => setColorScheme('light')}>Light</Button>
      <Button data-click-id="ColorSchemeToggle/dark" onClick={() => setColorScheme('dark')}>Dark</Button>
      <Button data-click-id="ColorSchemeToggle/auto" onClick={() => setColorScheme('auto')}>Auto</Button>
    </Group>
  );
}
