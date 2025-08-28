console.log("InstantForge: NPCs script loaded.");
let npcData;
let savedNpcs = [];

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
    return `${personality}; ${quirk}.`;
}

function generateNpc(forceRandomize = false) {
    const race = (forceRandomize || !ui.race.value) ? pick(npcData.races) : ui.race.value;
    const gender = (forceRandomize || !ui.gender.value) ? pick(['male', 'female', 'neutral']) : ui.gender.value;
    const job = (forceRandomize || !ui.job.value) ? pick(npcData.jobs) : ui.job.value;

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
    ui.outputSubtitle.textContent = `${capitalize(race)} ${job} (${gender})`;
    ui.outputAppearance.textContent = appearance;
    ui.outputDetails.textContent = details;
    ui.outputVoiceMannerism.textContent = `${voice}; ${mannerism}.`;
    ui.outputHook.textContent = hook;
    ui.outputGoalOffer.textContent = `${goal} They can offer: ${offer}.`;
    
    ui.secretText.classList.remove('visible');
    ui.secretText.classList.add('hidden');
    ui.secretContainer.classList.remove('revealed');
    
    ui.secretText.textContent = "(Click to reveal)";
    ui.secretText.dataset.secret = secret;
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
        showCopyFeedback("Failed to copy.", true);
    });
}

function showCopyFeedback(message, isError = false) {
    ui.copyFeedback.textContent = message;
    ui.copyFeedback.style.color = isError ? '#dc3545' : 'var(--primary-color)';
    ui.copyFeedback.style.opacity = 1;
    setTimeout(() => {
        ui.copyFeedback.style.opacity = 0;
    }, 2000);
}

function clearAll() {
    const inputs = [ui.name, ui.appearance, ui.details, ui.context];
    inputs.forEach(input => input.value = '');
    const selects = [ui.race, ui.gender, ui.job];
    selects.forEach(select => select.value = '');

    // Reset locks
    lockStates = { name: false, appearance: false, details: false };
    Object.keys(lockStates).forEach(field => {
        const btn = ui[`lock${capitalize(field)}Btn`];
        btn.dataset.locked = 'false';
        btn.setAttribute('aria-label', `Lock ${capitalize(field)}`);
    });

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
    ui.secretText.textContent = '(Click to reveal)';
    if (ui.secretText.dataset.secret) {
        delete ui.secretText.dataset.secret;
    }
    
    ui.copyFeedback.style.opacity = 0;
    setTimeout(() => { ui.copyFeedback.textContent = ''; }, 300);
}

// --- HISTORY & EXPORT FUNCTIONS ---

function saveNpc() {
    if (ui.outputName.textContent === "Your NPC Appears Here") {
        showCopyFeedback("Generate an NPC first!", true);
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
        id: Date.now()
    };
    
    savedNpcs.unshift(npc);
    localStorage.setItem('savedNpcs', JSON.stringify(savedNpcs));
    renderHistory();
    showCopyFeedback("NPC Saved!");
}

function renderHistory() {
    ui.historyList.innerHTML = '';
    if (savedNpcs.length === 0) {
        ui.historyList.innerHTML = '<p>No NPCs saved yet. Generate and save an NPC to see it here!</p>';
        ui.exportHistoryBtn.disabled = true;
        ui.clearHistoryBtn.disabled = true;
        return;
    }
    
    ui.exportHistoryBtn.disabled = false;
    ui.clearHistoryBtn.disabled = false;

    savedNpcs.forEach(npc => {
        const item = document.createElement('details');
        item.className = 'history-item';
        item.innerHTML = `
            <summary>
                <span class="expand-icon" aria-hidden="true">+</span>
                <div class="history-item-header">
                    <h3>${npc.name}</h3>
                    <p>${npc.subtitle}</p>
                </div>
                <button class="btn-delete-item" data-id="${npc.id}" title="Remove ${npc.name}">Remove</button>
            </summary>
            <div class="history-item-body">
                <div class="output-group"><strong>Appearance</strong><p>${npc.appearance}</p></div>
                <div class="output-group"><strong>Details</strong><p>${npc.details}</p></div>
                <hr>
                <div class="output-group"><strong>Voice & Mannerism</strong><p>${npc.voiceMannerism}</p></div>
                <div class="output-group"><strong>Hook</strong><p>${npc.hook}</p></div>
                <div class="output-group"><strong>Goal & Offer</strong><p>${npc.goalOffer}</p></div>
                <div class="output-group"><strong>Secret</strong><p>${npc.secret}</p></div>
            </div>
        `;

        const deleteBtn = item.querySelector('.btn-delete-item');
        deleteBtn.addEventListener('click', (e) => {
            e.preventDefault(); // Prevent details from toggling
            const npcId = parseInt(e.currentTarget.dataset.id, 10);
            if (!isNaN(npcId)) {
                deleteNpc(npcId);
            }
        });

        ui.historyList.appendChild(item);
    });
}

function loadHistory() {
    const historyData = localStorage.getItem('savedNpcs');
    if (historyData) {
        savedNpcs = JSON.parse(historyData);
    }
    renderHistory();
}

function deleteNpc(idToDelete) {
    savedNpcs = savedNpcs.filter(npc => npc.id !== idToDelete);
    localStorage.setItem('savedNpcs', JSON.stringify(savedNpcs));
    renderHistory();
}

function clearHistory() {
    if (savedNpcs.length === 0) return;
    if (confirm("Are you sure you want to delete all saved NPCs? This cannot be undone.")) {
        savedNpcs = [];
        localStorage.setItem('savedNpcs', JSON.stringify(savedNpcs));
        renderHistory();
        showCopyFeedback("History Cleared.");
    }
}

function showExportModal() { ui.exportModal.classList.add('visible'); }
function hideExportModal() { ui.exportModal.classList.remove('visible'); }

function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const downloadNode = document.createElement('a');
    downloadNode.href = url;
    downloadNode.download = filename;
    document.body.appendChild(downloadNode);
    downloadNode.click();
    downloadNode.remove();
    URL.revokeObjectURL(url);
}

function exportAsJson() {
    if (savedNpcs.length === 0) { showCopyFeedback("No history to export.", true); return; }
    const dataStr = JSON.stringify(savedNpcs, null, 2);
    downloadFile(dataStr, "instantforge_npc_history.json", "application/json");
    hideExportModal();
}

function exportAsCsv() {
    if (savedNpcs.length === 0) { showCopyFeedback("No history to export.", true); return; }
    const headers = ['name', 'subtitle', 'appearance', 'details', 'voiceMannerism', 'hook', 'goalOffer', 'secret'];
    const escapeCsv = (str) => `"${(str || '').replace(/"/g, '""').replace(/\r?\n|\r/g, ' ')}"`;
    let csvContent = headers.join(',') + '\n';
    savedNpcs.forEach(npc => {
        const row = headers.map(header => escapeCsv(npc[header]));
        csvContent += row.join(',') + '\n';
    });
    downloadFile(csvContent, "instantforge_npc_history.csv", "text/csv;charset=utf-8;");
    hideExportModal();
}

function exportAsMarkdown() {
    if (savedNpcs.length === 0) { showCopyFeedback("No history to export.", true); return; }
    const markdownContent = savedNpcs.map(npc => {
        return `## ${npc.name}\n*${npc.subtitle}*\n\n**Appearance**\n${npc.appearance}\n\n**Details**\n${npc.details}\n\n**Voice & Mannerism**\n${npc.voiceMannerism}\n\n**Hook**\n${npc.hook}\n\n**Goal & Offer**\n${npc.goalOffer}\n\n**Secret**\n${npc.secret}`;
    }).join('\n\n---\n\n');
    downloadFile(markdownContent, "instantforge_npc_history.md", "text/markdown;charset=utf-8;");
    hideExportModal();
}

function exportAsPdf() {
    if (savedNpcs.length === 0) { showCopyFeedback("No history to export.", true); return; }
    const npcHtml = savedNpcs.map(npc => `
        <div class="npc-page">
            <h2>${npc.name}</h2>
            <p class="subtitle"><em>${npc.subtitle}</em></p>
            <div class="output-group"><strong>Appearance</strong><p>${npc.appearance}</p></div>
            <div class="output-group"><strong>Details</strong><p>${npc.details}</p></div>
            <hr>
            <div class="output-group"><strong>Voice & Mannerism</strong><p>${npc.voiceMannerism}</p></div>
            <div class="output-group"><strong>Hook</strong><p>${npc.hook}</p></div>
            <div class="output-group"><strong>Goal & Offer</strong><p>${npc.goalOffer}</p></div>
            <div class="output-group"><strong>Secret</strong><p>${npc.secret}</p></div>
        </div>
    `).join('');

    const printStyles = `
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400..700;1,400..700&family=MedievalSharp&display=swap');
            body { font-family: 'Lora', serif; color: #333; }
            h1 { font-family: 'MedievalSharp', cursive; }
            h2 { font-family: 'MedievalSharp', cursive; font-size: 22pt; margin-bottom: 0; }
            .subtitle { font-size: 11pt; color: #666; margin-top: 0; }
            .output-group { margin-bottom: 1em; }
            .output-group strong { color: #8B0000; display: block; font-size: 10pt; text-transform: uppercase; letter-spacing: 1px; }
            .output-group p { margin: 0.25em 0 0 0; padding-left: 1em; border-left: 2px solid #ccc; }
            hr { border: 0; height: 1px; background: #ccc; margin: 1em 0; }
            .npc-page { page-break-inside: avoid; margin-bottom: 2em; border-bottom: 1px solid #ccc; padding-bottom: 1em; }
            @media print { .npc-page { border-bottom: none; } }
        </style>
    `;

    const htmlContent = `<!DOCTYPE html><html><head><title>InstantForge NPC History</title>${printStyles}</head><body><h1>Saved NPCs</h1>${npcHtml}</body></html>`;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); }, 250);
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


// --- EVENT LISTENERS & INITIALIZATION ---
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('npc-data.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        npcData = await response.json();

        populateSelects();
        loadHistory();
        setupLockButtons();
        
        ui.generateBtn.addEventListener('click', () => generateNpc(false));
        ui.randomizeBtn.addEventListener('click', () => generateNpc(true));
        ui.copyBtn.addEventListener('click', copyToClipboard);
        ui.saveBtn.addEventListener('click', saveNpc);
        ui.clearBtn.addEventListener('click', clearAll);
        ui.clearHistoryBtn.addEventListener('click', clearHistory);
        
        // Export modal listeners
        ui.exportHistoryBtn.addEventListener('click', showExportModal);
        ui.closeModalBtn.addEventListener('click', hideExportModal);
        ui.exportModal.addEventListener('click', (e) => { if (e.target === ui.exportModal) hideExportModal(); });
        ui.exportJsonBtn.addEventListener('click', exportAsJson);
        ui.exportCsvBtn.addEventListener('click', exportAsCsv);
        ui.exportMdBtn.addEventListener('click', exportAsMarkdown);
        ui.exportPdfBtn.addEventListener('click', exportAsPdf);

        ui.secretContainer.addEventListener('click', () => {
            if (ui.secretText.classList.contains('hidden') && ui.secretText.dataset.secret) {
                ui.secretText.textContent = ui.secretText.dataset.secret;
                ui.secretText.classList.remove('hidden');
                ui.secretText.classList.add('visible');
                ui.secretContainer.classList.add('revealed');
            }
        });

    } catch (error) {
        console.error("Could not load or parse npc-data.json", error);
        document.querySelector('main').innerHTML = `<p style="color: white; text-align: center; font-size: 1.2rem;">Error: Could not load required game data. Please refresh the page.</p>`;
    }
});