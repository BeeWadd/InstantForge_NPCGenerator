import { downloadFile, getStorage } from './instantforge-utils.js';
import { trackAnalyticsEvent } from './instantforge-analytics.js';
import {
  createForgePayload,
  replaceForgeCollections,
  validateForgePayload,
} from './forge-data.js';

export function setupForgeTransferControls({ onImported } = {}) {
  const exportButton = document.getElementById('export-forge');
  const importButton = document.getElementById('import-forge');
  const importInput = document.getElementById('import-forge-file');
  const feedback = document.getElementById('forge-feedback');

  const setFeedback = (message, isError = false) => {
    if (!feedback) return;
    feedback.textContent = message;
    feedback.dataset.error = String(isError);
  };

  exportButton?.addEventListener('click', () => {
    const storage = getStorage('local');
    if (!storage) {
      setFeedback('Browser storage is unavailable, so there is nothing to export.', true);
      return;
    }

    const payload = createForgePayload(storage);
    downloadFile(
      JSON.stringify(payload, null, 2),
      `instantforge-forge-${payload.exportedAt.slice(0, 10)}.json`,
      'application/json',
    );
    trackAnalyticsEvent('export_complete', { format: 'forge_json' });
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

    const validation = validateForgePayload(payload);
    if (!validation.ok) {
      setFeedback(validation.error, true);
      return;
    }

    if (!window.confirm('Importing will replace the saved InstantForge collections in this browser. Continue?')) return;

    const storage = getStorage('local');
    if (!storage) {
      setFeedback('Browser storage is unavailable, so the Forge could not be imported.', true);
      return;
    }

    const result = replaceForgeCollections(storage, validation.collections);
    if (!result.ok) {
      console.error('InstantForge could not import the Forge.', result.error);
      setFeedback('The import could not be saved; your previous collections were restored.', true);
      return;
    }

    setFeedback('Your Forge was imported successfully.');
    trackAnalyticsEvent('import_complete', { result: 'success' });
    onImported?.(validation.collections);
  });

  return { setFeedback };
}
