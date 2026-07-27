import assert from 'node:assert/strict';
import test from 'node:test';
import { validateAnalyticsEvent } from '../assets/js/instantforge-analytics.js';

test('analytics allowlist accepts only the five content-free event contracts', () => {
  assert.equal(validateAnalyticsEvent('generation_complete', { generator_type: 'npc' }), true);
  assert.equal(validateAnalyticsEvent('save_complete', { generator_type: 'weapon' }), true);
  assert.equal(validateAnalyticsEvent('forge_open', { source_page: 'landing' }), true);
  assert.equal(validateAnalyticsEvent('export_complete', { format: 'json' }), true);
  assert.equal(validateAnalyticsEvent('import_complete', { result: 'success' }), true);
});

test('analytics allowlist fails closed for unknown events and extra or content-like parameters', () => {
  assert.equal(validateAnalyticsEvent('page_view', {}), false);
  assert.equal(validateAnalyticsEvent('generation_complete', { name: 'secret NPC' }), false);
  assert.equal(validateAnalyticsEvent('generation_complete', { generator_type: 'npc', prompt: 'private prompt' }), false);
  assert.equal(validateAnalyticsEvent('export_complete', { format: '' }), false);
});
