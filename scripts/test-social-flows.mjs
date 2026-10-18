// Browser-only synthetic fixtures; every Supabase API request is intercepted.
/* global process, console, URL, setTimeout, document, innerWidth */
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--port', '3006', '--strictPort'], { stdio: 'pipe' });
let browser;
let passed = 0;
const pass = (name) => console.log(`PASS ${++passed}: ${name}`);
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function until(predicate) {
  for (let attempt = 0; attempt < 120; attempt++) { if (predicate()) return; await pause(25); }
  assert.ok(predicate(), 'Expected request was not received');
}
const field = (page, id) => page.locator(`[data-click-id="${id}"]`);
const harness = (page, name, ...args) => page.evaluate(async ({ name, args }) => {
  const fixture = await import('/scripts/fixtures/social-flows-harness.tsx');
  return fixture[name](...args);
}, { name, args });
async function fixture(kind, options = {}) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const state = { friendIds: ['friend-a'], friendFail: false, wishlistFail: false, friendDelay: 0, calls: [], errors: [], ...options };
  page.on('pageerror', (error) => state.errors.push(error.message));
  await page.route(/\/(?:rest|auth|functions)\/v1\//, async (route) => {
    const url = new URL(route.request().url());
    const name = url.pathname.split('/').pop();
    const body = route.request().postData() ? route.request().postDataJSON() : {};
    state.calls.push({ name, body, url: url.href, method: route.request().method() });
    const fail = () => route.fulfill({ status: 503, json: { message: 'Simulated failure' } });
    let data = [];
    if (name === 'my_friend_account_ids') {
      data = [...state.friendIds];
      if (state.friendDelay) await pause(state.friendDelay);
      if (state.friendFail) return fail();
    } else if (name === 'list_friends') {
      data = state.friendStatus ? [{ user_id: 'friend-user', username: 'Friend A', status: state.friendStatus, request_id: 1, since: '2026-10-18', pocket_accounts: [] }] : [];
    } else if (name === 'respond_friend_request') {
      state.friendStatus = 'friend'; state.friendIds = ['friend-a'];
    } else if (name === 'remove_friend') {
      state.friendStatus = null; state.friendIds = [];
    } else if (name === 'find_trade_partners') {
      data = ['friend-a', 'stranger-b'].map((id) => ({ partner_account: id, partner_name: id === 'friend-a' ? 'Friend A' : 'Stranger B',
        get_card: { card_id: 'card-0', card_name: 'Fixture 00', card_local_id: 'A1-000', card_image: null, rarity_id: 'r1', set_id: 's1' },
        get_language: 'en', wanted_from_me: [],
      }));
    } else if (name === 'wishlist') {
      if (state.wishlistFail) return fail();
      data = [{ id: 1, card: { card_id: 'card-1' } }, { id: 2, card: { card_id: 'card-31' } }];
    } else if (name === 'market_card_players') {
      data = [{ tcg_account_id: 'friend-a', player_name: 'Friend A', side: 'has', language: 'en', quantity: 1, exclusive_trade_id: null, is_mine: false }];
    } else if (name === 'tradable_rarities') data = ['r1', 'r2'];
    else if (name === 'user_account') data = [{ user_id: 'actor-a', username: body.username, username_changed_at: new Date().toISOString() }];
    else if (name === 'market_exclusive_trades_filtered') data = [];
    await route.fulfill({ json: data });
  });
  await page.goto('http://127.0.0.1:3006/scripts/fixtures/social-flows.html', { waitUntil: 'networkidle' });
  await harness(page, 'actor', 'actor-a');
  await harness(page, 'mount', kind, options.selected ?? []);
  return { page, state, close: async () => { assert.deepEqual(state.errors, []); await page.close(); } };
}
async function probe(page, value) {
  await page.waitForFunction((value) => document.querySelector('[data-testid="friends-a"]')?.textContent === value, value);
}
try {
  await new Promise((resolve, reject) => {
    server.stdout.on('data', (data) => { if (data.toString().includes('Local:')) resolve(); });
    server.on('error', reject); server.on('exit', (code) => reject(new Error(`Vite exited ${code}`)));
  });
  browser = await chromium.launch();
  {
    const { page, state, close } = await fixture('friends');
    await probe(page, 'friend-a');
    assert.equal(state.calls.filter((call) => call.name === 'my_friend_account_ids').length, 1);
    pass('Simultaneous Friends consumers share one request');
    state.friendIds = ['friend-b']; await harness(page, 'mount', 'friends'); await probe(page, 'friend-b');
    pass('Remounting refreshes changed friendships');
    state.friendIds = ['friend-c']; await harness(page, 'refreshFriends'); await probe(page, 'friend-c');
    pass('Friendship invalidation refreshes mounted consumers');
    state.friendFail = true; await harness(page, 'refreshFriends'); await probe(page, 'error');
    state.friendFail = false; await field(page, 'Fixture/retry-friends:a').click(); await probe(page, 'friend-c');
    pass('A failed Friends request is visible and retryable, not cached forever');
    state.friendDelay = 500; state.friendIds = ['old-account']; await harness(page, 'refreshFriends'); await pause(50);
    state.friendDelay = 0; state.friendIds = ['new-account']; await harness(page, 'actor', 'actor-b');
    await probe(page, 'new-account'); await pause(600); await probe(page, 'new-account');
    await harness(page, 'actor', null); await probe(page, 'empty');
    pass('Account switches and sign-out ignore stale friend responses'); await close();
  }
  {
    const { page, close } = await fixture('friendspage', { friendIds: [], friendStatus: 'incoming' });
    await probe(page, 'empty');
    await field(page, 'Friends/accept:friend-user').click(); await probe(page, 'friend-a');
    await field(page, 'Friends/remove:friend-user').click(); await field(page, 'Friends/remove-confirm').click();
    await probe(page, 'empty');
    pass('Accepting and removing a friend refreshes mounted filters through the real Friends page'); await close();
  }
  {
    const { page, state, close } = await fixture('trades', { friendFail: true });
    await page.getByText('Stranger B', { exact: true }).waitFor();
    await page.getByText('Friends only', { exact: true }).click();
    await field(page, 'Trades/retry-friends').waitFor();
    state.friendFail = false; await field(page, 'Trades/retry-friends').click();
    await page.getByText('Friend A', { exact: true }).waitFor();
    assert.equal(await page.getByText('Stranger B', { exact: true }).count(), 0);
    pass('Find trades Friends-only filtering excludes strangers and recovers after a failed request'); await close();
  }
  {
    const { page, state, close } = await fixture('players', { friendFail: true });
    await field(page, 'CardPlayers/retry-friends').waitFor();
    state.friendFail = false; await field(page, 'CardPlayers/retry-friends').click();
    await page.getByText('Friend A', { exact: true }).waitFor();
    pass('Friends-only card players show an error and recover on retry'); await close();
  }
  {
    const { page, state, close } = await fixture('picker');
    await field(page, 'WantedCardsPicker/card:card-0').waitFor();
    assert.equal(await page.locator('[data-click-id^="WantedCardsPicker/card:"]').count(), 24);
    await field(page, 'WantedCardsPicker/card:card-1').click();
    await field(page, 'WantedCardsPicker/next').click();
    await field(page, 'WantedCardsPicker/card:card-31').click();
    assert.equal(await page.getByTestId('selected-value').textContent(), 'card-1,card-31');
    pass('Picture picker retains selections across its 24-card pages');
    await field(page, 'WantedCardsPicker/search').fill('Fixture 01');
    await page.waitForFunction(() => document.querySelectorAll('[data-click-id^="WantedCardsPicker/card:"]').length === 1);
    assert.equal(await field(page, 'WantedCardsPicker/card:card-1').getAttribute('aria-pressed'), 'true');
    await field(page, 'WantedCardsPicker/search').fill('');
    await field(page, 'WantedCardsPicker/set').fill('Other');
    await page.getByRole('option', { name: 'Other Set', exact: true }).click();
    await field(page, 'WantedCardsPicker/card:card-31').waitFor();
    pass('Name and searchable Set filters preserve selected cards');
    await page.getByText('Only cards on my wishlist', { exact: true }).click();
    await page.waitForFunction(() => document.querySelectorAll('[data-click-id^="WantedCardsPicker/card:"]').length === 1);
    state.wishlistFail = true; await field(page, 'Fixture/language').click();
    await field(page, 'WantedCardsPicker/retry-wishlist').waitFor();
    assert.equal(await field(page, 'WantedCardsPicker/wishlist').isDisabled(), false);
    await page.getByText('Only cards on my wishlist', { exact: true }).click();
    assert.ok(await page.locator('[data-click-id^="WantedCardsPicker/card:"]').count() > 0);
    pass('Wishlist failures cannot trap the picker in an empty filtered view');
    const box = await page.locator('[data-wanted-picker]').boundingBox();
    await page.screenshot({ path: 'public/updates/social-flow-recovery.png', clip: { x: box.x, y: box.y, width: box.width, height: Math.min(box.height, 520) } });
    state.wishlistFail = false; await field(page, 'WantedCardsPicker/retry-wishlist').click();
    await page.waitForFunction(() => !document.querySelector('[data-click-id="WantedCardsPicker/wishlist"]')?.disabled);
    await page.getByText('Only cards on my wishlist', { exact: true }).click();
    await field(page, 'WantedCardsPicker/card:card-31').waitFor();
    await field(page, 'WantedCardsPicker/remove:card-1').click();
    assert.equal(await page.getByTestId('selected-value').textContent(), 'card-31');
    await field(page, 'WantedCardsPicker/clear').click();
    assert.equal(await page.getByTestId('selected-value').textContent(), '');
    pass('Wishlist retry, selected thumbnails and clear controls work'); await close();
  }
  {
    const { page, close } = await fixture('picker', { selected: Array.from({ length: 50 }, (_, index) => `card-${index}`) });
    await field(page, 'WantedCardsPicker/next').click(); await field(page, 'WantedCardsPicker/next').click();
    assert.equal(await field(page, 'WantedCardsPicker/card:card-50').isDisabled(), true);
    await field(page, 'WantedCardsPicker/remove:card-1').click();
    assert.equal(await field(page, 'WantedCardsPicker/card:card-50').isDisabled(), false);
    pass('The 50-card selection limit releases capacity when a card is removed');
    await page.setViewportSize({ width: 390, height: 844 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    pass('Picture picker and selected thumbnail strip fit a mobile screen'); await close();
  }
  {
    const { page, state, close } = await fixture('exclusive');
    await field(page, 'ExclusiveTrades/new').click();
    await field(page, 'ExclusiveTrades/card-select').click();
    await page.getByRole('option').first().click();
    assert.equal(await field(page, 'WantedCardsPicker/card:card-0').count(), 0);
    assert.equal(await field(page, 'WantedCardsPicker/card:card-54').count(), 0);
    await field(page, 'WantedCardsPicker/card:card-1').click();
    await field(page, 'ExclusiveTrades/save').click();
    await until(() => state.calls.some((call) => call.name === 'save_exclusive_trade'));
    assert.deepEqual(state.calls.find((call) => call.name === 'save_exclusive_trade')?.body.p_want_cards, ['card-1']);
    pass('Exclusive listing saves only selected same-rarity alternatives and excludes the offered card'); await close();
  }
  {
    const { page, state, close } = await fixture('market');
    await field(page, 'ExclusiveTradeMarket/set').fill('Other');
    await page.getByRole('option', { name: 'Other Set', exact: true }).click();
    await field(page, 'ExclusiveTradeMarket/rarity').fill('Two Diamond');
    await page.getByRole('option', { name: 'Two Diamond', exact: true }).click();
    await page.getByText('Only trades I can answer', { exact: true }).click();
    await page.getByText('Only cards on my wishlist', { exact: true }).click();
    await until(() => state.calls.some((call) => call.name === 'market_exclusive_trades_filtered' && call.body.p_set_id === 's2' && call.body.p_rarity_id === 'r2' && call.body.p_only_answerable && call.body.p_only_wishlist));
    pass('Exclusive market sends Set/Rarity and both personal filters together');
    const from = state.calls.length;
    await harness(page, 'actor', null);
    await until(() => state.calls.slice(from).some((call) => call.name === 'market_exclusive_trades_filtered' && !call.body.p_only_answerable && !call.body.p_only_wishlist));
    assert.equal(await field(page, 'ExclusiveTradeMarket/only-answerable').count(), 0);
    pass('Signing out hides and disables personal exclusive-market filters'); await close();
  }
  {
    const { page, state, close } = await fixture('username');
    await page.clock.install({ time: new Date('2026-10-18T12:00:00Z') });
    const boundary = new Date(Date.parse('2026-10-18T12:00:00Z') - 30 * 86400000 + 2000).toISOString();
    await harness(page, 'actor', 'actor-a', 'Player', boundary);
    await page.waitForFunction(() => !document.querySelector('[data-click-id="ChangeUsername/username-input"]'));
    await page.clock.fastForward(3000);
    await field(page, 'ChangeUsername/username-input').waitFor();
    pass('The username form unlocks at the cooldown boundary without a reload');
    await field(page, 'ChangeUsername/username-input').fill('NewPlayer');
    await field(page, 'ChangeUsername/save').click();
    await until(() => state.calls.some((call) => call.name === 'user_account'));
    assert.equal(state.calls.find((call) => call.name === 'user_account')?.body.username, 'NewPlayer');
    pass('An unlocked username saves through the profile API'); await close();
  }
  console.log(`All ${passed} isolated social-flow checks passed.`);
} finally { await browser?.close(); server.kill(); }
