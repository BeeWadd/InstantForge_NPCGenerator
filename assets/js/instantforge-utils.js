const STORAGE_NAMES = {
  local: 'localStorage',
  session: 'sessionStorage',
};

export function getStorage(kind = 'local') {
  try {
    const storage = window[STORAGE_NAMES[kind]];
    const probe = '__instantforge_storage_probe__';
    storage.setItem(probe, probe);
    storage.removeItem(probe);
    return storage;
  } catch (error) {
    console.warn(`InstantForge ${kind} storage is unavailable.`, error);
    return null;
  }
}

export function loadCollection(key, { kind = 'local', requiredFields = [] } = {}) {
  const storage = getStorage(kind);
  if (!storage) return [];

  try {
    const raw = storage.getItem(key);
    if (!raw) return [];

    const value = JSON.parse(raw);
    if (!Array.isArray(value)) throw new TypeError(`${key} must contain an array.`);

    return value.filter((entry) => (
      entry
      && typeof entry === 'object'
      && requiredFields.every((field) => typeof entry[field] === 'string')
    ));
  } catch (error) {
    console.warn(`InstantForge ignored invalid saved data for ${key}.`, error);
    return [];
  }
}

export function saveCollection(key, value, { kind = 'local' } = {}) {
  const storage = getStorage(kind);
  if (!storage) {
    return { ok: false, error: new Error(`${kind} storage is unavailable.`) };
  }

  try {
    storage.setItem(key, JSON.stringify(value));
    return { ok: true };
  } catch (error) {
    console.warn(`InstantForge could not save ${key}.`, error);
    return { ok: false, error };
  }
}

export function removeStoredValue(key, { kind = 'local' } = {}) {
  const storage = getStorage(kind);
  if (!storage) return false;

  try {
    storage.removeItem(key);
    return true;
  } catch (error) {
    console.warn(`InstantForge could not remove ${key}.`, error);
    return false;
  }
}

export function createId(prefix = 'item') {
  if (globalThis.crypto?.randomUUID) return `${prefix}-${globalThis.crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createHistoryItem({ id, title, subtitle, fields, deleteLabel = 'Remove' }) {
  const item = document.createElement('details');
  item.className = 'history-item';

  const summary = document.createElement('summary');
  const expandIcon = document.createElement('span');
  expandIcon.className = 'expand-icon';
  expandIcon.setAttribute('aria-hidden', 'true');
  expandIcon.textContent = '+';

  const header = document.createElement('div');
  header.className = 'history-item-header';
  const heading = document.createElement('h3');
  heading.textContent = title;
  const subtitleNode = document.createElement('p');
  subtitleNode.textContent = subtitle;
  header.append(heading, subtitleNode);

  const deleteButton = document.createElement('button');
  deleteButton.type = 'button';
  deleteButton.className = 'btn-delete-item';
  deleteButton.dataset.id = String(id);
  deleteButton.setAttribute('aria-label', `${deleteLabel} ${title}`);
  deleteButton.textContent = deleteLabel;
  summary.append(expandIcon, header, deleteButton);

  const body = document.createElement('div');
  body.className = 'history-item-body';
  fields.forEach(({ label, value, dividerBefore = false }) => {
    if (dividerBefore) body.append(document.createElement('hr'));
    const group = document.createElement('div');
    group.className = 'output-group';
    const strong = document.createElement('strong');
    strong.textContent = label;
    const paragraph = document.createElement('p');
    paragraph.textContent = value;
    group.append(strong, paragraph);
    body.append(group);
  });

  item.append(summary, body);
  return item;
}

export function escapeCsvCell(value) {
  let text = String(value ?? '').replace(/\r?\n|\r/g, ' ');
  if (/^[=+\-@\t]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function setupDialog(modal, closeButton) {
  let returnFocus = null;

  const getFocusableElements = () => [...modal.querySelectorAll(
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
  )].filter((element) => !element.hidden);

  const close = () => {
    modal.classList.remove('visible');
    modal.hidden = true;
    document.removeEventListener('keydown', onKeyDown);
    returnFocus?.focus();
  };

  const onKeyDown = (event) => {
    if (event.key === 'Escape') {
      close();
      return;
    }

    if (event.key !== 'Tab') return;
    const focusable = getFocusableElements();
    if (focusable.length === 0) {
      event.preventDefault();
      modal.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const open = (trigger = document.activeElement) => {
    returnFocus = trigger;
    modal.hidden = false;
    modal.classList.add('visible');
    document.addEventListener('keydown', onKeyDown);
    closeButton.focus();
  };

  closeButton.addEventListener('click', close);
  modal.addEventListener('click', (event) => {
    if (event.target === modal) close();
  });

  return { open, close };
}

export function setupRevealControl(container, textElement, dataKey) {
  const reveal = () => {
    const value = textElement.dataset[dataKey];
    if (!value || container.getAttribute('aria-expanded') === 'true') return;
    textElement.textContent = value;
    textElement.classList.remove('hidden');
    textElement.classList.add('visible');
    container.classList.add('revealed');
    container.setAttribute('aria-expanded', 'true');
  };

  container.addEventListener('click', reveal);
  return {
    reset() {
      container.setAttribute('aria-expanded', 'false');
    },
  };
}

export function printableDocument({ title, heading, itemsHtml, styles }) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>${styles}</head><body><h1>${escapeHtml(heading)}</h1>${itemsHtml}</body></html>`;
}

export function showFatalError(message = 'Error: Could not load required game data. Please refresh the page.') {
  const main = document.querySelector('main');
  if (!main) return;

  const error = document.createElement('p');
  error.className = 'fatal-error';
  error.setAttribute('role', 'alert');
  error.textContent = message;
  main.replaceChildren(error);
}
