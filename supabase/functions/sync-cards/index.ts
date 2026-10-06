// Supabase Edge Function: sync Pokémon TCG Pocket sets and cards.
//
// Card data comes from the flibustier/pokemon-tcg-pocket-database dataset
// (MIT, kept up to date with every release). Pictures come from TCGdex, which
// lags behind: cards TCGdex doesn't have yet are saved without a picture and
// the app shows "Picture coming soon" until a later run finds one.
//
// For cards TCGdex also has, TCGdex's name and picture are used, so existing
// cards don't get renamed between the two sources' spellings.
// Adds sets / cards, never deletes; running it twice changes nothing.
// Promo sets are skipped. Every run is logged in public.card_sync_runs.
//
// Called monthly by pg_cron (see supabase/card-sync.sql), or by hand:
//   curl -X POST https://<project-ref>.supabase.co/functions/v1/sync-cards \
//        -H "x-sync-secret: <SYNC_SECRET>"
//   Add ?dryRun=1 to see what would change without writing anything.
//
// Secrets: SYNC_SECRET (any long random string; also stored in Vault for cron)
// Deploy:  npx supabase functions deploy sync-cards --no-verify-jwt

import { createClient } from 'npm:@supabase/supabase-js@2';

const DATASET = 'https://raw.githubusercontent.com/flibustier/pokemon-tcg-pocket-database/main/dist';
const TCGDEX = 'https://api.tcgdex.net/v2/en';
const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

// flibustier rarity codes -> the rarity names used in our rarity table
// (checked against the 2,380 cards both sources share)
const RARITY_NAMES: Record<string, string> = {
  C: 'One Diamond', U: 'Two Diamond', R: 'Three Diamond', RR: 'Four Diamond',
  AR: 'One Star', SR: 'Two Star', SAR: 'Two Star', IM: 'Three Star',
  UR: 'Crown', S: 'One Shiny', SSR: 'Two Shiny',
};

type DatasetSet = { code: string; releaseDate?: string; count?: number; name: Record<string, string> | string };
type DatasetCard = { set: string; number: number; rarity: string; name: string };
type TcgdexSet = { id: string; name: string; cardCount: { total: number; official: number }; releaseDate?: string; cards: { id: string; name: string; image?: string }[] };
type SetRow = { set_id: string; set_code: string; set_name: string; total_card_count: number | null; official_card_count: number | null; release_date: string | null };
type CardRow = { card_id: string; card_local_id: string; card_name: string; card_image: string | null; rarity_id: string | null; set_id: string };

async function getJson<T>(url: string): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(url);
    if (res.ok) return res.json();
    if (attempt >= 3) throw new Error(`${url}: ${res.status}`);
    await new Promise((r) => setTimeout(r, 1000 * attempt));
  }
}

const isPromo = (code: string) => /^(P-|PROMO)/i.test(code);
// The dataset uses typographic apostrophes; ours are plain
const tidy = (text: string) => text.replace(/[’‘]/g, "'").trim();
const cardId = (card: DatasetCard) => `${card.set}-${String(card.number).padStart(3, '0')}`;

async function sync(dryRun: boolean) {
  const summary = { setsAdded: [] as string[], cardsAdded: 0, cardsUpdated: 0, changes: [] as string[] };

  // 1. Sources
  const [datasetSetsByLetter, datasetCards] = await Promise.all([
    getJson<Record<string, DatasetSet[]>>(`${DATASET}/sets.json`),
    getJson<DatasetCard[]>(`${DATASET}/cards.json`),
  ]);
  const datasetSets = Object.values(datasetSetsByLetter).flat().filter((s) => !isPromo(s.code));

  // TCGdex: set details and pictures for the sets it has
  const tcgdexSeries = await getJson<{ sets: { id: string }[] }>(`${TCGDEX}/series/tcgp`);
  const tcgdexSets = new Map<string, TcgdexSet>();
  for (const { id } of tcgdexSeries.sets.filter((s) => !isPromo(s.id))) {
    tcgdexSets.set(id, await getJson<TcgdexSet>(`${TCGDEX}/sets/${encodeURIComponent(id)}`));
  }
  const tcgdexCards = new Map([...tcgdexSets.values()].flatMap((s) => s.cards.map((c) => [c.id, c] as const)));

  // 2. What we have
  const [{ data: setRows, error: setsError }, { data: rarityRows, error: raritiesError }] = await Promise.all([
    admin.from('set').select('*'),
    admin.from('rarity').select('rarity_id, name'),
  ]);
  if (setsError) throw setsError;
  if (raritiesError) throw raritiesError;
  const sets = new Map((setRows as SetRow[]).map((s) => [s.set_code, s]));
  const rarityIds = new Map((rarityRows ?? []).map((r) => [r.name as string, r.rarity_id as string]));

  async function rarityIdFor(code: string) {
    const name = RARITY_NAMES[code] ?? code;
    if (!rarityIds.has(name)) {
      const id = crypto.randomUUID();
      rarityIds.set(name, id);
      summary.changes.push(`new rarity: ${name}`);
      if (!dryRun) {
        const { error } = await admin.from('rarity').insert({ rarity_id: id, name });
        if (error) throw error;
      }
    }
    return rarityIds.get(name)!;
  }

  // 3. Sets and their cards
  for (const dataset of datasetSets) {
    const tcgdex = tcgdexSets.get(dataset.code);
    const datasetName = typeof dataset.name === 'string' ? dataset.name : dataset.name.en;
    const setFields = {
      set_name: tcgdex?.name ?? tidy(datasetName),
      total_card_count: tcgdex?.cardCount.total ?? dataset.count ?? null,
      // The dataset has no "official" count: use TCGdex's, else fall back to the total
      official_card_count: tcgdex?.cardCount.official ?? dataset.count ?? null,
      release_date: tcgdex?.releaseDate ?? dataset.releaseDate ?? null,
    };

    let local = sets.get(dataset.code);
    if (!local) {
      local = { set_id: crypto.randomUUID(), set_code: dataset.code, ...setFields };
      summary.setsAdded.push(`${dataset.code} ${setFields.set_name}`);
      if (!dryRun) {
        const { error } = await admin.from('set').insert({ ...local, added_at: new Date().toISOString() });
        if (error) throw error;
      }
    } else if (
      local.set_name !== setFields.set_name || local.total_card_count !== setFields.total_card_count ||
      local.official_card_count !== setFields.official_card_count || local.release_date !== setFields.release_date
    ) {
      summary.changes.push(`set ${dataset.code}: details updated`);
      if (!dryRun) {
        const { error } = await admin.from('set').update(setFields).eq('set_id', local.set_id);
        if (error) throw error;
      }
    }

    const { data: cardRows, error: cardsError } = await admin
      .from('card')
      .select('card_id, card_local_id, card_name, card_image, rarity_id, set_id')
      .eq('set_id', local.set_id);
    if (cardsError) throw cardsError;
    const existing = new Map((cardRows as CardRow[]).map((c) => [c.card_local_id, c]));

    const toInsert: CardRow[] = [];
    for (const card of datasetCards.filter((c) => c.set === dataset.code)) {
      const id = cardId(card);
      const fromTcgdex = tcgdexCards.get(id);
      const current = existing.get(id);

      if (!current) {
        toInsert.push({
          card_id: crypto.randomUUID(),
          card_local_id: id,
          card_name: fromTcgdex?.name ?? tidy(card.name),
          card_image: fromTcgdex?.image ?? null,
          rarity_id: await rarityIdFor(card.rarity),
          set_id: local.set_id,
        });
        continue;
      }

      // Existing cards: only fill in what's missing (a picture TCGdex now has,
      // or a rarity that was never set). Never replace something with nothing.
      const update: Partial<CardRow> = {};
      if (fromTcgdex?.image && fromTcgdex.image !== current.card_image) update.card_image = fromTcgdex.image;
      if (!current.rarity_id) update.rarity_id = await rarityIdFor(card.rarity);
      if (Object.keys(update).length) {
        summary.cardsUpdated++;
        summary.changes.push(`card ${id}: ${Object.keys(update).join(', ')}`);
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
