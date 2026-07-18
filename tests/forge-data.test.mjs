import assert from 'node:assert/strict';
import test from 'node:test';

import {
  countForgeEntries,
  createForgePayload,
  readForgeCollections,
  replaceForgeCollections,
  validateForgePayload,
} from '../assets/js/forge-data.js';

class MemoryStorage {
  constructor(values = {}) {
    this.values = new Map(Object.entries(values));
  }

  getItem(key) {
    return this.values.has(key) ? this.values.get(key) : null;
  }

  setItem(key, value) {
    this.values.set(key, String(value));
  }

  removeItem(key) {
    this.values.delete(key);
  }
}

const validNpc = {
  id: 'npc-1',
  name: 'Mara Voss',
  subtitle: 'Human Cartographer',
  appearance: 'Ink-stained hands.',
  details: 'Quiet and observant.',
  voiceMannerism: 'Counts under her breath.',
  hook: 'Needs an escort.',
  goalOffer: 'Offers a hidden map.',
  secret: 'The map is incomplete.',
};

test('Forge reads valid entries while ignoring malformed saved values', () => {
  const storage = new MemoryStorage({
    savedNpcs: JSON.stringify([validNpc, { name: 'Incomplete' }]),
    savedMagicItems: JSON.stringify([{ name: 'Incomplete' }]),
  });
  const collections = readForgeCollections(storage);

  assert.deepEqual(collections.savedNpcs, [validNpc]);
  assert.deepEqual(collections.savedMagicItems, []);
  assert.equal(countForgeEntries(collections), 1);
});

test('Forge payload validation rejects an invalid collection atomically', () => {
  const storage = new MemoryStorage({ savedNpcs: JSON.stringify([validNpc]) });
  const payload = createForgePayload(storage, '2026-07-18T00:00:00.000Z');
  payload.collections.savedWeapons = [{ name: 'Missing required fields' }];

  const result = validateForgePayload(payload);
  assert.equal(result.ok, false);
  assert.match(result.error, /Weapons collection is invalid/);
});

test('Forge collection replacement writes every collection together', () => {
  const storage = new MemoryStorage({ savedNpcs: JSON.stringify([validNpc]) });
  const payload = createForgePayload(new MemoryStorage());
  const result = replaceForgeCollections(storage, payload.collections);

  assert.equal(result.ok, true);
  assert.deepEqual(JSON.parse(storage.getItem('savedNpcs')), []);
  assert.deepEqual(JSON.parse(storage.getItem('savedWeapons')), []);
});
