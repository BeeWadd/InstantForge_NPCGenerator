import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('https://www.googletagmanager.com/**', (route) => route.abort());
  await page.route('https://fonts.googleapis.com/**', (route) => route.abort());
  await page.route('https://fonts.gstatic.com/**', (route) => route.abort());
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
});

test('landing page exposes all generators and portable Forge controls', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Available Generators' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Go to NPC Generator' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Go to Magic Item Generator' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Go to Tavern & Inn Generator' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Go to Weapon Generator' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Export Your Forge' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Import Your Forge' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'View Your Forge' })).toBeVisible();
});

test('Your Forge presents, filters, searches, and removes saved creations safely', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('savedNpcs', JSON.stringify([{
      id: 'npc-1', name: '<img src=x onerror=alert(1)>', subtitle: 'Human Cartographer',
      appearance: 'Ink-stained hands.', details: 'Quiet and observant.',
      voiceMannerism: 'Counts under her breath.', hook: 'Needs an escort.',
      goalOffer: 'Offers a hidden map.', secret: 'The map is incomplete.',
    }]));
    localStorage.setItem('savedMagicItems', JSON.stringify([{
      id: 'magic-1', name: 'Lantern of Returning', subtitle: 'Rare Wondrous Item',
      description: 'A blue lantern.', powers: 'Reveals familiar roads.',
      history: 'Carried by a lost courier.', curse: 'It remembers every wrong turn.',
    }]));
    localStorage.setItem('savedTaverns', JSON.stringify([{
      id: 'tavern-1', name: 'The Copper Griffin', subtitle: 'Comfortable Coaching Inn',
      description: 'A warm roadside inn.', innkeeper: 'Mira Bell', signatureDrink: 'Ember Cider',
      patrons: 'A courier and two miners.', rumor: 'The old bridge sings at midnight.',
    }]));
    localStorage.setItem('savedWeapons', JSON.stringify([{
      id: 'weapon-1', name: 'Ashwake', subtitle: 'Masterwork Warhammer',
      description: 'A dark iron hammer.', properties: 'Warm near undead.',
      history: 'Forged beneath a monastery.', feature: 'Its head bears a sunburst.',
    }]));
  });

  await page.goto('/forge.html');
  await expect(page.locator('#forge-count-all')).toHaveText('4');
  await expect(page.locator('.forge-entry')).toHaveCount(4);
  await expect(page.locator('.forge-entry img')).toHaveCount(0);
  await expect(page.locator('.forge-entry h3').first()).toHaveText('<img src=x onerror=alert(1)>');

  await page.locator('[data-forge-filter="weapon"]').click();
  await expect(page.locator('.forge-entry')).toHaveCount(1);
  await expect(page.locator('.forge-entry h3')).toHaveText('Ashwake');

  await page.locator('[data-forge-filter="all"]').click();
  await page.getByLabel('Search your Forge').fill('midnight');
  await expect(page.locator('.forge-entry')).toHaveCount(1);
  await expect(page.locator('.forge-entry h3')).toHaveText('The Copper Griffin');

  await page.getByLabel('Search your Forge').fill('');
  page.once('dialog', (dialog) => dialog.accept());
  await page.locator('.forge-entry').filter({ hasText: 'Ashwake' }).getByRole('button', { name: 'Remove Ashwake' }).click();
  await expect(page.locator('#forge-count-all')).toHaveText('3');
  await expect(page.locator('.forge-entry').filter({ hasText: 'Ashwake' })).toHaveCount(0);
});

test('Your Forge imports a complete backup and exports the restored collection', async ({ page }) => {
  const payload = {
    format: 'instantforge-forge',
    version: 1,
    exportedAt: '2026-07-18T00:00:00.000Z',
    collections: {
      savedNpcs: [],
      savedMagicItems: [],
      savedTaverns: [],
      savedWeapons: [{
        id: 'weapon-imported', name: 'The Wayfinder', subtitle: 'Magical Spear',
        description: 'A silver-shod ash spear.', properties: 'Points toward a named destination.',
        history: 'Carried by the first royal courier.', feature: 'Its grip shows a changing road map.',
      }],
    },
  };

  await page.goto('/forge.html');
  page.once('dialog', (dialog) => dialog.accept());
  await page.locator('#import-forge-file').setInputFiles({
    name: 'instantforge-forge.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(payload)),
  });
  await expect(page.locator('#forge-count-all')).toHaveText('1');
  await expect(page.locator('.forge-entry h3')).toHaveText('The Wayfinder');

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export Your Forge' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^instantforge-forge-\d{4}-\d{2}-\d{2}\.json$/);
});

test('Wondrous Items generate as the selected category', async ({ page }) => {
  await page.goto('/magic-item-generator.html');
  await page.getByLabel('Item Type').selectOption('Wondrous Item');
  await page.getByLabel('Power Level').selectOption('Common');
  await page.getByRole('button', { name: 'Generate', exact: true }).click();
  await expect(page.locator('#output-name')).not.toHaveText('Your Item Appears Here');
  await expect(page.locator('#output-subtitle')).toContainText('Common');
  await expect(page.locator('#output-subtitle')).not.toContainText('undefined');
});

test('hammer descriptions use hammer construction rather than blades', async ({ page }) => {
  await page.goto('/weapon-generator.html');
  await page.getByLabel('Weapon Type').selectOption('Hammer');
  await page.getByLabel('Subtype').selectOption('Warhammer');
  await page.getByRole('button', { name: 'Generate', exact: true }).click();
  await expect(page.locator('#output-description')).toContainText('head');
  await expect(page.locator('#output-description')).not.toContainText('blade');
});

test('saved editable content renders as text and survives reload', async ({ page }) => {
  await page.goto('/npc-generator.html');
  await page.getByRole('button', { name: 'Lock Name' }).click();
  await page.getByRole('textbox', { name: 'Name', exact: true }).fill('<img src=x onerror="alert(1)">');
  await page.getByRole('button', { name: 'Generate', exact: true }).click();
  await page.getByRole('button', { name: 'Save NPC' }).click();

  const savedHeading = page.locator('#history-list .history-item h3');
  await expect(savedHeading).toHaveText('<img src=x onerror="alert(1)">');
  await expect(page.locator('#history-list img')).toHaveCount(0);

  await page.reload();
  await expect(page.locator('#history-list .history-item h3')).toHaveText('<img src=x onerror="alert(1)">');
});

test('export dialog closes with Escape and returns focus', async ({ page }) => {
  await page.goto('/npc-generator.html');
  await page.getByRole('button', { name: 'Generate', exact: true }).click();
  await page.getByRole('button', { name: 'Save NPC' }).click();
  const exportButton = page.getByRole('button', { name: 'Export History' });
  await exportButton.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Close' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Export as JSON' })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('button', { name: 'Close' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(exportButton).toBeFocused();
});

test('reveal controls work from the keyboard and expose state', async ({ page }) => {
  await page.goto('/magic-item-generator.html');
  await page.getByRole('button', { name: 'Generate', exact: true }).click();
  const reveal = page.locator('#curse-container');
  await reveal.focus();
  await page.keyboard.press('Enter');
  await expect(reveal).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#curse-text')).not.toHaveClass(/hidden/);
});

test('saved history downloads JSON, CSV, and Markdown exports', async ({ page }) => {
  await page.goto('/npc-generator.html');
  await page.getByRole('button', { name: 'Generate', exact: true }).click();
  await page.getByRole('button', { name: 'Save NPC' }).click();

  for (const format of ['JSON', 'CSV', 'Markdown']) {
    await page.getByRole('button', { name: 'Export History' }).click();
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: `Export as ${format}` }).click();
    const download = await downloadPromise;
    expect(await download.suggestedFilename()).toMatch(/instantforge/i);
  }
});

test('tavern characters enter a visible queue before NPC generation', async ({ page }) => {
  await page.goto('/tavern-generator.html');
  await page.getByRole('button', { name: 'Generate', exact: true }).click();
  await page.getByRole('button', { name: 'Generate Patron NPCs' }).click();
  await expect(page.locator('#npc-queue-count')).toContainText('queued');
  await page.getByRole('link', { name: 'Open NPC queue' }).click();
  await expect(page.locator('#queued-npcs-panel')).toBeVisible();
  await expect(page.locator('#queued-npcs-list li')).toHaveCount(3);
  await page.getByRole('button', { name: 'Generate and save queued NPCs' }).click();
  await expect(page.locator('#queued-npcs-panel')).toBeHidden();
  await expect(page.locator('#history-list .history-item')).toHaveCount(3);
});

test('generator layout has no horizontal overflow at a phone viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/npc-generator.html');
  const dimensions = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
  }));
  expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport);

  await page.goto('/forge.html');
  const forgeDimensions = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
  }));
  expect(forgeDimensions.document).toBeLessThanOrEqual(forgeDimensions.viewport);
});
