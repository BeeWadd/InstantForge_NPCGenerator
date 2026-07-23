import {
  countForgeEntries,
  FORGE_COLLECTIONS,
  readForgeCollections,
  replaceForgeCollections,
} from './forge-data.js';
import { setupForgeTransferControls } from './forge-transfer.js';
import { createHistoryItem, getStorage, saveCollection } from './instantforge-utils.js';
import { forgeSourcePage, initializeAnalytics, trackAnalyticsEvent } from './instantforge-analytics.js';

const ui = {
  totalSummary: document.getElementById('forge-total-summary'),
  resultsSummary: document.getElementById('forge-results-summary'),
  entries: document.getElementById('forge-entries'),
  search: document.getElementById('forge-search'),
  filter: document.getElementById('forge-filter'),
  clearButton: document.getElementById('clear-forge'),
  statButtons: [...document.querySelectorAll('[data-forge-filter]')],
  counts: {
    all: document.getElementById('forge-count-all'),
    npc: document.getElementById('forge-count-npc'),
    'magic-item': document.getElementById('forge-count-magic-item'),
    tavern: document.getElementById('forge-count-tavern'),
    weapon: document.getElementById('forge-count-weapon'),
  },
};

let collections = Object.fromEntries(Object.keys(FORGE_COLLECTIONS).map((key) => [key, []]));
let forgeOpenTracked = false;
function trackForgeOpen() {
  if (forgeOpenTracked) return;
  forgeOpenTracked = trackAnalyticsEvent('forge_open', { source_page: forgeSourcePage() });
}
window.addEventListener('instantforgeanalyticsready', trackForgeOpen, { once: true });
initializeAnalytics().then((loaded) => {
  if (loaded) trackForgeOpen();
});
const transfer = setupForgeTransferControls({ onImported: loadForge });

function flattenedEntries() {
  return Object.entries(FORGE_COLLECTIONS).flatMap(([collectionKey, config]) => (
    collections[collectionKey].map((entry, index) => ({ collectionKey, config, entry, index }))
  ));
}

function matchesSearch(item, query) {
  if (!query) return true;
  const searchable = [item.config.label, ...Object.values(item.entry)]
    .filter((value) => typeof value === 'string')
    .join(' ')
    .toLocaleLowerCase();
  return searchable.includes(query);
}

function setActiveFilter(filter) {
  ui.filter.value = filter;
  for (const button of ui.statButtons) {
    const active = button.dataset.forgeFilter === filter;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  }
}

function createForgeEntry(item) {
  const fields = item.config.displayFields.map(([label, key], index) => ({
    label,
    value: item.entry[key],
    dividerBefore: index > 0 && ['Voice & Mannerism', 'History', 'Patrons'].includes(label),
  }));
  const card = createHistoryItem({
    id: item.entry.id ?? `${item.collectionKey}-${item.index}`,
    title: item.entry.name,
    subtitle: item.entry.subtitle,
    fields,
    deleteLabel: 'Remove',
  });
  card.classList.add('forge-entry');
  card.dataset.forgeEntry = item.config.type;
  card.dataset.collectionKey = item.collectionKey;
  card.dataset.collectionIndex = String(item.index);

  const badge = document.createElement('span');
  badge.className = 'forge-entry-badge';
  badge.textContent = item.config.label;
  card.querySelector('.history-item-header').prepend(badge);

  const generatorLink = document.createElement('a');
  generatorLink.className = 'forge-generator-link';
  generatorLink.href = item.config.generatorUrl;
  generatorLink.textContent = `Open ${item.config.label} Generator`;
  card.querySelector('.history-item-body').append(generatorLink);

  card.querySelector('.btn-delete-item').addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    removeEntry(item);
  });
  return card;
}

function createEmptyState(total) {
  const empty = document.createElement('div');
  empty.className = 'forge-empty-state';

  const heading = document.createElement('h3');
  const message = document.createElement('p');
  if (total === 0) {
    heading.textContent = 'Your Forge is waiting.';
    message.textContent = 'Generate and save something you want to keep. It will appear here automatically.';
  } else {
    heading.textContent = 'No matching creations.';
    message.textContent = 'Try a different search or show all creation types.';
  }
  empty.append(heading, message);

  if (total === 0) {
    const links = document.createElement('div');
    links.className = 'forge-empty-links';
    for (const config of Object.values(FORGE_COLLECTIONS)) {
      const link = document.createElement('a');
      link.className = 'btn-secondary';
      link.href = config.generatorUrl;
      link.textContent = `Create ${config.label}`;
      links.append(link);
    }
    empty.append(links);
  }
  return empty;
}

function renderCounts() {
  const total = countForgeEntries(collections);
  ui.counts.all.textContent = String(total);
  for (const [key, config] of Object.entries(FORGE_COLLECTIONS)) {
    ui.counts[config.type].textContent = String(collections[key].length);
  }
  ui.totalSummary.textContent = total === 0
    ? 'No saved creations yet.'
    : `${total} saved creation${total === 1 ? '' : 's'} in this browser.`;
  ui.clearButton.disabled = total === 0;
}

function renderEntries() {
  const allEntries = flattenedEntries();
  const type = ui.filter.value;
  const query = ui.search.value.trim().toLocaleLowerCase();
  const visibleEntries = allEntries.filter((item) => (
    (type === 'all' || item.config.type === type) && matchesSearch(item, query)
  ));

  ui.entries.replaceChildren();
  for (const item of visibleEntries) ui.entries.append(createForgeEntry(item));
  if (visibleEntries.length === 0) ui.entries.append(createEmptyState(allEntries.length));

  ui.resultsSummary.textContent = `Showing ${visibleEntries.length} of ${allEntries.length} saved creation${allEntries.length === 1 ? '' : 's'}.`;
}

function renderForge() {
  renderCounts();
  renderEntries();
}

function loadForge() {
  const storage = getStorage('local');
  if (!storage) {
    collections = Object.fromEntries(Object.keys(FORGE_COLLECTIONS).map((key) => [key, []]));
    transfer.setFeedback('Browser storage is unavailable, so Your Forge cannot be loaded.', true);
  } else {
    collections = readForgeCollections(storage);
  }
  renderForge();
}

function removeEntry(item) {
  if (!window.confirm(`Remove “${item.entry.name}” from Your Forge?`)) return;
  const nextEntries = collections[item.collectionKey].filter((_, index) => index !== item.index);
  const result = saveCollection(item.collectionKey, nextEntries);
  if (!result.ok) {
    transfer.setFeedback('That creation could not be removed because browser storage is unavailable.', true);
    return;
  }
  collections[item.collectionKey] = nextEntries;
  transfer.setFeedback(`${item.entry.name} was removed from Your Forge.`);
  renderForge();
}

function clearForge() {
  const total = countForgeEntries(collections);
  if (total === 0 || !window.confirm(`Delete all ${total} saved creations from this browser? Export a backup first if you may want them later.`)) return;
  const storage = getStorage('local');
  if (!storage) {
    transfer.setFeedback('Your Forge could not be cleared because browser storage is unavailable.', true);
    return;
  }

  const emptyCollections = Object.fromEntries(Object.keys(FORGE_COLLECTIONS).map((key) => [key, []]));
  const result = replaceForgeCollections(storage, emptyCollections);
  if (!result.ok) {
    transfer.setFeedback('Your Forge could not be cleared; the saved collections were restored.', true);
    return;
  }
  collections = emptyCollections;
  transfer.setFeedback('Your Forge was cleared.');
  renderForge();
}

ui.search.addEventListener('input', renderEntries);
ui.filter.addEventListener('change', () => {
  setActiveFilter(ui.filter.value);
  renderEntries();
});
ui.clearButton.addEventListener('click', clearForge);
for (const button of ui.statButtons) {
  button.addEventListener('click', () => {
    setActiveFilter(button.dataset.forgeFilter);
    renderEntries();
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    ui.entries.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  });
}
window.addEventListener('storage', loadForge);
window.addEventListener('pageshow', loadForge);

loadForge();
