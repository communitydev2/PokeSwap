import { useEffect, useState } from 'react';
import { Alert, Container } from '@mantine/core';
import { IconSparkles } from '@tabler/icons-react';
import { useLocalizationStore } from '../store/useLocalizationStore';
import { fetchAddedSets, type AddedSet } from '../utils/newSets';

const SHOW_FOR_DAYS = 14;
const DISMISSED_KEY = 'dismissed-new-sets';

function readDismissed(): string[] {
  try {
    return JSON.parse(localStorage.getItem(DISMISSED_KEY) ?? '[]');
  } catch {
    return [];
  }
}

// "New expansion" banner for sets the card sync added in the last two weeks.
// Each visitor can dismiss it; it stays dismissed for that set on this device.
export function NewSetBanner() {
  const t = useLocalizationStore((state) => state.t);
  const [sets, setSets] = useState<AddedSet[]>([]);
  const [dismissed, setDismissed] = useState<string[]>(readDismissed);

  useEffect(() => {
    fetchAddedSets(SHOW_FOR_DAYS).then(setSets);
  }, []);

  const visible = sets.filter((set) => !dismissed.includes(set.set_code));
  if (!visible.length) return null;

  function dismiss(code: string) {
    setDismissed((current) => {
      const next = [...current, code];
      try {
        localStorage.setItem(DISMISSED_KEY, JSON.stringify(next));
      } catch {
        // storage unavailable - dismissed for this visit only
      }
      return next;
    });
  }

  // Several sets at once (e.g. catching up after a while): one combined banner
  if (visible.length > 2) {
    return (
      <Container size="md" mt="md">
        <Alert
          data-click-id="NewSetBanner/combined"
          color="grape"
          variant="light"
          icon={<IconSparkles size={18} />}
          withCloseButton
          onClose={() => visible.forEach((set) => dismiss(set.set_code))}
        >
          {t.newSetsBanner(visible.length, visible.map((set) => set.set_name).join(', '))}
        </Alert>
      </Container>
    );
  }

  return (
    <Container size="md" mt="md">
      {visible.map((set) => (
        <Alert
          key={set.set_code}
          data-click-id={`NewSetBanner/${set.set_code}`}
          color="grape"
          variant="light"
          icon={<IconSparkles size={18} />}
          withCloseButton
          onClose={() => dismiss(set.set_code)}
          mb="xs"
        >
          {t.newSetBanner(set.set_name, set.total_card_count ?? 0)}
        </Alert>
      ))}
    </Container>
  );
}
