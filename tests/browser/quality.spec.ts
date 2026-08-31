import { expect, test, type Page } from '@playwright/test';
import { sampleDigest } from '../../src/lib/lens/sample-transfer';

const lessonRoutes = [
  '/learn/objects/identity-and-state',
  '/learn/objects/lifecycle-and-versions',
  '/learn/objects/ownership-and-access',
  '/learn/transactions/read-the-ptb',
  '/learn/transactions/follow-command-results',
  '/learn/transactions/effects-and-cost',
  '/learn/move/borrows-and-values',
  '/learn/move/read-a-move-call',
  '/learn/move/reconstruct-from-evidence',
];

const routes = ['/', '/lens', '/method', ...lessonRoutes];
const viewports = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'tablet', width: 1024, height: 768 },
  { name: 'desktop', width: 1440, height: 900 },
];

async function expectHealthyLayout(page: Page, route: string) {
  const metrics = await page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    pageWidth: document.documentElement.scrollWidth,
    brokenImages: [...document.images]
      .filter((image) => image.complete && image.naturalWidth === 0)
      .map((image) => image.getAttribute('src')),
  }));

  expect(metrics.pageWidth, `${route} should not overflow horizontally`).toBeLessThanOrEqual(metrics.viewportWidth + 1);
  expect(metrics.brokenImages, `${route} should not contain broken images`).toEqual([]);
  await expect(page.locator('main')).toBeVisible();
}

for (const viewport of viewports) {
  test(`all learning routes fit at ${viewport.name} width`, async ({ page }) => {
    await page.setViewportSize(viewport);
    for (const route of routes) {
      await test.step(route, async () => {
        await page.goto(route);
        await expectHealthyLayout(page, route);
      });
    }
  });
}

test('the header and browser metadata share the Sui Lens mark', async ({ page }) => {
  await page.goto('/');

  const brand = page.getByRole('link', { name: 'Sui Lens home' });
  await expect(brand.locator('img')).toHaveAttribute('src', '/favicon.svg');
  await expect(brand.locator('img')).toHaveAttribute('width', '42');
  await expect(page.locator('link[rel="icon"][type="image/svg+xml"]')).toHaveAttribute('href', '/favicon.svg');
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute('href', '/apple-touch-icon.png');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', '/social-card.png');
  await expect(page.locator('meta[property="og:image:width"]')).toHaveAttribute('content', '1200');
  await expect(page.locator('meta[property="og:image:height"]')).toHaveAttribute('content', '630');
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image');
  await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute('content', '/social-card.png');

  const assetResponses = await page.evaluate(async () => {
    const paths = ['/favicon.svg', '/favicon.ico', '/apple-touch-icon.png', '/social-card.png'];
    return Promise.all(paths.map(async (path) => ({ path, status: (await fetch(path)).status })));
  });
  expect(assetResponses).toEqual([
    { path: '/favicon.svg', status: 200 },
    { path: '/favicon.ico', status: 200 },
    { path: '/apple-touch-icon.png', status: 200 },
    { path: '/social-card.png', status: 200 },
  ]);
});

test('the coin lesson explains, animates, aligns, and resets cleanly', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/learn/transactions/effects-and-cost');

  await page.locator('[data-choice="consolidated"]').click();
  await expect(page.locator('[data-feedback]')).toContainText('Correct.');
  await expect(page.locator('[data-choice="consolidated"]')).toContainText('Correct answer');

  await page.locator('[data-coin-smash]').click();
  await expect(page.locator('.coin-demo')).toHaveAttribute('data-coin-beat', '1');
  await expect(page.locator('[data-coin-observation]')).toContainText('Gas smashing only consolidates value');

  await page.locator('[data-coin-split]').click();
  await expect(page.locator('.coin-demo')).toHaveAttribute('data-coin-beat', '2');
  await expect(page.locator('.coin-object.travel')).toBeVisible();

  const alignment = await page.evaluate(() => {
    const ledger = [...document.querySelectorAll('.coin-ledger > div')].map((element) => element.getBoundingClientRect());
    const beats = [...document.querySelectorAll('.coin-beat')].map((element) => element.getBoundingClientRect());
    return ledger.map((box, index) => ({
      leftDifference: Math.abs(box.left - beats[index].left),
      widthDifference: Math.abs(box.width - beats[index].width),
    }));
  });
  for (const column of alignment) {
    expect(column.leftDifference).toBeLessThanOrEqual(1);
    expect(column.widthDifference).toBeLessThanOrEqual(1);
  }

  await page.locator('[data-coin-reset]').click();
  await expect(page.locator('.coin-demo')).toHaveAttribute('data-coin-beat', '0');
  await expect(page.locator('.coin-object.travel')).toBeHidden();
  await expect(page.locator('[data-coin-smash]')).toBeEnabled();
  await expect(page.locator('[data-coin-split]')).toBeDisabled();
});

test('each journey workbench makes its teaching observation visible', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });

  await page.goto('/learn/objects/identity-and-state');
  await page.locator('[data-object-action]').click();
  await expect(page.locator('[data-object-version]')).toHaveText('27');
  await expect(page.locator('[data-object-observation]')).toContainText('The ID stayed 0xb4c0');

  await page.goto('/learn/transactions/read-the-ptb');
  await page.locator('[data-ptb-action]').click();
  await page.locator('[data-ptb-action]').click();
  await expect(page.locator('[data-ptb-result-label]')).toHaveText('NestedResult [0, 0]');
  await expect(page.locator('[data-ptb-observation]')).toContainText('The first 0 selects SplitCoins');

  await page.goto('/learn/objects/ownership-and-access');
  await page.locator('[data-checkpoint-mode="write"]').click();
  await page.locator('[data-checkpoint-action]').click();
  await expect(page.locator('[data-checkpoint-effect]')).toHaveText('Object effect: Counter mutated');
  await expect(page.locator('[data-checkpoint-observation]')).toContainText('The object effect proves that it committed');

  await page.goto('/learn/move/borrows-and-values');
  await page.locator('[data-signature-mode="value"]').click();
  await expect(page.locator('[data-signature-permission]')).toHaveText('passed by value');
  await expect(page.locator('[data-signature-result]')).toContainText('Caller cannot keep using');

  await page.goto('/learn/move/reconstruct-from-evidence');
  await page.getByRole('button', { name: /What did it cost/ }).click();
  await expect(page.locator('[data-receipt-observation]')).toContainText('storage rebate');
  await expectHealthyLayout(page, 'journey workbench states');
});

test('mobile teaching bridges wrap inside their cards', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/learn/transactions/effects-and-cost');

  const bridgeMetrics = await page.evaluate(() => ({
    columns: [...document.querySelectorAll('.bridge-columns > div')].map((element) => ({
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
    })),
    code: [...document.querySelectorAll('.bridge-code pre')].map((element) => ({
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
    })),
  }));

  for (const item of [...bridgeMetrics.columns, ...bridgeMetrics.code]) {
    expect(item.scrollWidth).toBeLessThanOrEqual(item.clientWidth + 1);
  }
  await expectHealthyLayout(page, '/learn/transactions/effects-and-cost');
});

test('invalid progress storage cannot break the journey', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('sui-lens:completed-lessons', JSON.stringify({ lesson: 'objects/identity-and-state' }));
  });
  await page.goto('/');

  await expect(page.locator('[data-progress-copy]')).toHaveText('0 of 6 stops complete');
  await expect(page.locator('[data-journey-continue]')).toContainText('Start with object identity');

  await page.goto('/learn/objects/identity-and-state');
  await expect(page.locator('[data-complete]')).toHaveAttribute('aria-pressed', 'false');
});

test('the Lens rejects an invalid digest and returns focus for editing', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/lens');

  const digest = page.getByRole('textbox', { name: 'Mainnet transaction digest' });
  await digest.fill('not-a-sui-digest');
  await page.getByRole('button', { name: 'Inspect' }).click();

  await expect(page.getByRole('alert')).toContainText('That does not look like a Sui transaction digest.');
  await page.getByRole('button', { name: 'Edit the digest' }).click();
  await expect(digest).toBeFocused();
  await expectHealthyLayout(page, '/lens invalid-digest state');
});

test('the Lens example starts inspection without reloading the page', async ({ page }) => {
  await page.route('https://graphql.mainnet.sui.io/graphql', (route) => route.abort());
  await page.goto('/lens');
  await page.evaluate(() => { document.body.dataset.lensDocument = 'stable'; });

  await page.getByRole('link', { name: 'Inspect the example' }).click();

  await expect(page.locator('body')).toHaveAttribute('data-lens-document', 'stable');
  await expect(page.getByRole('textbox', { name: 'Mainnet transaction digest' })).toHaveValue(sampleDigest);
  await expect(page).toHaveURL(`/lens?digest=${sampleDigest}`);
  await expect(page.getByRole('alert')).toContainText('The chain evidence could not be reached.');
});
