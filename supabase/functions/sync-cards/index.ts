// Supabase Edge Function: sync Pokémon TCG Pocket sets and cards from TCGdex.
//
// Adds new expansion sets and their cards, and updates name / rarity / picture
// of cards already in the database. Never deletes anything, so running it
// twice changes nothing. Promo sets (ids starting "P-") are skipped.
// Every run is logged in public.card_sync_runs.
//
// Called monthly by pg_cron (see supabase/card-sync.sql), or by hand:
//   curl -X POST https://<project-ref>.supabase.co/functions/v1/sync-cards \
//        -H "x-sync-secret: <SYNC_SECRET>"
//   Add ?dryRun=1 to see what would change without writing anything.
//
// Secrets: SYNC_SECRET (any long random string; also stored in Vault for cron)
// Deploy:  npx supabase functions deploy sync-cards --no-verify-jwt

import { createClient } from 'npm:@supabase/supabase-js@2';

const API = 'https://api.tcgdex.net/v2/en';
const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

type TcgdexSetBrief = { id: string; name: string; cardCount: { total: number; official: number } };
type TcgdexSet = TcgdexSetBrief & { releaseDate?: string; cards: { id: string; localId: string; name: string; image?: string }[] };
type SetRow = { set_id: string; set_code: string; set_name: string; total_card_count: number | null; official_card_count: number | null; release_date: string | null };
type CardRow = { card_id: string; card_local_id: string; card_name: string; card_image: string | null; rarity_id: string | null; set_id: string };

async function api<T>(path: string): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(`${API}/${path}`);
    if (res.ok) return res.json();
    if (attempt >= 3) throw new Error(`TCGdex ${path}: ${res.status}`);
    await new Promise((r) => setTimeout(r, 1000 * attempt));
  }
}

const isPromo = (set: { id: string; name: string }) => set.id.startsWith('P-') || /promo/i.test(set.name);

// Card id -> rarity name for one set, with one request per rarity instead of one per card
async function raritiesForSet(setId: string, rarityNames: string[], cardIds: string[]) {
  const byCard = new Map<string, string>();
  for (const rarity of rarityNames) {
    const cards = await api<{ id: string }[]>(`cards?set.id=eq:${encodeURIComponent(setId)}&rarity=eq:${encodeURIComponent(rarity)}`);
    for (const card of cards) byCard.set(card.id, rarity);
  }
  // Anything left has a rarity we don't know yet: ask for those cards one by one
  for (const id of cardIds.filter((id) => !byCard.has(id))) {
    const card = await api<{ rarity?: string }>(`cards/${encodeURIComponent(id)}`);
    if (card.rarity && card.rarity !== 'None') byCard.set(id, card.rarity);
  }
  return byCard;
}

async function sync(dryRun: boolean) {
  const summary = { setsAdded: [] as string[], cardsAdded: 0, cardsUpdated: 0, changes: [] as string[] };

  const [{ data: setRows, error: setsError }, { data: rarityRows, error: raritiesError }] = await Promise.all([
    admin.from('set').select('*'),
    admin.from('rarity').select('rarity_id, name'),
  ]);
  if (setsError) throw setsError;
  if (raritiesError) throw raritiesError;
  const sets = new Map((setRows as SetRow[]).map((s) => [s.set_code, s]));
  const rarityIds = new Map((rarityRows ?? []).map((r) => [r.name as string, r.rarity_id as string]));

  const series = await api<{ sets: TcgdexSetBrief[] }>('series/tcgp');

  for (const brief of series.sets.filter((s) => !isPromo(s))) {
    const remote = await api<TcgdexSet>(`sets/${encodeURIComponent(brief.id)}`);

    // Set row: add it, or refresh its name / counts / release date
    let local = sets.get(remote.id);
    const setFields = {
      set_name: remote.name,
      total_card_count: remote.cardCount.total,
      official_card_count: remote.cardCount.official,
      release_date: remote.releaseDate ?? null,
    };
    if (!local) {
      local = { set_id: crypto.randomUUID(), set_code: remote.id, ...setFields };
      summary.setsAdded.push(`${remote.id} ${remote.name}`);
      if (!dryRun) {
        const { error } = await admin.from('set').insert({ ...local, added_at: new Date().toISOString() });
        if (error) throw error;
      }
    } else if (
      local.set_name !== setFields.set_name || local.total_card_count !== setFields.total_card_count ||
      local.official_card_count !== setFields.official_card_count || local.release_date !== setFields.release_date
    ) {
      summary.changes.push(`set ${remote.id}: details updated`);
      if (!dryRun) {
        const { error } = await admin.from('set').update(setFields).eq('set_id', local.set_id);
        if (error) throw error;
      }
    }

    // Cards in this set
    const { data: cardRows, error: cardsError } = await admin
      .from('card')
      .select('card_id, card_local_id, card_name, card_image, rarity_id, set_id')
      .eq('set_id', local.set_id);
    if (cardsError) throw cardsError;
    const existing = new Map((cardRows as CardRow[]).map((c) => [c.card_local_id, c]));

    const rarityOf = await raritiesForSet(remote.id, [...rarityIds.keys()], remote.cards.map((c) => c.id));

    const toInsert: CardRow[] = [];
    for (const card of remote.cards) {
      const rarityName = rarityOf.get(card.id);
      // New rarity names (e.g. a brand-new rarity tier) are added to the rarity table
      if (rarityName && !rarityIds.has(rarityName)) {
        const id = crypto.randomUUID();
        rarityIds.set(rarityName, id);
        summary.changes.push(`new rarity: ${rarityName}`);
        if (!dryRun) {
          const { error } = await admin.from('rarity').insert({ rarity_id: id, name: rarityName });
          if (error) throw error;
        }
      }
      const rarityId = rarityName ? rarityIds.get(rarityName)! : null;
      const current = existing.get(card.id);

      if (!current) {
        toInsert.push({
          card_id: crypto.randomUUID(),
          card_local_id: card.id,
          card_name: card.name,
          card_image: card.image ?? null,
          rarity_id: rarityId,
          set_id: local.set_id,
        });
        continue;
      }

      // Corrections from TCGdex; never replace something with nothing
      const update: Partial<CardRow> = {};
      if (card.name && card.name !== current.card_name) update.card_name = card.name;
      if (card.image && card.image !== current.card_image) update.card_image = card.image;
      if (rarityId && rarityId !== current.rarity_id) update.rarity_id = rarityId;
      if (Object.keys(update).length) {
        summary.cardsUpdated++;
        summary.changes.push(`card ${card.id}: ${Object.keys(update).join(', ')}`);
        if (!dryRun) {
          const { error } = await admin.from('card').update(update).eq('card_id', current.card_id);
          if (error) throw error;
        }
      }
    }

    if (toInsert.length) {
      summary.cardsAdded += toInsert.length;
      if (!dryRun) {
        const { error } = await admin.from('card').upsert(toInsert, { onConflict: 'card_local_id', ignoreDuplicates: true });
        if (error) throw error;
      }
    }
  }
  return summary;
}

Deno.serve(async (req) => {
  const secret = Deno.env.get('SYNC_SECRET');
  if (!secret || req.headers.get('x-sync-secret') !== secret) return new Response('Unauthorized', { status: 401 });

  const dryRun = new URL(req.url).searchParams.has('dryRun');
  const { data: run } = dryRun ? { data: null } : await admin.from('card_sync_runs').insert({}).select('id').single();

  try {
    const summary = await sync(dryRun);
    if (run) {
      await admin.from('card_sync_runs').update({
        finished_at: new Date().toISOString(),
        sets_added: summary.setsAdded,
        cards_added: summary.cardsAdded,
        cards_updated: summary.cardsUpdated,
      }).eq('id', run.id);
    }
    return Response.json({ dryRun, ...summary, changes: summary.changes.slice(0, 200) });
  } catch (error) {
    const message = error instanceof Error ? error.message : JSON.stringify(error);
    console.error('Card sync failed', message);
    if (run) await admin.from('card_sync_runs').update({ finished_at: new Date().toISOString(), error: message }).eq('id', run.id);
    return Response.json({ error: message }, { status: 500 });
  }
});
