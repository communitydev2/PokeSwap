// Mirror TCGdex WebP card pictures into Supabase Storage (local development by default).
// Usage: node scripts/mirror-card-images.mjs [--only low|high] [--limit N] [--dry-run] [--force] [--allow-remote]
// Uses SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY, or npx supabase status -o env.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const root = fileURLToPath(new URL('../', import.meta.url));
const bucketName = 'card-images';
const pageSize = 1000;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  const options = { force: false, dryRun: false, allowRemote: false, only: null, limit: Infinity };
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--force': options.force = true; break;
      case '--dry-run': options.dryRun = true; break;
      case '--allow-remote': options.allowRemote = true; break;
      case '--only':
        options.only = args[++i];
        if (!['low', 'high'].includes(options.only)) throw new Error('--only must be low or high');
        break;
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
  const storage = client.storage.from(bucketName);
  const existing = new Set();
  async function list(prefix = '') {
    for (let offset = 0; ; offset += pageSize) {
      const { data, error } = await storage.list(prefix, { limit: pageSize, offset, sortBy: { column: 'name', order: 'asc' } });
      if (error) throw new Error('Could not list stored images: ' + error.message);
      for (const item of data) {
        const path = prefix ? prefix + '/' + item.name : item.name;
        if (item.id == null) await list(path);
        else existing.add(path);
      }
      if (data.length < pageSize) break;
    }
  }
  if (bucket && !options.force) await list();

  const cards = [];
  for (let offset = 0; cards.length < options.limit; offset += pageSize) {
    const { data, error } = await client.from('card').select('card_id,card_image')
      .like('card_image', 'https://assets.tcgdex.net/%').order('card_image').order('card_id')
      .range(offset, offset + Math.min(pageSize, options.limit - cards.length) - 1);
    if (error) throw new Error('Could not load cards: ' + error.message);
    cards.push(...data);
    if (data.length < Math.min(pageSize, options.limit - (cards.length - data.length))) break;
  }
  const jobs = new Map();
  for (const card of cards) {
    const base = new URL(card.card_image);
    const path = base.pathname.replace(/^\/+|\/+$/g, '');
    for (const quality of options.only ? [options.only] : ['low', 'high']) {
      const objectPath = path + '/' + quality + '.webp';
      jobs.set(objectPath, 'https://assets.tcgdex.net/' + objectPath);
    }
  }
  const counts = { uploaded: 0, already: 0, unavailable: 0, failed: 0, bytes: 0 };
  const pending = [...jobs].filter(([path]) => {
    if (!options.force && existing.has(path)) { counts.already++; return false; }
    return true;
  });
  console.log('Cards: ' + cards.length + '; objects: ' + jobs.size + '; already there: ' + counts.already + '; to download: ' + pending.length);
  function summary() {
    return 'uploaded: ' + counts.uploaded + ' / already there: ' + counts.already + ' / not on TCGdex: ' + counts.unavailable + ' / failed: ' + counts.failed + '; MB uploaded: ' + (counts.bytes / 1000000).toFixed(2);
  }
  if (options.dryRun) { console.log('Dry run: ' + summary()); return; }
  let cursor = 0;
  let completed = counts.already;
  let nextProgress = (Math.floor(completed / 100) + 1) * 100;
  async function worker() {
    while (cursor < pending.length) {
      const [path, source] = pending[cursor++];
      try {
        let bytes;
        let unavailable = false;
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            const response = await fetch(source, { signal: AbortSignal.timeout(30000) });
            if (response.status === 404) { await response.body?.cancel(); unavailable = true; break; }
            if (!response.ok) { await response.body?.cancel(); throw new Error('HTTP ' + response.status); }
            bytes = new Uint8Array(await response.arrayBuffer());
            break;
          } catch (error) {
            if (attempt === 3) throw error;
            await sleep(250 * attempt);
          }
        }
        if (unavailable) counts.unavailable++;
        else {
          const { error } = await storage.upload(path, bytes, { contentType: 'image/webp', cacheControl: '31536000', upsert: options.force });
          if (error) throw new Error(error.message);
          counts.uploaded++;
          counts.bytes += bytes.byteLength;
        }
      } catch (error) {
        counts.failed++;
        console.error('Failed ' + path + ': ' + error.message);
      }
      completed++;
      if (completed >= nextProgress) {
        console.log('Progress ' + completed + '/' + jobs.size + ': ' + summary());
        nextProgress += 100;
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(8, pending.length) }, worker));
  console.log('Final: ' + summary());
  if (counts.failed) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
