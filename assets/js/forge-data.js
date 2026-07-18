export const FORGE_FORMAT = 'instantforge-forge';
export const FORGE_VERSION = 1;

export const FORGE_COLLECTIONS = {
  savedNpcs: {
    type: 'npc',
    label: 'NPC',
    pluralLabel: 'NPCs',
    generatorUrl: 'npc-generator.html',
    requiredFields: ['name', 'subtitle', 'appearance', 'details', 'voiceMannerism', 'hook', 'goalOffer', 'secret'],
    displayFields: [
      ['Appearance', 'appearance'],
      ['Details', 'details'],
      ['Voice & Mannerism', 'voiceMannerism'],
      ['Hook', 'hook'],
      ['Goal & Offer', 'goalOffer'],
      ['Secret', 'secret'],
    ],
  },
  savedMagicItems: {
    type: 'magic-item',
    label: 'Magic Item',
    pluralLabel: 'Magic Items',
    generatorUrl: 'magic-item-generator.html',
    requiredFields: ['name', 'subtitle', 'description', 'powers', 'history', 'curse'],
    displayFields: [
      ['Description', 'description'],
      ['Powers', 'powers'],
      ['History', 'history'],
      ['Curse', 'curse'],
    ],
  },
  savedTaverns: {
    type: 'tavern',
    label: 'Tavern',
    pluralLabel: 'Taverns & Inns',
    generatorUrl: 'tavern-generator.html',
    requiredFields: ['name', 'subtitle', 'description', 'innkeeper', 'signatureDrink', 'patrons', 'rumor'],
    displayFields: [
      ['Description', 'description'],
      ['Innkeeper', 'innkeeper'],
      ['Signature Drink', 'signatureDrink'],
      ['Patrons', 'patrons'],
      ['Rumor', 'rumor'],
    ],
  },
  savedWeapons: {
    type: 'weapon',
    label: 'Weapon',
    pluralLabel: 'Weapons',
    generatorUrl: 'weapon-generator.html',
    requiredFields: ['name', 'subtitle', 'description', 'properties', 'history', 'feature'],
    displayFields: [
      ['Description', 'description'],
      ['Properties', 'properties'],
      ['History', 'history'],
      ['Notable Feature', 'feature'],
    ],
  },
};

export function isValidForgeCollection(value, requiredFields) {
  return Array.isArray(value) && value.every((entry) => (
    entry
    && typeof entry === 'object'
    && requiredFields.every((field) => typeof entry[field] === 'string')
  ));
}

export function readForgeCollections(storage) {
  const collections = {};

  for (const [key, config] of Object.entries(FORGE_COLLECTIONS)) {
    try {
      const raw = storage.getItem(key);
      const value = raw ? JSON.parse(raw) : [];
      collections[key] = Array.isArray(value)
        ? value.filter((entry) => isValidForgeCollection([entry], config.requiredFields))
        : [];
    } catch (error) {
      console.warn(`InstantForge ignored invalid saved data for ${key}.`, error);
      collections[key] = [];
    }
  }

  return collections;
}

export function createForgePayload(storage, exportedAt = new Date().toISOString()) {
  return {
    format: FORGE_FORMAT,
    version: FORGE_VERSION,
    exportedAt,
    collections: readForgeCollections(storage),
  };
}

export function validateForgePayload(payload) {
  if (payload?.format !== FORGE_FORMAT || payload.version !== FORGE_VERSION || !payload.collections) {
    return { ok: false, error: 'That file is not an InstantForge Forge export.' };
  }

  const collections = {};
  for (const [key, config] of Object.entries(FORGE_COLLECTIONS)) {
    const value = payload.collections[key] ?? [];
    if (!isValidForgeCollection(value, config.requiredFields)) {
      return { ok: false, error: `The ${config.pluralLabel} collection is invalid, so nothing was imported.` };
    }
    collections[key] = value;
  }

  return { ok: true, collections };
}

export function replaceForgeCollections(storage, collections) {
  const backups = Object.fromEntries(Object.keys(FORGE_COLLECTIONS).map((key) => [key, storage.getItem(key)]));

  try {
    for (const key of Object.keys(FORGE_COLLECTIONS)) {
      storage.setItem(key, JSON.stringify(collections[key] ?? []));
    }
    return { ok: true };
  } catch (error) {
    try {
      for (const [key, value] of Object.entries(backups)) {
        if (value === null) storage.removeItem(key);
        else storage.setItem(key, value);
      }
    } catch (rollbackError) {
      console.error('InstantForge could not completely restore Forge collections.', rollbackError);
    }
    return { ok: false, error };
  }
}

export function countForgeEntries(collections) {
  return Object.values(collections).reduce((total, entries) => total + entries.length, 0);
}
