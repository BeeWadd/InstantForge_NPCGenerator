import {
    createHistoryItem,
    createId,
    downloadFile,
    escapeCsvCell,
    escapeHtml,
    loadCollection,
    printableDocument,
    removeStoredValue,
    saveCollection,
    showFatalError,
    setupDialog,
    setupRevealControl,
} from './assets/js/instantforge-utils.js';
import { initializeAnalytics, trackAnalyticsEvent } from './assets/js/instantforge-analytics.js';

console.log("InstantForge: NPCs script loaded.");
let npcData;
let savedNpcs = [];
let exportDialog;

const SAVED_NPCS_KEY = 'savedNpcs';
const NPC_QUEUE_KEY = 'pendingNpcsForGeneration';

// --- CONSTANTS ---
const iconLockOpenSVG = `<svg class="icon-lock-open" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path></svg>`;
const iconLockClosedSVG = `<svg class="icon-lock-closed" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>`;

// --- STATE ---
let lockStates = {
    name: false,
    appearance: false,
    details: false,
};

// --- UTILITY FUNCTIONS ---
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const sample = (arr, n) => {
    const shuffled = [...arr].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, n);
};
const capitalize = (str) => str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
const withTerminalPunctuation = (text) => {
    const trimmed = String(text || '').trim();
    if (!trimmed) return '';
    return /[.!?\u2026]["'\)\]]?$/.test(trimmed) ? trimmed : `${trimmed}.`;
};

// --- UNIQUENESS GUARD ---
const HISTORY_LIMIT = 10;
let generationHistory = {
    personalities: [],
    quirks: [],
    voices: [],
    mannerisms: [],
    secrets: [],
    hooks: [],
    goals: [],
    offers: [],
};

function pickUnique(arr, historyKey) {
    if (!arr || arr.length === 0) return "";
    const historyQueue = generationHistory[historyKey];
    if (!historyQueue) {
        console.warn(`No history queue found for key: ${historyKey}`);
        return pick(arr);
    }
    const uniqueOptions = arr.filter(option => !historyQueue.includes(option));
    let chosen = (uniqueOptions.length > 0) ? pick(uniqueOptions) : pick(arr);
    historyQueue.unshift(chosen); 
    if (historyQueue.length > HISTORY_LIMIT) {
        historyQueue.pop();
    }
    return chosen;
}

// --- DOM ELEMENTS ---
const ui = {
    race: document.getElementById('race'),
    gender: document.getElementById('gender'),
    job: document.getElementById('job'),
    name: document.getElementById('name'),
    appearance: document.getElementById('appearance'),
    details: document.getElementById('details'),
    context: document.getElementById('context'),
    generateBtn: document.getElementById('generate'),
    randomizeBtn: document.getElementById('randomize'),
    copyBtn: document.getElementById('copy'),
    saveBtn: document.getElementById('save'),
    clearBtn: document.getElementById('clear'),
    copyFeedback: document.getElementById('copy-feedback'),
    outputName: document.getElementById('output-name'),
    outputSubtitle: document.getElementById('output-subtitle'),
    outputAppearance: document.getElementById('output-appearance'),
    outputDetails: document.getElementById('output-details'),
    outputVoiceMannerism: document.getElementById('output-voice-mannerism'),
    outputHook: document.getElementById('output-hook'),
    outputGoalOffer: document.getElementById('output-goal-offer'),
    secretContainer: document.getElementById('secret-container'),
    secretText: document.getElementById('secret-text'),
    historyList: document.getElementById('history-list'),
    clearHistoryBtn: document.getElementById('clear-history'),
    exportHistoryBtn: document.getElementById('export-history'),
    exportModal: document.getElementById('export-modal'),
    closeModalBtn: document.getElementById('close-modal'),
    exportJsonBtn: document.getElementById('export-json'),
    exportCsvBtn: document.getElementById('export-csv'),
    exportMdBtn: document.getElementById('export-md'),
    exportPdfBtn: document.getElementById('export-pdf'),
    queuedNpcsPanel: document.getElementById('queued-npcs-panel'),
    queuedNpcsSummary: document.getElementById('queued-npcs-summary'),
    queuedNpcsList: document.getElementById('queued-npcs-list'),
    processNpcQueueBtn: document.getElementById('process-npc-queue'),
    clearNpcQueueBtn: document.getElementById('clear-npc-queue'),
    // Lock buttons
    lockNameBtn: document.getElementById('lock-name'),
    lockAppearanceBtn: document.getElementById('lock-appearance'),
    lockDetailsBtn: document.getElementById('lock-details'),
};

// --- GENERATION LOGIC ---

function generateName(race, gender) {
    const raceData = npcData.data[race];
    const namesList = raceData.names[gender];
    let firstName = "";
    if (namesList && namesList.length > 0) {
        firstName = pick(namesList);
    } else {
        const syllables = raceData.name_syllables;
        if (syllables && syllables.patterns.length > 0) {
            const pattern = pick(syllables.patterns);
            let builtName = "";
            if (pattern.includes("P")) builtName += pick(syllables.prefix);
            if (pattern.includes("M")) builtName += pick(syllables.middle);
            if (pattern.includes("S")) builtName += pick(syllables.suffix);
            firstName = capitalize(builtName);
        } else {
            firstName = "Nameless";
        }
    }
    const lastName = pick(raceData.lastNames);
    return `${firstName} ${lastName}`;
}

function generateAppearance(race, gender) {
    const appearanceData = npcData.data[race].appearance;
    let physicalTraits = [...appearanceData.shared.physical];
    let clothingTraits = [...appearanceData.shared.clothing];
    if (appearanceData.gender[gender]) {
        physicalTraits.push(...appearanceData.gender[gender].physical);
        clothingTraits.push(...appearanceData.gender[gender].clothing);
    }
    if (gender === 'female' || gender === 'neutral') {
        if (race === 'human' || race === 'elf' || race === 'halfling') {
             physicalTraits = physicalTraits.filter(t => !t.toLowerCase().includes('beard'));
        }
    }
    const numPhysical = Math.floor(Math.random() * 2) + 2;
    const numClothing = Math.floor(Math.random() * 2) + 1;
    const selectedPhysical = sample(physicalTraits, numPhysical);
    const selectedClothing = sample(clothingTraits, numClothing);
    return [...selectedPhysical, ...selectedClothing].join('; ');
}

function generateDetails() {
    const personality = pickUnique(npcData.personalities, 'personalities');
    const quirk = pickUnique(npcData.quirks, 'quirks');
    return `${personality}; ${withTerminalPunctuation(quirk)}`;
}

function generateNpc(forceRandomize = false) {
    // Prioritize existing form values unless randomizing everything
    const race = !forceRandomize && ui.race.value ? ui.race.value : pick(npcData.races);
    const gender = !forceRandomize && ui.gender.value ? ui.gender.value : pick(['male', 'female', 'neutral']);
    const job = !forceRandomize && ui.job.value ? ui.job.value : pick(npcData.jobs);

    const name = !lockStates.name ? generateName(race, gender) : ui.name.value;
    const appearance = !lockStates.appearance ? generateAppearance(race, gender) : ui.appearance.value;
    const details = !lockStates.details ? generateDetails() : ui.details.value;
    
    ui.race.value = race;
    ui.gender.value = gender;
    ui.job.value = job;
    ui.name.value = name;
    ui.appearance.value = appearance;
    ui.details.value = details;

    const context = ui.context.value || 'the area';
    const jobFlavor = npcData.jobFlavor[job];

    const hooksArr = jobFlavor?.hooks || npcData.globalHooks;
    const goalsArr = jobFlavor?.goals || npcData.globalGoals;
    const offersArr = jobFlavor?.offers || npcData.globalOffers;

    const hook = pickUnique(hooksArr, 'hooks').replace('{place}', context);
    const goal = pickUnique(goalsArr, 'goals').replace('{place}', context);
    const offer = pickUnique(offersArr, 'offers').replace('{place}', context);
    const secret = pickUnique(npcData.secrets, 'secrets').replace('{place}', context);
    const voice = pickUnique(npcData.voices, 'voices');
    const mannerism = pickUnique(npcData.mannerisms, 'mannerisms');
    
    ui.outputName.textContent = name;
    ui.outputSubtitle.textContent = `${capitalize(race.replace('_',' '))} ${job} (${gender})`;
    ui.outputAppearance.textContent = appearance;
    ui.outputDetails.textContent = details;
    ui.outputVoiceMannerism.textContent = `${voice}; ${withTerminalPunctuation(mannerism)}`;
    ui.outputHook.textContent = hook;
    ui.outputGoalOffer.textContent = `${withTerminalPunctuation(goal)} They can offer: ${withTerminalPunctuation(offer)}`;
    
    ui.secretText.classList.remove('visible');
    ui.secretText.classList.add('hidden');
    ui.secretContainer.classList.remove('revealed');
    ui.secretContainer.setAttribute('aria-expanded', 'false');
    
    ui.secretText.textContent = "(Click to reveal)";
    ui.secretText.dataset.secret = secret;
    trackAnalyticsEvent('generation_complete', { generator_type: 'npc' });
}

function populateSelects() {
    npcData.races.forEach(race => {
        const option = document.createElement('option');
        option.value = race;
        option.textContent = capitalize(race.replace('_', ' '));
        ui.race.appendChild(option);
    });
    npcData.jobs.forEach(job => {
        const option = document.createElement('option');
        option.value = job;
        option.textContent = job;
        ui.job.appendChild(option);
    });
}

function copyToClipboard() {
    const name = ui.outputName.textContent;
    if (name === "Your NPC Appears Here") {
        showCopyFeedback("Generate an NPC first!", true);
        return;
    }

    const textToCopy = `
Name: ${name}
${ui.outputSubtitle.textContent}
---
Appearance: ${ui.outputAppearance.textContent}
Details: ${ui.outputDetails.textContent}
---
Voice: ${ui.outputVoiceMannerism.textContent}
Hook: ${ui.outputHook.textContent}
Goal & Offer: ${ui.outputGoalOffer.textContent}
Secret: ${ui.secretText.dataset.secret || ui.secretText.textContent}
    `.trim().replace(/^\s+/gm, '');

    navigator.clipboard.writeText(textToCopy).then(() => {
        showCopyFeedback("Copied to clipboard!");
    }, () => {
        showCopyFeedback("Clipboard access failed. Select and copy the text manually.", true, 5000);
    });
}

function showCopyFeedback(message, isError = false, duration = 2000) {
    ui.copyFeedback.textContent = message;
    ui.copyFeedback.style.color = isError ? '#dc3545' : 'var(--primary-color)';
    ui.copyFeedback.style.opacity = 1;
    setTimeout(() => {
        ui.copyFeedback.style.opacity = 0;
    }, duration);
}

function clearFormInputs(respectLocks = true) {
    if (!respectLocks || !lockStates.name) ui.name.value = '';
    if (!respectLocks || !lockStates.appearance) ui.appearance.value = '';
    if (!respectLocks || !lockStates.details) ui.details.value = '';
    
    ui.race.value = '';
    ui.gender.value = '';
    ui.job.value = '';
    ui.context.value = '';
}

function clearVolatileFormInputs() {
    if (!lockStates.name) ui.name.value = '';
    if (!lockStates.details) ui.details.value = '';
    ui.gender.value = ''; // Gender can be different for each group member.
}

function clearOutput() {
    ui.outputName.textContent = 'Your NPC Appears Here';
    ui.outputSubtitle.textContent = '';
    ui.outputAppearance.textContent = '';
    ui.outputDetails.textContent = '';
    ui.outputVoiceMannerism.textContent = '';
    ui.outputHook.textContent = '';
    ui.outputGoalOffer.textContent = '';
    
    ui.secretText.classList.remove('visible');
    ui.secretText.classList.add('hidden');
    ui.secretContainer.classList.remove('revealed');
    ui.secretContainer.setAttribute('aria-expanded', 'false');
    ui.secretText.textContent = '(Click to reveal)';
    if (ui.secretText.dataset.secret) {
        delete ui.secretText.dataset.secret;
    }
    
    ui.copyFeedback.style.opacity = 0;
    setTimeout(() => { ui.copyFeedback.textContent = ''; }, 300);
}

function resetLocks() {
    lockStates = { name: false, appearance: false, details: false };
    Object.keys(lockStates).forEach(field => {
        const btn = ui[`lock${capitalize(field)}Btn`];
        btn.dataset.locked = 'false';
        btn.setAttribute('aria-label', `Lock ${capitalize(field)}`);
    });
}

function clearAll() {
    clearFormInputs(false);
    clearOutput();
    resetLocks();
}

// --- HISTORY & EXPORT FUNCTIONS ---

function saveNpc(showFeedback = true) {
    if (ui.outputName.textContent === "Your NPC Appears Here") {
        if(showFeedback) showCopyFeedback("Generate an NPC first!", true);
        return;
    }
    const npc = {
        name: ui.outputName.textContent,
        subtitle: ui.outputSubtitle.textContent,
        appearance: ui.outputAppearance.textContent,
        details: ui.outputDetails.textContent,
        voiceMannerism: ui.outputVoiceMannerism.textContent,
        hook: ui.outputHook.textContent,
        goalOffer: ui.outputGoalOffer.textContent,
        secret: ui.secretText.dataset.secret,
        id: createId('npc')
    };
    
    savedNpcs.unshift(npc);
    const result = saveCollection(SAVED_NPCS_KEY, savedNpcs);
    if (!result.ok) {
        savedNpcs.shift();
        if(showFeedback) showCopyFeedback("NPC could not be saved. Browser storage may be unavailable or full.", true, 5000);
        return false;
    }
    renderHistory();
    trackAnalyticsEvent('save_complete', { generator_type: 'npc' });
    if(showFeedback) showCopyFeedback("NPC Saved!");
    return true;
}

function renderHistory() {
    ui.historyList.replaceChildren();
    if (savedNpcs.length === 0) {
        const empty = document.createElement('p');
        empty.textContent = 'No NPCs saved yet. Generate and save an NPC to see it here!';
        ui.historyList.appendChild(empty);
        ui.exportHistoryBtn.disabled = true;
        ui.clearHistoryBtn.disabled = true;
        return;
    }
    
    ui.exportHistoryBtn.disabled = false;
    ui.clearHistoryBtn.disabled = false;

    savedNpcs.forEach(npc => {
        const item = createHistoryItem({
            id: npc.id,
            title: npc.name,
            subtitle: npc.subtitle,
            fields: [
                { label: 'Appearance', value: npc.appearance },
                { label: 'Details', value: npc.details },
                { label: 'Voice & Mannerism', value: npc.voiceMannerism, dividerBefore: true },
                { label: 'Hook', value: npc.hook },
                { label: 'Goal & Offer', value: npc.goalOffer },
                { label: 'Secret', value: npc.secret },
            ],
        });

        const deleteBtn = item.querySelector('.btn-delete-item');
        deleteBtn.addEventListener('click', (e) => {
            e.preventDefault(); // Prevent details from toggling
            deleteNpc(e.currentTarget.dataset.id);
        });

        ui.historyList.appendChild(item);
    });
}

function loadHistory() {
    savedNpcs = loadCollection(SAVED_NPCS_KEY, {
        requiredFields: ['name', 'subtitle', 'appearance', 'details', 'voiceMannerism', 'hook', 'goalOffer', 'secret'],
    });
    renderHistory();
}

function deleteNpc(idToDelete) {
    const previous = savedNpcs;
    savedNpcs = savedNpcs.filter(npc => String(npc.id) !== String(idToDelete));
    if (!saveCollection(SAVED_NPCS_KEY, savedNpcs).ok) {
        savedNpcs = previous;
        showCopyFeedback("NPC could not be removed because browser storage is unavailable.", true, 5000);
    }
    renderHistory();
}

function clearHistory() {
    if (savedNpcs.length === 0) return;
    if (confirm("Are you sure you want to delete all saved NPCs? This cannot be undone.")) {
        savedNpcs = [];
        saveCollection(SAVED_NPCS_KEY, savedNpcs);
        renderHistory();
        showCopyFeedback("History Cleared.");
    }
}

function showExportModal() { exportDialog.open(ui.exportHistoryBtn); }
function hideExportModal() { exportDialog.close(); }

function exportAsJson() {
    if (savedNpcs.length === 0) { showCopyFeedback("No history to export.", true); return; }
    const dataStr = JSON.stringify(savedNpcs, null, 2);
    downloadFile(dataStr, "instantforge_npc_history.json", "application/json");
    trackAnalyticsEvent('export_complete', { format: 'json' });
    hideExportModal();
}

function exportAsCsv() {
    if (savedNpcs.length === 0) { showCopyFeedback("No history to export.", true); return; }
    const headers = ['name', 'subtitle', 'appearance', 'details', 'voiceMannerism', 'hook', 'goalOffer', 'secret'];
    let csvContent = headers.join(',') + '\n';
    savedNpcs.forEach(npc => {
        const row = headers.map(header => escapeCsvCell(npc[header]));
        csvContent += row.join(',') + '\n';
    });
    downloadFile(csvContent, "instantforge_npc_history.csv", "text/csv;charset=utf-8;");
    trackAnalyticsEvent('export_complete', { format: 'csv' });
    hideExportModal();
}

function exportAsMarkdown() {
    if (savedNpcs.length === 0) { showCopyFeedback("No history to export.", true); return; }
    const markdownContent = savedNpcs.map(npc => {
        return `## ${npc.name}\n*${npc.subtitle}*\n\n**Appearance**\n${npc.appearance}\n\n**Details**\n${npc.details}\n\n**Voice & Mannerism**\n${npc.voiceMannerism}\n\n**Hook**\n${npc.hook}\n\n**Goal & Offer**\n${npc.goalOffer}\n\n**Secret**\n${npc.secret}`;
    }).join('\n\n---\n\n');
    downloadFile(markdownContent, "instantforge_npc_history.md", "text/markdown;charset=utf-8;");
    trackAnalyticsEvent('export_complete', { format: 'markdown' });
    hideExportModal();
}

function exportAsPdf() {
    if (savedNpcs.length === 0) { showCopyFeedback("No history to export.", true); return; }
    const npcHtml = savedNpcs.map(npc => `
        <div class="npc-page">
            <h2>${escapeHtml(npc.name)}</h2>
            <p class="subtitle"><em>${escapeHtml(npc.subtitle)}</em></p>
            <div class="output-group"><strong>Appearance</strong><p>${escapeHtml(npc.appearance)}</p></div>
            <div class="output-group"><strong>Details</strong><p>${escapeHtml(npc.details)}</p></div>
            <hr>
            <div class="output-group"><strong>Voice & Mannerism</strong><p>${escapeHtml(npc.voiceMannerism)}</p></div>
            <div class="output-group"><strong>Hook</strong><p>${escapeHtml(npc.hook)}</p></div>
            <div class="output-group"><strong>Goal & Offer</strong><p>${escapeHtml(npc.goalOffer)}</p></div>
            <div class="output-group"><strong>Secret</strong><p>${escapeHtml(npc.secret)}</p></div>
        </div>
    `).join('');

    const printStyles = `
        <style>
            body { font-family: Georgia, serif; color: #333; }
            h1, h2 { font-family: Georgia, serif; }
            h2 { font-size: 22pt; margin-bottom: 0; }
            .subtitle { font-size: 11pt; color: #666; margin-top: 0; }
            .output-group { margin-bottom: 1em; }
            .output-group strong { color: #8B0000; display: block; font-size: 10pt; text-transform: uppercase; letter-spacing: 1px; }
            .output-group p { margin: 0.25em 0 0 0; padding-left: 1em; border-left: 2px solid #ccc; }
            hr { border: 0; height: 1px; background: #ccc; margin: 1em 0; }
            .npc-page { page-break-inside: avoid; margin-bottom: 2em; border-bottom: 1px solid #ccc; padding-bottom: 1em; }
            @media print { .npc-page { border-bottom: none; } }
        </style>
    `;

    const htmlContent = printableDocument({ title: 'InstantForge NPC History', heading: 'Saved NPCs', itemsHtml: npcHtml, styles: printStyles });

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        showCopyFeedback('Printing was blocked. Allow pop-ups for InstantForge and try again.', true, 5000);
        return;
    }
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); }, 250);
    trackAnalyticsEvent('export_complete', { format: 'pdf' });
    hideExportModal();
}

function setupLockButtons() {
    const lockableFields = ['name', 'appearance', 'details'];
    lockableFields.forEach(field => {
        const btn = ui[`lock${capitalize(field)}Btn`];
        btn.innerHTML = iconLockOpenSVG + iconLockClosedSVG;
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            lockStates[field] = !lockStates[field];
            btn.dataset.locked = lockStates[field];
            const action = lockStates[field] ? 'Unlock' : 'Lock';
            btn.setAttribute('aria-label', `${action} ${capitalize(field)}`);
        });
    });
}

function loadNpcQueue() {
    return loadCollection(NPC_QUEUE_KEY, { kind: 'session' }).filter((entry) => (
        entry
        && Number.isInteger(entry.quantity)
        && entry.quantity > 0
        && typeof entry.race === 'string'
        && typeof entry.job === 'string'
        && typeof entry.appearance === 'string'
    ));
}

function renderQueuedNpcs() {
    if (!ui.queuedNpcsPanel || !ui.queuedNpcsList) return;
    const queue = loadNpcQueue();
    ui.queuedNpcsList.replaceChildren();
    ui.queuedNpcsPanel.hidden = queue.length === 0;
    if (queue.length === 0) return;

    const total = queue.reduce((sum, entry) => sum + entry.quantity, 0);
    ui.queuedNpcsSummary.textContent = `${total} character${total === 1 ? '' : 's'} ready to generate and save.`;
    queue.forEach((entry) => {
        const item = document.createElement('li');
        const details = [entry.race?.replaceAll('_', ' '), entry.job].filter(Boolean).join(' · ');
        item.textContent = `${entry.quantity}× ${entry.appearance}${details ? ` (${details})` : ''}`;
        ui.queuedNpcsList.appendChild(item);
    });
}

function clearNpcQueue() {
    removeStoredValue(NPC_QUEUE_KEY, { kind: 'session' });
    renderQueuedNpcs();
    showCopyFeedback('Queued NPCs cleared.');
}

async function processQueuedNpcs() {
    const patronsToProcess = loadNpcQueue();
    if (patronsToProcess.length === 0) {
        renderQueuedNpcs();
        return;
    }

    try {
        const totalNpcsToGenerate = patronsToProcess.reduce((acc, curr) => acc + curr.quantity, 0);
        showCopyFeedback(`Generating ${totalNpcsToGenerate} queued characters...`, false, 5000);

        for (const patronInfo of patronsToProcess) {
            for (let i = 0; i < patronInfo.quantity; i++) {
                clearVolatileFormInputs();
                ui.race.value = patronInfo.race || '';
                ui.job.value = patronInfo.job || '';
                ui.appearance.value = patronInfo.appearance;

                const wasAppearanceLocked = lockStates.appearance;
                lockStates.appearance = true;
                generateNpc(false);
                const saved = saveNpc(false);
                lockStates.appearance = wasAppearanceLocked;
                if (!saved) throw new Error('Browser storage rejected a queued NPC.');
            }
        }

        removeStoredValue(NPC_QUEUE_KEY, { kind: 'session' });
        renderQueuedNpcs();
        showCopyFeedback(`${totalNpcsToGenerate} queued NPC${totalNpcsToGenerate === 1 ? '' : 's'} created and saved!`);
    } catch (error) {
        console.error("Error processing queued NPCs:", error);
        showCopyFeedback('Queued NPC generation stopped. The queue was kept for retry.', true, 5000);
    }
}


// --- EVENT LISTENERS & INITIALIZATION ---
document.addEventListener('DOMContentLoaded', async () => {
    try {
        initializeAnalytics();
        const response = await fetch('npc-data.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        npcData = await response.json();

        populateSelects();
        loadHistory();
        setupLockButtons();
        exportDialog = setupDialog(ui.exportModal, ui.closeModalBtn);
        setupRevealControl(ui.secretContainer, ui.secretText, 'secret');
        renderQueuedNpcs();

        ui.generateBtn.addEventListener('click', () => generateNpc(false));
        ui.randomizeBtn.addEventListener('click', () => generateNpc(true));
        ui.copyBtn.addEventListener('click', copyToClipboard);
        ui.saveBtn.addEventListener('click', () => saveNpc(true));
        ui.clearBtn.addEventListener('click', clearAll);
        ui.clearHistoryBtn.addEventListener('click', clearHistory);
        ui.processNpcQueueBtn?.addEventListener('click', processQueuedNpcs);
        ui.clearNpcQueueBtn?.addEventListener('click', clearNpcQueue);
        
        // Export modal listeners
        ui.exportHistoryBtn.addEventListener('click', showExportModal);
        ui.exportJsonBtn.addEventListener('click', exportAsJson);
        ui.exportCsvBtn.addEventListener('click', exportAsCsv);
        ui.exportMdBtn.addEventListener('click', exportAsMarkdown);
        ui.exportPdfBtn.addEventListener('click', exportAsPdf);

    } catch (error) {
        console.error("Could not load or parse npc-data.json", error);
        showFatalError();
    }
});
