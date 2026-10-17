// Runs only against a disposable PostgreSQL container: no ports, volumes or live data.
import { execFileSync, spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const container = `oaktrade-search-test-${process.pid}`;
const docker = (args, input) => execFileSync('docker', args, { input, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
const sql = (input) => docker(['exec', '-i', container, 'psql', '-U', 'postgres', '-v', 'ON_ERROR_STOP=1'], input);
try {
  docker(['run', '--rm', '-d', '--name', container, '--network', 'none', '-e', 'POSTGRES_HOST_AUTH_METHOD=trust', 'postgres:17']);
  for (let attempt = 0; ; attempt++) {
    try { docker(['exec', container, 'pg_isready', '-U', 'postgres']); break; }
    catch (error) {
      if (attempt >= 30) throw error;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  sql(await readFile(new URL('./fixtures/multilingual-search.sql', import.meta.url), 'utf8'));
  for (const migration of ['20261018000600_multilingual_card_search.sql', '20261018000700_pokemon_search_names_data.sql']) {
    sql(await readFile(new URL(`../supabase/migrations/${migration}`, import.meta.url), 'utf8'));
  }
  // The data migration is repeatable for subsequent source refreshes.
  sql(await readFile(new URL('../supabase/migrations/20261018000700_pokemon_search_names_data.sql', import.meta.url), 'utf8'));
  console.log(sql(await readFile(new URL('./fixtures/multilingual-search-assertions.sql', import.meta.url), 'utf8')));
  if (process.argv.includes('--browser')) {
    const { chromium } = await import('playwright');
    const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--port', '3006', '--strictPort'], { stdio: 'pipe' });
    let browser;
    try {
      await new Promise((resolve, reject) => {
        server.stdout.on('data', (data) => { if (data.toString().includes('Local:')) resolve(); });
        server.on('error', reject);
        server.on('exit', (code) => reject(new Error(`Vite exited: ${code}`)));
      });
      browser = await chromium.launch();
      const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
      const quote = (text) => `'${String(text).replaceAll("'", "''")}'`;
      const json = (query) => JSON.parse(docker(['exec', '-i', container, 'psql', '-U', 'postgres', '-At', '-v', 'ON_ERROR_STOP=1'],
        `SET ROLE anon; SELECT coalesce(json_agg(result), '[]'::json) FROM (${query}) result;`).replace(/^SET\s*/, ''));
      // Serve requests from the synthetic PostgreSQL catalogue, never a live DB.
      await page.route(/\/(?:rest|auth|functions)\/v1\//, async (route) => {
        const url = new URL(route.request().url());
        if (url.pathname.endsWith('/rpc/search_cards_filter')) {
          const params = route.request().postDataJSON();
          await route.fulfill({ json: json(`SELECT * FROM public.search_cards_filter(${quote(params.p_search_string)}, ${quote(params.p_rarity)}, ${quote(params.p_set)})`) });
        } else {
          const table = url.pathname.split('/').pop();
          await route.fulfill({ json: ['card', 'rarity', 'set'].includes(table)
            ? json(`SELECT * FROM public."${table}"`) : [] });
        }
      });
      await page.goto('http://127.0.0.1:3006', { waitUntil: 'networkidle' });
      const field = (id) => page.locator(`[data-click-id="${id}"]`);
      await field('CardMarket/name').fill('フシギダネ');
      await page.getByText('Bulbasaur', { exact: true }).first().waitFor();
      await field('CardMarket/set').click();
      await page.getByRole('option', { name: 'Genetic Apex', exact: true }).click();
      await page.getByText('1 card', { exact: true }).waitFor();
      assert.equal(await page.getByText('Bulbasaur', { exact: true }).count(), 1);
      await field('HomeMarket/tab:exclusive').click();
      await field('HomeMarket/tab:cards').click();
      assert.equal(await field('CardMarket/name').inputValue(), 'フシギダネ');
      await page.getByRole('heading', { name: 'Card market', exact: true }).locator('..').screenshot({ path: 'public/updates/multilingual-pokemon-search.png' });
      await field('CardMarket/name').fill('フシギバナ ex');
      await page.getByText('Venusaur ex', { exact: true }).waitFor();
      console.log('PASS: browser search through real isolated SQL, expansion filter, tab persistence and ex modifier. Screenshot saved.');
    } finally {
      await browser?.close();
      server.kill();
    }
  }
  sql(`INSERT INTO public.card (card_local_id, card_name, rarity_id, set_id)
    SELECT c.card_local_id || '-' || n, c.card_name, c.rarity_id, c.set_id
    FROM public.card c CROSS JOIN generate_series(1, 500) n; ANALYZE public.card;`);
  for (const term of ['フシギダネ', 'a', 'Bulbasaur']) {
    const started = performance.now();
    sql(`SET ROLE anon; SET statement_timeout = '5s'; SELECT count(*) FROM public.search_cards_filter('${term}');`);
    console.log(`5,010-card smoke check (${term}): ${Math.round(performance.now() - started)} ms including Docker/psql overhead.`);
  }
} catch (error) {
  if (error.stderr) console.error(error.stderr.toString());
  throw error;
} finally {
  docker(['rm', '-f', container]);
}
