import { useRef, useState } from 'react';
import { Alert, Badge, Button, Group, Modal, Paper, Select, Stack, Text } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { supabase } from '../../supabaseClient';
import { useLocalizationStore } from '../../store/useLocalizationStore';
import { tradeErrorText } from '../../utils/tradeErrors';
import type { PokemonCard } from '../../types/PokemonCard';
import { CardPicture } from '../CardPicture';

export type NewTradeMatch = {
  partner_account: string;
  partner_name: string;
  get_card: PokemonCard;
  get_language: string;
  wanted_from_me: { card: PokemonCard; language: string }[];
};
const cardKey = (id: string, language: string) => id + '|' + language;

export function NewMatchesModal({ accountId, matches, onClose, onSeeAll, onOfferSent }: {
  accountId: string;
  matches: NewTradeMatch[];
  onClose: () => void;
  onSeeAll: () => void;
  onOfferSent: () => void;
}) {
  const t = useLocalizationStore((s) => s.t);
  const phone = useMediaQuery('(max-width: 48em)');
  const groups = new Map<string, NewTradeMatch[]>();
  for (const row of matches) groups.set(row.partner_account, [...(groups.get(row.partner_account) ?? []), row]);
  return (
    <Modal opened onClose={onClose} title={t.newMatchesTitle} fullScreen={phone} size="lg" centered
      closeButtonProps={{ 'aria-label': t.close, ...{ 'data-click-id': 'NewMatchesModal/header-close' } }}>
      <Stack>
        {[...groups.entries()].map(([partner, rows]) => (
          <MatchRow key={partner} accountId={accountId} rows={rows} onOfferSent={onOfferSent} />
        ))}
        <Group justify="flex-end">
          <Button data-click-id="NewMatchesModal/see-all" variant="default" onClick={onSeeAll}>{t.newMatchesSeeAll}</Button>
          <Button data-click-id="NewMatchesModal/close" onClick={onClose}>{t.close}</Button>
        </Group>
      </Stack>
    </Modal>
  );
}

function MatchRow({ accountId, rows, onOfferSent }: { accountId: string; rows: NewTradeMatch[]; onOfferSent: () => void }) {
  const t = useLocalizationStore((s) => s.t);
  const [get, setGet] = useState(cardKey(rows[0].get_card.card_id, rows[0].get_language));
  const row = rows.find((r) => cardKey(r.get_card.card_id, r.get_language) === get) ?? rows[0];
  const [give, setGive] = useState<string | null>(null);
  const chosen = row.wanted_from_me.find((w) => cardKey(w.card.card_id, w.language) === give) ?? row.wanted_from_me[0];
  const running = useRef(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const partner = row.partner_account;
  async function send() {
    if (running.current || sent || !chosen) return;
    running.current = true;
    setBusy(true);
    setError(null);
    try {
      const result = await supabase.rpc('create_trade_offer', {
        p_from: accountId, p_to: partner,
        p_give_card: chosen.card.card_id, p_give_language: chosen.language,
        p_get_card: row.get_card.card_id, p_get_language: row.get_language,
      });
      if (result.error) setError(tradeErrorText(t, result.error.message));
      else { setSent(true); onOfferSent(); }
    } catch (cause) {
      console.warn(cause);
      setError(t.tradesLoadFailed);
    } finally { running.current = false; setBusy(false); }
  }
  return (
    <Paper withBorder radius="md" p="sm" data-click-context={partner}>
      <Stack gap="sm">
        <Text fw={700}>{row.partner_name}</Text>
        {rows.length > 1 && <Select data-click-id={`NewMatchesModal/get:${partner}`} label={t.tradesYouGet}
          value={get} onChange={(v) => { if (v) { setGet(v); setGive(null); } }} disabled={busy || sent} allowDeselect={false}
          data={rows.map((r) => ({ value: cardKey(r.get_card.card_id, r.get_language), label: r.get_card.card_name + ' · ' + r.get_card.card_local_id + ' · ' + r.get_language.toUpperCase() }))} />}
        <Group wrap="nowrap" align="flex-start">
          <CardPicture cardImage={row.get_card.card_image} alt={row.get_card.card_name} width={56} radius={4} zoom={false} />
          <Text size="sm" style={{ minWidth: 0, overflowWrap: 'anywhere' }}>{t.newMatchesTheyHave(row.get_card.card_name + ' · ' + row.get_language.toUpperCase())}</Text>
        </Group>
        <Text size="sm">{t.newMatchesTheyWant}</Text>
        <Group gap="xs" align="flex-start">
          {row.wanted_from_me.map((w) => <Group key={cardKey(w.card.card_id, w.language)} gap="xs" wrap="nowrap">
            <CardPicture cardImage={w.card.card_image} alt={w.card.card_name} width={40} radius={3} zoom={false} />
            <Text size="xs">{w.card.card_name} · {w.language.toUpperCase()}</Text>
          </Group>)}
        </Group>
        {row.wanted_from_me.length > 1 && <Select data-click-id={`NewMatchesModal/give:${partner}`} label={t.tradesYouGive}
          value={chosen ? cardKey(chosen.card.card_id, chosen.language) : null} onChange={setGive} allowDeselect={false} disabled={busy || sent}
          data={row.wanted_from_me.map((w) => ({ value: cardKey(w.card.card_id, w.language), label: w.card.card_name + ' · ' + w.card.card_local_id + ' · ' + w.language.toUpperCase() }))} />}
        {error && <Alert color="red">{error}</Alert>}
        {sent ? <Badge color="teal">{t.tradesOfferSent}</Badge> : <Button data-click-id={`NewMatchesModal/send:${partner}`} onClick={send} loading={busy} disabled={!chosen}>{t.tradesSendOffer}</Button>}
      </Stack>
    </Paper>
  );
}
