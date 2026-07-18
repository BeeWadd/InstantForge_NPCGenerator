import { downloadFile, getStorage } from './instantforge-utils.js';

const COLLECTIONS = {
  savedNpcs: ['name', 'subtitle', 'appearance', 'details', 'voiceMannerism', 'hook', 'goalOffer', 'secret'],
  savedMagicItems: ['name', 'subtitle', 'description', 'powers', 'history', 'curse'],
  savedTaverns: ['name', 'subtitle', 'description', 'innkeeper', 'signatureDrink', 'patrons', 'rumor'],
  savedWeapons: ['name', 'subtitle', 'description', 'properties', 'history', 'feature'],
};

const exportButton = document.getElementById('export-forge');
const importButton = document.getElementById('import-forge');
const importInput = document.getElementById('import-forge-file');
const feedback = document.getElementById('forge-feedback');

function setFeedback(message, isError = false) {
  feedback.textContent = message;
  feedback.dataset.error = String(isError);
}

function isValidCollection(value, requiredFields) {
  return Array.isArray(value) && value.every((entry) => (
    entry
    && typeof entry === 'object'
    && requiredFields.every((field) => typeof entry[field] === 'string')
  ));
}

function readCollections(storage) {
  const collections = {};
  for (const [key, requiredFields] of Object.entries(COLLECTIONS)) {
    const raw = storage.getItem(key);
    if (!raw) {
      collections[key] = [];
      continue;
    }

    try {
      const value = JSON.parse(raw);
      collections[key] = isValidCollection(value, requiredFields) ? value : [];
    } catch {
      collections[key] = [];
    }
  }
  return collections;
}

exportButton?.addEventListener('click', () => {
  const storage = getStorage('local');
  if (!storage) {
    setFeedback('Browser storage is unavailable, so there is nothing to export.', true);
    return;
  }

  const payload = {
    format: 'instantforge-forge',
    version: 1,
    exportedAt: new Date().toISOString(),
    collections: readCollections(storage),
  };
  downloadFile(
    JSON.stringify(payload, null, 2),
    `instantforge-forge-${new Date().toISOString().slice(0, 10)}.json`,
    'application/json',
  );
  setFeedback('Your Forge was exported. Keep the JSON file somewhere safe.');
});

importButton?.addEventListener('click', () => importInput?.click());

importInput?.addEventListener('change', async () => {
  const [file] = importInput.files;
  importInput.value = '';
  if (!file) return;

  let payload;
  try {
    payload = JSON.parse(await file.text());
  } catch {
    setFeedback('That file is not valid JSON.', true);
    return;
  }

  if (payload?.format !== 'instantforge-forge' || payload.version !== 1 || !payload.collections) {
    setFeedback('That file is not an InstantForge Forge export.', true);
    return;
  }

  const incoming = {};
  for (const [key, requiredFields] of Object.entries(COLLECTIONS)) {
    const value = payload.collections[key] ?? [];
    if (!isValidCollection(value, requiredFields)) {
      setFeedback(`The ${key} collection is invalid, so nothing was imported.`, true);
      return;
    }
    incoming[key] = value;
  }

  if (!window.confirm('Importing will replace the saved InstantForge collections in this browser. Continue?')) return;

  const storage = getStorage('local');
  if (!storage) {
    setFeedback('Browser storage is unavailable, so the Forge could not be imported.', true);
    return;
  }

  const backups = Object.fromEntries(Object.keys(COLLECTIONS).map((key) => [key, storage.getItem(key)]));
  try {
    for (const [key, value] of Object.entries(incoming)) storage.setItem(key, JSON.stringify(value));
    setFeedback('Your Forge was imported. Open a generator to see its restored collection.');
  } catch (error) {
    for (const [key, value] of Object.entries(backups)) {
      if (value === null) storage.removeItem(key);
      else storage.setItem(key, value);
    }
    console.error('InstantForge could not import the Forge.', error);
    setFeedback('The import could not be saved; your previous collections were restored.', true);
  }
});
