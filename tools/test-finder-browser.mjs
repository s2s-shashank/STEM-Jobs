/**
 * End-to-end test for the Career Finder popup.
 *
 * Builds nothing: it starts a preview server, opens a real browser and
 * walks the whole flow - open, answer every question, read the results.
 *
 * Run it with:
 *   npm install --no-save playwright && npx playwright install chromium
 *   npm run test:browser
 */
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

// Start the preview server and wait for it to answer.
const server = spawn('npx', ['astro', 'preview'], {
  stdio: ['ignore', 'pipe', 'pipe'],
});

let log = '';
server.stdout.on('data', (d) => (log += d.toString()));
server.stderr.on('data', (d) => (log += d.toString()));

const origin = await new Promise((resolve, reject) => {
  const timer = setTimeout(
    () => reject(new Error(`preview server did not start:\n${log}`)),
    30000,
  );
  const check = setInterval(() => {
    const m = log.match(/http:\/\/localhost:\d+/);
    if (m) {
      clearInterval(check);
      clearTimeout(timer);
      resolve(m[0]);
    }
  }, 200);
});

const BASE = process.env.BASE_URL || `${origin}/stem-jobs/`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});

let failures = 0;
const fail = (msg) => {
  console.log(`  FAIL: ${msg}`);
  failures++;
};
const check = (cond, msg) => {
  if (cond) console.log(`  ok: ${msg}`);
  else fail(msg);
};

await page.goto(BASE, { waitUntil: 'networkidle' });

// The popup should open by itself.
await page.waitForSelector('#finder:not([hidden])', { timeout: 5000 });
check(true, 'popup opens automatically on the home page');

const intro = await page.textContent('[data-slide="intro"].is-active');
check(
  /What kind of STEM job/.test(intro ?? ''),
  'intro slide shows the welcome question',
);

// Start the quiz.
await page.click('[data-slide="intro"].is-active [data-start]');

// Walk every question, picking the first option each time.
const questionCount = await page.evaluate(
  () => document.querySelectorAll('.finder__dot').length,
);
check(questionCount >= 7, `quiz has ${questionCount} questions`);

for (let i = 0; i < questionCount; i++) {
  const active = await page.$('.finder__slide[data-slide="questions"].is-active');
  if (!active) break;

  const isMulti = await page.evaluate(
    () =>
      !!document.querySelector(
        '.finder__slide[data-slide="questions"].is-active .finder__hint',
      ),
  );

  const options = await page.$$(
    '.finder__slide[data-slide="questions"].is-active .finder__option',
  );
  check(options.length >= 4, `question ${i + 1} has ${options.length} options`);

  // Next is blocked until something is chosen.
  const blockedBefore = await page.evaluate(
    () => document.getElementById('finder-next')?.disabled,
  );
  check(blockedBefore === true, `question ${i + 1}: Next is disabled before picking`);

  await options[0].click();

  if (isMulti) {
    await options[1].click();
  }

  // The quiz must not move on by itself.
  const stillHere = await page.evaluate(
    () =>
      document
        .querySelector('[data-slide="questions"]')
        ?.classList.contains('is-active'),
  );
  check(stillHere, `question ${i + 1}: choosing an answer does not skip ahead`);

  // Clicking the chosen option again clears it.
  await options[0].click();
  const cleared = await page.evaluate(
    () =>
      !document
        .querySelector('.finder__slide[data-slide="questions"].is-active .finder__option')
        ?.classList.contains('is-picked'),
  );
  check(cleared, `question ${i + 1}: clicking the answer again deselects it`);

  // Pick it again, then move on with the Next button.
  await options[0].click();
  if (isMulti) await options[1].click();

  const nextEnabled = await page.evaluate(
    () => !document.getElementById('finder-next')?.disabled,
  );
  check(nextEnabled, `question ${i + 1}: Next is enabled once answered`);

  await page.click('#finder-next');
  await page.waitForTimeout(200);
}

// We should land on the results.
await page.waitForSelector('.finder__slide--results.is-active', { timeout: 8000 });
check(true, 'results slide appears after the last question');

await page.waitForSelector('.finder__cards .match', { timeout: 8000 });

const cardCount = await page.$$eval('.finder__cards .match', (n) => n.length);
check(cardCount >= 5, `results show ${cardCount} job cards`);

// Every card must have a salary, a growth figure and a link.
const cards = await page.$$eval('.finder__cards .match', (nodes) =>
  nodes.map((n) => ({
    title: n.querySelector('.match__title')?.textContent?.trim(),
    pay: n.querySelector('.match__pay')?.textContent?.trim(),
    growth: n.querySelector('.match__growth')?.textContent?.trim(),
    jobs: n.querySelector('.match__jobs')?.textContent?.trim(),
    why: n.querySelector('.match__why')?.textContent?.trim(),
    href: n.querySelector('.match__title a')?.getAttribute('href'),
  })),
);

for (const c of cards) {
  if (!/\$\d/.test(c.pay ?? '')) fail(`${c.title}: no salary (got "${c.pay}")`);
  if (!/[+-]\d/.test(c.growth ?? '')) fail(`${c.title}: no growth (got "${c.growth}")`);
  if (!/\d/.test(c.jobs ?? '')) fail(`${c.title}: no employment number`);
  if (!c.why) fail(`${c.title}: no "why it matched" line`);
  if (!c.href?.includes('/careers/')) fail(`${c.title}: no career link`);
}
console.log(`  ok: all ${cards.length} cards have pay, growth, jobs and a link`);

// The link must work with the site's base path.
const href = cards[0].href ?? '';
check(href.startsWith('/stem-jobs/careers/'), `career link keeps the base path (${href})`);

const resp = await page.request.get(new URL(href, BASE).href);
check(resp.ok(), `career page behind the link loads (${resp.status()})`);

// Nothing may be written to the device.
const stored = await page.evaluate(() => ({
  local: localStorage.length,
  session: sessionStorage.length,
}));
check(
  stored.local === 0 && stored.session === 0,
  `nothing is stored on the device (local ${stored.local}, session ${stored.session})`,
);

// Close the popup: the home page keeps the results it was just given.
await page.click('.finder__actions [data-close]');
await page.waitForFunction(() =>
  document.getElementById('finder')?.hasAttribute('hidden'),
);
check(true, 'popup closes');

await page.waitForSelector('#my-matches:not([hidden])', { timeout: 8000 });
check(true, '"Your matches" section appears on the home page');

const shownCount = await page.$$eval('#my-matches-list .match', (n) => n.length);
check(shownCount >= 5, `"Your matches" shows ${shownCount} cards`);

// A refresh must start a completely fresh run.
await page.reload({ waitUntil: 'networkidle' });
await page.waitForSelector('#finder:not([hidden])', { timeout: 8000 });
check(true, 'the popup opens again after a refresh');

const freshIntro = await page.evaluate(() =>
  document
    .querySelector('[data-slide="intro"]')
    ?.classList.contains('is-active'),
);
check(freshIntro, 'a refresh starts the quiz from the beginning again');

const nothingSaved = await page.evaluate(() => ({
  local: localStorage.length,
  session: sessionStorage.length,
}));
check(
  nothingSaved.local === 0 && nothingSaved.session === 0,
  'still nothing stored after a refresh',
);

const noMatches = await page.evaluate(
  () => document.getElementById('my-matches')?.hasAttribute('hidden'),
);
check(!!noMatches, '"Your matches" is empty again after a refresh');

// The nav button re-opens the finder.
await page.keyboard.press('Escape');
await page.waitForTimeout(200);
await page.click('.nav__finder');
await page.waitForSelector('#finder:not([hidden])', { timeout: 5000 });
check(true, 'the nav button re-opens the finder');

// The popup opens on other pages of the site too.
// The site uses trailingSlash: 'never', so no trailing slash here.
await page.goto(`${BASE}careers`, { waitUntil: 'networkidle' });
await page.waitForSelector('#finder:not([hidden])', { timeout: 8000 });
check(true, 'the popup opens on the careers page too');

// Escape closes the popup.
await page.keyboard.press('Escape');
await page.waitForTimeout(200);
const closed = await page.evaluate(
  () => document.getElementById('finder')?.hasAttribute('hidden'),
);
check(!!closed, 'Escape closes the popup');

// Mobile layout.
const mobile = await browser.newPage({ viewport: { width: 390, height: 780 } });
await mobile.goto(BASE, { waitUntil: 'networkidle' });
await mobile.waitForSelector('#finder:not([hidden])', { timeout: 5000 });
const overflow = await mobile.evaluate(() => {
  const panel = document.querySelector('.finder__panel');
  if (!panel) return 9999;
  return panel.getBoundingClientRect().width - window.innerWidth;
});
check(overflow <= 0, `popup fits a phone screen (overflow ${overflow.toFixed(0)}px)`);

if (errors.length) {
  console.log('\nBrowser errors:');
  for (const e of errors) console.log(`  ${e}`);
  failures += errors.length;
}

await browser.close();
server.kill();

console.log(
  failures === 0 ? '\nAll browser checks passed.' : `\n${failures} check(s) failed.`,
);
process.exit(failures === 0 ? 0 : 1);
