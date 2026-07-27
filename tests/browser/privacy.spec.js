import { expect, test } from '@playwright/test';

const GOOGLE_REQUEST = /(?:googletagmanager\.com|google-analytics\.com|googleapis\.com|gstatic\.com)/i;
const PAGES = [
  '/',
  '/forge.html',
  '/npc-generator.html',
  '/magic-item-generator.html',
  '/tavern-generator.html',
  '/weapon-generator.html',
];

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
});

test('every production page makes no Google request before consent', async ({ page }) => {
  const requests = [];
  page.on('request', (request) => {
    if (GOOGLE_REQUEST.test(request.url())) requests.push(request.url());
  });

  for (const path of PAGES) {
    await page.goto(path);
    await expect(page.getByRole('button', { name: 'Allow analytics' })).toBeVisible();
  }
  expect(requests).toEqual([]);
});

test('decline keeps the generator usable and sends no Google request', async ({ page }) => {
  const requests = [];
  page.on('request', (request) => {
    if (GOOGLE_REQUEST.test(request.url())) requests.push(request.url());
  });

  await page.goto('/npc-generator.html');
  await page.getByRole('button', { name: 'Decline analytics' }).click();
  await page.getByRole('button', { name: 'Generate', exact: true }).click();
  await expect(page.locator('#output-name')).not.toHaveText('Your NPC Appears Here');
  expect(requests).toEqual([]);
});

test('allowed events carry only the allowlisted categorical payload and never content', async ({ page }) => {
  const payloads = [];
  await page.route('https://www.googletagmanager.com/gtag/js**', (route) => route.fulfill({
    contentType: 'application/javascript',
    body: `window.gtag = (...args) => {
      if (args[0] === 'event') {
        const [name, params] = args.slice(1);
        fetch('https://www.google-analytics.com/g/collect?event=' + encodeURIComponent(name) + '&payload=' + encodeURIComponent(JSON.stringify(params)));
      }
    };`,
  }));
  await page.route('https://www.google-analytics.com/**', async (route) => {
    const url = new URL(route.request().url());
    payloads.push({ event: url.searchParams.get('event'), payload: JSON.parse(url.searchParams.get('payload')) });
    await route.fulfill({ status: 204, body: '' });
  });

  await page.goto('/npc-generator.html');
  await Promise.all([
    page.waitForRequest('https://www.googletagmanager.com/gtag/js**'),
    page.getByRole('button', { name: 'Allow analytics' }).click(),
  ]);
  await page.getByLabel('Context for {place}').fill('TOP-SECRET-CONTEXT-DO-NOT-SEND');
  await page.getByRole('button', { name: 'Generate', exact: true }).click();
  await page.getByRole('button', { name: 'Save NPC' }).click();

  await expect.poll(() => payloads.length).toBe(2);
  expect(payloads).toEqual([
    { event: 'generation_complete', payload: { generator_type: 'npc' } },
    { event: 'save_complete', payload: { generator_type: 'npc' } },
  ]);
  expect(JSON.stringify(payloads)).not.toContain('TOP-SECRET-CONTEXT-DO-NOT-SEND');
});

test('revoking consent stops events and allowing again restores only future events', async ({ page }) => {
  const payloads = [];
  await page.route('https://www.googletagmanager.com/gtag/js**', (route) => route.fulfill({
    contentType: 'application/javascript',
    body: `let consent = 'denied'; window.gtag = (...args) => {
      if (args[0] === 'consent' && args[1] === 'update') consent = args[2].analytics_storage;
      if (args[0] === 'event' && consent === 'granted') fetch('https://www.google-analytics.com/g/collect?event=' + args[1]);
    };`,
  }));
  await page.route('https://www.google-analytics.com/**', async (route) => {
    payloads.push(route.request().url());
    await route.fulfill({ status: 204, body: '' });
  });

  await page.goto('/weapon-generator.html');
  await Promise.all([
    page.waitForRequest('https://www.googletagmanager.com/gtag/js**'),
    page.getByRole('button', { name: 'Allow analytics' }).click(),
  ]);
  await page.getByRole('button', { name: 'Generate', exact: true }).click();
  await expect.poll(() => payloads.length).toBe(1);
  await page.evaluate(() => { document.cookie = '_ga=temporary; path=/'; });
  await page.getByRole('button', { name: 'Privacy settings' }).click();
  await page.getByRole('button', { name: 'Decline analytics' }).click();
  await expect.poll(() => page.evaluate(() => document.cookie)).not.toContain('_ga=');
  await page.getByRole('button', { name: 'Generate', exact: true }).click();
  await page.waitForTimeout(100);
  expect(payloads).toHaveLength(1);
  await page.getByRole('button', { name: 'Privacy settings' }).click();
  await page.getByRole('button', { name: 'Allow analytics' }).click();
  await page.getByRole('button', { name: 'Generate', exact: true }).click();
  await expect.poll(() => payloads.length).toBe(2);
});

test('Forge search, import, and export never transmit collection content', async ({ page }) => {
  const payloads = [];
  await page.addInitScript(() => {
    localStorage.setItem('instantforge.analyticsConsent', JSON.stringify({
      choice: 'allow', policyVersion: '2026-07-privacy-1',
    }));
    localStorage.setItem('savedNpcs', JSON.stringify([{
      id: 'private-npc', name: 'SENSITIVE-SAVED-NPC', subtitle: 'Private', appearance: 'Private',
      details: 'Private', voiceMannerism: 'Private', hook: 'Private', goalOffer: 'Private', secret: 'Private',
    }]));
  });
  await page.route('https://www.googletagmanager.com/gtag/js**', (route) => route.fulfill({
    contentType: 'application/javascript',
    body: `window.gtag = (...args) => {
      if (args[0] === 'event') {
        const [name, params] = args.slice(1);
        fetch('https://www.google-analytics.com/g/collect?event=' + encodeURIComponent(name) + '&payload=' + encodeURIComponent(JSON.stringify(params)));
      }
    };`,
  }));
  await page.route('https://www.google-analytics.com/**', async (route) => {
    const url = new URL(route.request().url());
    payloads.push({ event: url.searchParams.get('event'), payload: JSON.parse(url.searchParams.get('payload')) });
    await route.fulfill({ status: 204, body: '' });
  });

  await page.goto('/forge.html');
  await expect.poll(() => payloads.length).toBe(1);
  await page.getByLabel('Search your Forge').fill('SENSITIVE-SEARCH-TERM');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export Your Forge' }).click();
  await download;
  page.once('dialog', (dialog) => dialog.accept());
  await page.locator('#import-forge-file').setInputFiles({
    name: 'SENSITIVE-IMPORT-NAME.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({
      format: 'instantforge-forge', version: 1, exportedAt: '2026-07-23T00:00:00.000Z',
      collections: { savedNpcs: [], savedMagicItems: [], savedTaverns: [], savedWeapons: [] },
    })),
  });
  await expect.poll(() => payloads.length).toBe(3);
  expect(payloads).toEqual([
    { event: 'forge_open', payload: { source_page: 'direct' } },
    { event: 'export_complete', payload: { format: 'forge_json' } },
    { event: 'import_complete', payload: { result: 'success' } },
  ]);
  expect(JSON.stringify(payloads)).not.toContain('SENSITIVE-');
});
