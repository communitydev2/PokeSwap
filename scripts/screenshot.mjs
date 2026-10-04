// Capture a screenshot of a page (or one element on it) for the Updates page.
// Usage: node scripts/screenshot.mjs <route> <output.png> [css-selector]
// Needs the dev server running; set BASE_URL if it is not on http://localhost:3000.
import { chromium } from 'playwright';

const [route = '/', out, selector] = process.argv.slice(2);
if (!out) {
  console.error('Usage: node scripts/screenshot.mjs <route> <output.png> [css-selector]');
  process.exit(1);
}

const baseUrl = process.env.BASE_URL ?? 'http://localhost:3000';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
await page.goto(new URL(route, baseUrl).href, { waitUntil: 'networkidle' });

if (selector) {
  await page.locator(selector).first().screenshot({ path: out });
} else {
  await page.screenshot({ path: out });
}

await browser.close();
console.log(`Saved ${out}`);
