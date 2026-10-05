import { ActionIcon, Tooltip, useComputedColorScheme, useMantineColorScheme } from '@mantine/core';
import { IconMoon, IconSun } from '@tabler/icons-react';
import { useLocalizationStore } from '../../store/useLocalizationStore';

// One button that switches between dark (the default) and light
export function ColorSchemeToggle() {
  const { setColorScheme } = useMantineColorScheme();
  const computed = useComputedColorScheme('dark', { getInitialValueInEffect: false });
  const t = useLocalizationStore((state) => state.t);
  const isDark = computed === 'dark';
  const label = isDark ? t.switchToLight : t.switchToDark;

  return (
    <Tooltip label={label} withArrow>
      <ActionIcon
        data-click-id="ColorSchemeToggle/toggle"
        variant="default"
        size="lg"
        radius="md"
        aria-label={label}
        onClick={() => setColorScheme(isDark ? 'light' : 'dark')}
      >
        {isDark ? <IconSun size={18} stroke={1.5} /> : <IconMoon size={18} stroke={1.5} />}
      </ActionIcon>
    </Tooltip>
  );
}
