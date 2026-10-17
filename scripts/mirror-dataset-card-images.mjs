// Backfill missing card pictures from the dataset release into Supabase Storage.
// Usage: node scripts/mirror-dataset-card-images.mjs [--limit N] [--dry-run] [--force] [--allow-remote]
// Uses SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY, or npx supabase status -o env.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { createDatasetImageSource, storeDatasetImage, retry } from '../supabase/functions/_shared/dataset-images.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const bucketName = 'card-images';
const pageSize = 1000;

async function main() {
  const options = { force: false, dryRun: false, allowRemote: false, limit: Infinity };
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--force': options.force = true; break;
      case '--dry-run': options.dryRun = true; break;
      case '--allow-remote': options.allowRemote = true; break;
      case '--limit': {
        const value = args[++i];
        if (!value || !/^\d+$/.test(value) || !Number.isSafeInteger(Number(value))) {
          throw new Error('--limit must be a non-negative safe integer');
        }
        options.limit = Number(value);
        break;
      }
      default: throw new Error('Unknown option: ' + args[i]);
    }
  }

  let url = process.env.SUPABASE_URL;
  let key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    let stdout;
    try {
      ({ stdout } = await promisify(execFile)(
        process.platform === 'win32' ? 'cmd.exe' : 'npx',
        process.platform === 'win32' ? ['/d', '/s', '/c', 'npx supabase status -o env'] : ['supabase', 'status', '-o', 'env'],
        { cwd: root, encoding: 'utf8' },
      ));
    } catch {
      throw new Error('Could not read local Supabase status. Start local Supabase or set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
    }
    const env = {};
    for (const line of stdout.split(/\r?\n/)) {
      const match = line.match(/^([A-Z_]+)=(.*)$/);
      if (match) env[match[1]] = match[2].replace(/^(["'])(.*)\1$/, '$2');
    }
    url ||= env.API_URL;
    key ||= env.SERVICE_ROLE_KEY;
  }
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (CLI fields: API_URL and SERVICE_ROLE_KEY).');
  const endpoint = new URL(url);
  if (!options.allowRemote && !['127.0.0.1', 'localhost'].includes(endpoint.hostname)) {
    throw new Error('Development only: refusing a non-local Supabase URL. Pass --allow-remote to opt in.');
  }
  if (!['http:', 'https:'].includes(endpoint.protocol)) throw new Error('Supabase URL must use HTTP or HTTPS.');
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: buckets, error: bucketError } = await client.storage.listBuckets();
  if (bucketError) throw new Error('Could not list buckets: ' + bucketError.message);
  const bucket = buckets.find((item) => item.id === bucketName);
  const settings = { public: true, fileSizeLimit: 2 * 1024 * 1024, allowedMimeTypes: ['image/webp'] };
  if (!options.dryRun && (!bucket || !bucket.public)) {
    const { error } = bucket
      ? await client.storage.updateBucket(bucketName, settings)
      : await client.storage.createBucket(bucketName, settings);
    if (error) throw new Error('Could not configure bucket: ' + error.message);
  }

  const datasetResponse = await retry(async () => {
    const response = await fetch('https://raw.githubusercontent.com/flibustier/pokemon-tcg-pocket-database/main/dist/cards.json', { signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error('Dataset HTTP ' + response.status);
    return response.json();
  });
  const dataset = new Map(datasetResponse.filter((card) => card.image && !/^(P-|PROMO)/i.test(card.set)).map((card) => [card.set + '-' + String(card.number).padStart(3, '0'), card]));
  const cards = [];
  for (let offset = 0; cards.length < options.limit; offset += pageSize) {
    const { data, error } = await client.from('card').select('card_id,card_local_id,card_image').or('card_image.is.null,card_image.eq.').order('card_id').range(offset, offset + pageSize - 1);
    if (error) throw error;
    cards.push(...data.filter((card) => dataset.has(card.card_local_id)).slice(0, options.limit - cards.length));
    if (data.length < pageSize) break;
  }
  console.log('Eligible cards: ' + cards.length);
  if (options.dryRun) { console.log('Dry run: would ensure ' + cards.length * 2 + ' objects; no writes.'); return; }
  const download = createDatasetImageSource();
  const counts = { updated: 0, uploaded: 0, already: 0, failed: 0 };
  let cursor = 0;
  async function worker() {
    while (cursor < cards.length) {
      const row = cards[cursor++];
      try {
        const result = await storeDatasetImage(client, dataset.get(row.card_local_id), download, options.force);
        counts.uploaded += result.uploaded; counts.already += result.already;
        const reference = result.reference;
        const { data, error } = await retry(async () => {
          const result = await client.from('card').update({ card_image: reference }).eq('card_id', row.card_id).or('card_image.is.null,card_image.eq.').select('card_id');
          if (result.error) throw result.error;
          return result;
        });
        if (error) throw error;
        counts.updated += data.length;
      } catch (error) { counts.failed++; console.error(row.card_local_id + ': ' + error.message); }
      if ((counts.updated + counts.failed) % 100 === 0) console.log(JSON.stringify(counts));
    }
  }
  await Promise.all(Array.from({ length: Math.min(8, cards.length) }, worker));
  console.log('Final: ' + JSON.stringify(counts));
  if (counts.failed) process.exitCode = 1;
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
