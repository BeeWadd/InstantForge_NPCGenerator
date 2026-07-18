import assert from 'node:assert/strict';
import test from 'node:test';

import { createId, escapeCsvCell, escapeHtml } from '../assets/js/instantforge-utils.js';

test('escapeHtml neutralizes markup in saved user content', () => {
  assert.equal(
    escapeHtml('<img src=x onerror="alert(1)"> & friends'),
    '&lt;img src=x onerror=&quot;alert(1)&quot;&gt; &amp; friends',
  );
});

test('escapeCsvCell quotes text and neutralizes spreadsheet formulas', () => {
  assert.equal(escapeCsvCell('A "quoted" value\nnext'), '"A ""quoted"" value next"');
  assert.equal(escapeCsvCell('=HYPERLINK("bad")'), '"\'=HYPERLINK(""bad"")"');
});

test('createId produces distinct prefixed string identifiers', () => {
  const first = createId('npc');
  const second = createId('npc');
  assert.match(first, /^npc-/);
  assert.notEqual(first, second);
});
