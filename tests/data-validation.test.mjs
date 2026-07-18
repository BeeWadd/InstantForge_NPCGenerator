import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function readJson(path) {
  return JSON.parse(await readFile(new URL(`../${path}`, import.meta.url), 'utf8'));
}

test('NPC data covers every selectable race and job', async () => {
  const data = await readJson('npc-data.json');
  for (const race of data.races) {
    assert.ok(data.data[race], `Missing NPC data for ${race}`);
    assert.ok(data.data[race].appearance, `Missing appearance data for ${race}`);
  }
  for (const job of data.jobs) {
    assert.ok(data.jobFlavor[job], `Missing job flavor for ${job}`);
    for (const field of ['hooks', 'goals', 'offers']) {
      assert.ok(data.jobFlavor[job][field]?.length, `Missing ${field} for ${job}`);
    }
  }
});

test('every magic-item type supports every power level', async () => {
  const data = await readJson('magic-item-data.json');
  for (const type of data.types) {
    const item = data.itemData[type];
    assert.ok(item, `Missing item data for ${type}`);
    for (const field of ['subtypes', 'nameTemplates', 'materials', 'visuals']) {
      assert.ok(item[field]?.length, `Missing ${field} for ${type}`);
    }
    for (const level of data.powerLevels) {
      assert.ok(item.powers?.[level]?.length, `Missing ${level} powers for ${type}`);
    }
  }
});

test('tavern data covers every type and quality combination', async () => {
  const data = await readJson('tavern-data.json');
  for (const type of data.types) {
    for (const quality of data.qualities) {
      assert.ok(data.descriptions?.[type]?.[quality]?.length, `Missing ${type}/${quality} descriptions`);
    }
  }
  for (const quality of data.qualities) {
    assert.ok(data.signature_drinks?.[quality]?.length, `Missing drinks for ${quality}`);
  }
});

test('weapon data covers every category and quality', async () => {
  const data = await readJson('weapon-data.json');
  for (const [category, subtypes] of Object.entries(data.types)) {
    assert.ok(subtypes.length, `Missing subtypes for ${category}`);
    assert.equal(new Set(subtypes).size, subtypes.length, `Duplicate subtype in ${category}`);
  }
  for (const quality of data.qualities) {
    assert.ok(data.descriptors?.[quality]?.length, `Missing descriptors for ${quality}`);
    assert.ok(data.histories?.[quality]?.length, `Missing histories for ${quality}`);
  }
});
