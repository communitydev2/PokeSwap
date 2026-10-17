// Local browser regression suite. All Supabase API traffic is intercepted;
// synthetic fixtures exercise response limits and failures without live data.
/* global process, setTimeout, console, URL, document, window, AbortController, innerWidth */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--port', '3006', '--strictPort'], { stdio: 'pipe' });
let browser;
let passed = 0;
const cards = Array.from({ length: 1257 }, (_, index) => ({
  card_id: String(index + 1).padStart(6, '0'),
  card_local_id: `A1-${String(index + 1).padStart(4, '0')}`,
  card_name: index === 1256 ? 'Tailmon' : 'Bulbasaur', card_image: null,
  rarity_id: 'r1', rarity_name: 'One Diamond', set_id: 's1', set_name: 'Genetic Apex',
}));
const counts = cards.map((card) => ({ card_id: card.card_id, has_count: 1, wants_count: 1 }));
const field = (page, id) => page.locator(`[data-click-id="${id}"]`);
const text = (page, value) => page.getByText(value, { exact: true }).waitFor();
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const pass = (name) => { console.log(`PASS ${++passed}: ${name}`); };

async function fixturePage(options = {}) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const state = { cards, catalogueFailFrom: null, searchFailFrom: null, countsFail: false, rarityFail: false, calls: [], errors: [], ...options };
  page.on('pageerror', (error) => state.errors.push(error.message));
  await page.route(/\/(?:rest|auth|functions)\/v1\//, async (route) => {
    const url = new URL(route.request().url());
    const name = url.pathname.split('/').pop();
    const params = route.request().method() === 'POST' ? route.request().postDataJSON() : {};
    const offset = Number(url.searchParams.get('offset') ?? 0);
    const limit = Number(url.searchParams.get('limit') ?? 1000);
    state.calls.push({ name, params, offset, limit, order: url.searchParams.get('order') });
    const fail = () => route.fulfill({ status: 503, json: { message: 'Simulated failure' } });
    let data = [];
    if (name === 'test_paged') {
      if (params.delay_from === offset) await pause(150);
      if (params.fail_from === offset) return fail();
      data = Array.from({ length: params.size }, (_, index) => ({ card_id: String(index), card_name: 'Same name' }));
    } else if (name === 'card') {
      if (state.catalogueFailFrom === offset) return fail();
      data = state.cards;
    } else if (name === 'rarity') {
      if (state.rarityFail) return fail();
      data = [{ rarity_id: 'r1', name: 'One Diamond' }, { rarity_id: 'r2', name: 'Crown' }];
    } else if (name === 'set') {
      data = [{ set_id: 's1', set_code: 'A1', set_name: 'Genetic Apex' }];
    } else if (name === 'market_card_counts' || name === 'market_card_counts_friends') {
      if (state.countsFail) return fail();
      data = counts;
    } else if (name === 'search_cards_filter') {
      if (state.searchFailFrom === offset) return fail();
      if (params.p_search_string === 'slow') { await pause(800); data = cards; }
      else data = cards.filter((card) => !params.p_search_string || card.card_name.toLowerCase().startsWith(params.p_search_string.toLowerCase()));
      if (params.p_rarity === 'Crown') data = [];
    } else if (name === 'market_exclusive_trades') {
      data = Array.from({ length: 25 }, (_, index) => ({
        exclusive_trade_id: index + 1, owner_account: 'a1', owner_name: null,
        card: cards[0], language: 'en', want_language: 'en', want_cards: cards.slice(0, 6),
        created_at: '2026-10-17', is_mine: false, total_count: 25,
      })).slice(params.p_offset ?? 0, (params.p_offset ?? 0) + (params.p_limit ?? 20));
    }
    await route.fulfill({ json: data.slice(offset, offset + limit) });
  });
  await page.goto('http://127.0.0.1:3006', { waitUntil: 'networkidle' });
  return { page, state, close: async () => { assert.deepEqual(state.errors, [], 'Unexpected browser errors'); await page.close(); } };
}

async function mountManageSearch(page) {
  await page.evaluate(async () => {
    const { mount } = await import('/scripts/fixtures/market-search-harness.tsx');
    window.unmountTestSearch = mount();
  });
  await field(page, 'SearchBar/submit').waitFor();
}

try {
  await new Promise((resolve, reject) => {
    server.stdout.on('data', (data) => { if (data.toString().includes('Local:')) resolve(); });
    server.on('error', reject);
    server.on('exit', (code) => reject(new Error(`Vite exited: ${code}`)));
  });
  browser = await chromium.launch();

  {
    const { page, state, close } = await fixturePage();
    const result = await page.evaluate(async () => {
      const { fetchAllRpcRows } = await import('/src/utils/fetchAllRpcRows.ts');
      const checks = [];
      for (const size of [0, 999, 1000, 1001, 2000, 2501]) {
        const rows = await fetchAllRpcRows('test_paged', { size }, ['card_name', 'card_id']);
        checks.push({ size, length: rows.length, unique: new Set(rows.map((row) => row.card_id)).size });
      }
      let failed = false;
      try { await fetchAllRpcRows('test_paged', { size: 1257, fail_from: 1000 }, ['card_id']); } catch { failed = true; }
      const controller = new AbortController();
      const pending = fetchAllRpcRows('test_paged', { size: 2501, delay_from: 0 }, ['card_id'], controller.signal);
      setTimeout(() => controller.abort(), 20);
      let cancelled = false;
      try { await pending; } catch { cancelled = true; }
      return { checks, failed, cancelled };
    });
    for (const check of result.checks) {
      assert.equal(check.length, check.size); assert.equal(check.unique, check.size);
      pass(`RPC pagination boundary ${check.size}: complete, unique rows`);
    }
    assert.ok(result.failed); pass('RPC later-page failure rejects the incomplete result');
    assert.ok(result.cancelled); pass('RPC request cancellation');
    assert.ok(state.calls.filter((call) => call.name === 'test_paged').every((call) => call.order?.includes('card_id.asc')));
    pass('RPC pages request a stable unique ordering');
    await close();
  }

  {
    const { page, state, close } = await fixturePage();
    await text(page, '1257 cards');
    assert.equal(state.calls.filter((call) => call.name === 'market_exclusive_trades').length, 0);
    pass('Catalogue loads all pages; Exclusive Trades stays lazy until first visit');
    await field(page, 'CardMarket/rarity').fill('Diamond');
    await page.getByRole('option', { name: 'One Diamond', exact: true }).click();
    await text(page, '1257 cards');
    await page.waitForFunction(() => !document.querySelector('[data-click-id="CardMarket/next-page"]')?.disabled);
    assert.ok(state.calls.some((call) => call.name === 'search_cards_filter' && call.offset === 1000));
    await text(page, '1 / 126');
    pass('Market filters publish all 1,257 matches and expose all 126 display pages');
    await field(page, 'CardMarket/next-page').click(); await text(page, '2 / 126');
    await field(page, 'HomeMarket/tab:exclusive').click();
    await field(page, 'ExclusiveTradeMarket/search').fill('Pikachu');
    await page.waitForFunction(() => document.querySelector('[data-click-id="ExclusiveTradeMarket/next-page"]')?.disabled === false);
    await field(page, 'ExclusiveTradeMarket/next-page').click(); await text(page, '2 / 2');
    await field(page, 'ExclusiveTradeMarket/toggle-wanted:21').click();
    await field(page, 'HomeMarket/tab:cards').click(); await text(page, '2 / 126');
    await field(page, 'HomeMarket/tab:exclusive').click();
    assert.equal(await field(page, 'ExclusiveTradeMarket/search').inputValue(), 'Pikachu');
    await text(page, '2 / 2');
    assert.equal(await field(page, 'ExclusiveTradeMarket/toggle-wanted:21').getAttribute('aria-expanded'), 'true');
    pass('Both tabs retain filters/search, page and expanded exclusive listings');
    await field(page, 'HomeMarket/tab:cards').click();
    await field(page, 'CardMarket/name').fill('Tailmon');
    await text(page, '1 card'); await text(page, '1 have it');
    await field(page, 'CardMarket/filter:has').click(); await text(page, '1 card');
    await field(page, 'CardMarket/filter:wants').click(); await text(page, '1 card');
    pass('Availability badges and has/wants filters include counts beyond row 1,000');
    await field(page, 'CardMarket/name').fill('slow'); await pause(350);
    await field(page, 'CardMarket/name').fill('Tailmon'); await text(page, '1 card');
    await pause(850); await text(page, '1 card');
    pass('A superseded slow search cannot overwrite newer results');
    await close();
  }

  for (const failure of ['catalogue', 'second catalogue page', 'rarities']) {
    const options = failure === 'rarities' ? { rarityFail: true } : { catalogueFailFrom: failure === 'catalogue' ? 0 : 1000 };
    const { page, state, close } = await fixturePage(options);
    await page.getByRole('alert').filter({ hasText: "Couldn't load the card catalogue. Please try again." }).waitFor();
    assert.equal(await page.getByText('Loading cards…', { exact: true }).count(), 0);
    if (failure === 'catalogue') {
      const box = await page.getByRole('heading', { name: 'Card market', exact: true }).locator('..').boundingBox();
      await page.screenshot({ path: 'public/updates/complete-search-and-market-recovery.png', clip: { x: box.x, y: box.y, width: box.width, height: Math.min(box.height, 500) } });
    }
    state.catalogueFailFrom = null; state.rarityFail = false;
    await field(page, 'CardMarket/retry').click(); await text(page, '1257 cards');
    pass(`Failed ${failure} load shows an error, stops spinning and recovers on retry`);
    await close();
  }

  {
    const { page, close } = await fixturePage({ cards: [] });
    await text(page, 'No cards match these filters.');
    assert.equal(await page.getByText('Loading cards…', { exact: true }).count(), 0);
    pass('A successful empty catalogue renders an empty state'); await close();
  }

  {
    const { page, state, close } = await fixturePage({ searchFailFrom: 1000 });
    await field(page, 'CardMarket/name').fill('Bulbasaur');
    await field(page, 'CardMarket/retry').waitFor();
    assert.equal(await page.getByText('1000 cards', { exact: true }).count(), 0);
    state.searchFailFrom = null;
    await field(page, 'CardMarket/retry').click(); await text(page, '1256 cards');
    pass('A failed search page never publishes partial results and retries successfully');
    await close();
  }

  {
    const { page, state, close } = await fixturePage({ countsFail: true });
    await field(page, 'CardMarket/retry').waitFor(); state.countsFail = false;
    await field(page, 'CardMarket/retry').click(); await text(page, '1257 cards');
    await field(page, 'CardMarket/name').fill('Tailmon'); await text(page, '1 card'); await text(page, '1 have it');
    pass('Failed market counts can be retried and recover availability badges'); await close();
  }

  {
    const { page, state, close } = await fixturePage();
    await mountManageSearch(page);
    await field(page, 'SearchBar/submit').click();
    await page.waitForFunction(async () => (await import('/scripts/fixtures/market-search-harness.tsx')).searchState().length === 1257);
    pass('Manage cards search also collects every matching RPC page');
    state.searchFailFrom = 1000;
    await field(page, 'SearchBar/search-input').fill('Bulbasaur'); await field(page, 'SearchBar/submit').click();
    await page.getByText('Could not search cards. Please try again.', { exact: true }).waitFor();
    assert.equal(await page.evaluate(async () => (await import('/scripts/fixtures/market-search-harness.tsx')).searchState().length), 1257);
    pass('Manage cards preserves its previous complete result when a later page fails');
    state.searchFailFrom = null;
    await field(page, 'SearchBar/search-input').fill('slow'); await field(page, 'SearchBar/submit').click();
    await field(page, 'SearchBar/clear').click(); await pause(850);
    assert.equal(await page.evaluate(async () => (await import('/scripts/fixtures/market-search-harness.tsx')).searchState().active), false);
    pass('Clearing Manage cards cancels pending searches');
    await field(page, 'SearchBar/search-input').fill('slow'); await field(page, 'SearchBar/submit').click();
    await page.evaluate(() => window.unmountTestSearch()); await pause(850);
    assert.equal(await page.evaluate(async () => (await import('/scripts/fixtures/market-search-harness.tsx')).searchState().active), false);
    pass('Unmounted Manage cards searches cannot change the global results'); await close();
  }

  {
    const { page, state, close } = await fixturePage({ catalogueFailFrom: 0 });
    await page.setViewportSize({ width: 390, height: 844 });
    await field(page, 'CardMarket/retry').waitFor();
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    state.catalogueFailFrom = null;
    await field(page, 'CardMarket/retry').click(); await text(page, '1257 cards');
    await field(page, 'HomeMarket/tab:exclusive').click(); await field(page, 'ExclusiveTradeMarket/search').fill('Pikachu');
    await field(page, 'HomeMarket/tab:cards').click(); await field(page, 'HomeMarket/tab:exclusive').click();
    assert.equal(await field(page, 'ExclusiveTradeMarket/search').inputValue(), 'Pikachu');
    pass('Mobile retry fits the screen and exclusive search survives switching tabs'); await close();
  }

  {
    const { page, state, close } = await fixturePage();
    await field(page, 'Header/log-in').click(); await page.waitForURL('**/login');
    await page.getByRole('heading', { name: 'Sign in or create an account' }).waitFor();
    assert.equal(await field(page, 'CardMarket/name').count(), 0);
    const requests = state.calls.filter((call) => call.name === 'card').length;
    await field(page, 'Header/home').click(); await text(page, '1257 cards');
    assert.equal(state.calls.filter((call) => call.name === 'card').length, requests);
    pass('Login stays separate and returning home reuses the loaded catalogue'); await close();
  }
  console.log(`All ${passed} market recovery regression checks passed.`);
} finally {
  await browser?.close();
  server.kill();
}
