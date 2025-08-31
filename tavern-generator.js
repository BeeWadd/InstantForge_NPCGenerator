console.log("InstantForge: Taverns script loaded.");
let tavernData;
let savedTaverns = [];
let currentPatrons = [];
let currentInnkeeper = "";
let npcDataForPatrons;

// --- CONSTANTS ---
const iconLockOpenSVG = `<svg class="icon-lock-open" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path></svg>`;
const iconLockClosedSVG = `<svg class="icon-lock-closed" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>`;

// --- STATE ---
let lockStates = {
    name: false,
    description: false,
    signatureDrink: false,
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
    patrons: [],
    rumors: [],
    innkeeperPersonalities: [],
    innkeeperQuirks: [],
};

function pickUnique(arr, historyKey) {
    if (!arr || arr.length === 0) return "";
    
    if (!generationHistory[historyKey]) {
        generationHistory[historyKey] = [];
    }
    const historyQueue = generationHistory[historyKey];
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
    tavernType: document.getElementById('tavern-type'),
    quality: document.getElementById('quality'),
    name: document.getElementById('name'),
    description: document.getElementById('description'),
    signatureDrink: document.getElementById('signature-drink'),
    generateBtn: document.getElementById('generate'),
    randomizeBtn: document.getElementById('randomize'),
    copyBtn: document.getElementById('copy'),
    saveBtn: document.getElementById('save'),
    clearBtn: document.getElementById('clear'),
    copyFeedback: document.getElementById('copy-feedback'),
    outputName: document.getElementById('output-name'),
    outputSubtitle: document.getElementById('output-subtitle'),
    outputDescription: document.getElementById('output-description'),
    outputInnkeeper: document.getElementById('output-innkeeper'),
    outputSignatureDrink: document.getElementById('output-signature-drink'),
    outputPatrons: document.getElementById('output-patrons'),
    rumorsContainer: document.getElementById('rumors-container'),
    rumorsText: document.getElementById('rumors-text'),
    historyList: document.getElementById('history-list'),
    clearHistoryBtn: document.getElementById('clear-history'),
    exportHistoryBtn: document.getElementById('export-history'),
    exportModal: document.getElementById('export-modal'),
    closeModalBtn: document.getElementById('close-modal'),
    exportJsonBtn: document.getElementById('export-json'),
    exportCsvBtn: document.getElementById('export-csv'),
    exportMdBtn: document.getElementById('export-md'),
    exportPdfBtn: document.getElementById('export-pdf'),
    generatePatronsBtn: document.getElementById('generate-patrons'),
    generateInnkeeperBtn: document.getElementById('generate-innkeeper'),
    // Lock buttons
    lockNameBtn: document.getElementById('lock-name'),
    lockDescriptionBtn: document.getElementById('lock-description'),
    lockSignatureDrinkBtn: document.getElementById('lock-signature-drink'),
};

// --- GENERATION LOGIC ---
function generateName() {
    const templates = tavernData.nameTemplates;
    const template = pick(templates.patterns);
    
    let result = template;

    if (template.includes('{noun}')) {
        const noun1 = pick(templates.nouns);
        result = result.replace('{noun}', noun1);
        if (template.includes('{noun2}')) {
            let noun2 = pick(templates.noun2);
            while (noun1 === noun2) {
                noun2 = pick(templates.noun2);
            }
            result = result.replace('{noun2}', noun2);
        }
    }

    if (template.includes('{adjective}')) {
        result = result.replace('{adjective}', pick(templates.adjectives));
    }
    if (template.includes('{ownerName}')) {
        result = result.replace('{ownerName}', pick(templates.ownerNames));
    }
    if (template.includes('{establishment}')) {
        result = result.replace('{establishment}', pick(templates.establishments));
    }

    return result;
}

function generateDescription(tavernType, quality) {
    const descriptions = tavernData.descriptions[tavernType][quality];
    return descriptions ? pick(descriptions) : "A non-descript drinking hole.";
}

function generateInnkeeper() {
    const personality = pickUnique(tavernData.innkeepers.personalities, 'innkeeperPersonalities');
    const quirk = pickUnique(tavernData.innkeepers.quirks, 'innkeeperQuirks');
    return `The innkeeper is ${personality} and ${quirk}.`;
}

function generateSignatureDrink(quality) {
    const drinks = tavernData.signature_drinks[quality];
    return drinks ? pick(drinks) : "Watered-down ale.";
}

function generateTavern(forceRandomize = false) {
    const tavernType = (forceRandomize || !ui.tavernType.value) ? pick(tavernData.types) : ui.tavernType.value;
    const quality = (forceRandomize || !ui.quality.value) ? pick(tavernData.qualities) : ui.quality.value;

    const name = !lockStates.name ? generateName() : ui.name.value;
    const description = !lockStates.description ? generateDescription(tavernType, quality) : ui.description.value;
    const signatureDrink = !lockStates.signatureDrink ? generateSignatureDrink(quality) : ui.signatureDrink.value;
    
    ui.tavernType.value = tavernType;
    ui.quality.value = quality;
    ui.name.value = name;
    ui.description.value = description;
    ui.signatureDrink.value = signatureDrink;

    const innkeeper = generateInnkeeper();
    const patrons = sample(tavernData.patrons.filter(p => !generationHistory.patrons.includes(p)), 3);
    
    currentInnkeeper = innkeeper;
    currentPatrons = [...patrons]; 
    patrons.forEach(p => pickUnique([p], 'patrons')); 
    
    const rumor = pickUnique(tavernData.rumors, 'rumors');
    
    ui.outputName.textContent = name;
    ui.outputSubtitle.textContent = `${quality} ${tavernType}`;
    ui.outputDescription.textContent = description;
    ui.outputInnkeeper.textContent = innkeeper;
    ui.outputSignatureDrink.textContent = signatureDrink;
    ui.outputPatrons.textContent = patrons.join(' ');
    
    ui.rumorsText.classList.remove('visible');
    ui.rumorsText.classList.add('hidden');
    ui.rumorsContainer.classList.remove('revealed');
    
    ui.rumorsText.textContent = "(Click to reveal)";
    ui.rumorsText.dataset.rumor = rumor;

    ui.generatePatronsBtn.disabled = false;
    ui.generateInnkeeperBtn.disabled = false;
}

function populateSelects() {
    tavernData.types.forEach(type => {
        const option = document.createElement('option');
        option.value = type;
        option.textContent = type;
        ui.tavernType.appendChild(option);
    });
    tavernData.qualities.forEach(qual => {
        const option = document.createElement('option');
        option.value = qual;
        option.textContent = qual;
        ui.quality.appendChild(option);
    });
}

function copyToClipboard() {
    const name = ui.outputName.textContent;
    if (name === "Your Tavern Awaits") {
        showCopyFeedback("Generate a tavern first!", true);
        return;
    }

    const textToCopy = `
Name: ${name}
${ui.outputSubtitle.textContent}
---
Description: ${ui.outputDescription.textContent}
Innkeeper: ${ui.outputInnkeeper.textContent}
Signature Drink: ${ui.outputSignatureDrink.textContent}
---
Patrons: ${ui.outputPatrons.textContent}
Rumor: ${ui.rumorsText.dataset.rumor || "(hidden)"}
    `.trim().replace(/^\s+/gm, '');

    navigator.clipboard.writeText(textToCopy).then(() => {
        showCopyFeedback("Copied to clipboard!");
    }, () => {
        showCopyFeedback("Failed to copy.", true);
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

function clearAll() {
    const inputs = [ui.name, ui.description, ui.signatureDrink];
    inputs.forEach(input => input.value = '');
    const selects = [ui.tavernType, ui.quality];
    selects.forEach(select => select.value = '');

    lockStates = { name: false, description: false, signatureDrink: false };
    Object.keys(lockStates).forEach(field => {
        const key = `lock${capitalize(field)}Btn`;
        if (ui[key]) {
            ui[key].dataset.locked = 'false';
            ui[key].setAttribute('aria-label', `Lock ${capitalize(field)}`);
        }
    });

    ui.outputName.textContent = 'Your Tavern Awaits';
    ui.outputSubtitle.textContent = '';
    ui.outputDescription.textContent = '';
    ui.outputInnkeeper.textContent = '';
    ui.outputSignatureDrink.textContent = '';
    ui.outputPatrons.textContent = '';
    
    ui.rumorsText.classList.remove('visible');
    ui.rumorsText.classList.add('hidden');
    ui.rumorsContainer.classList.remove('revealed');
    ui.rumorsText.textContent = '(Click to reveal)';
    if (ui.rumorsText.dataset.rumor) {
        delete ui.rumorsText.dataset.rumor;
    }
    
    currentPatrons = [];
    currentInnkeeper = "";
    ui.generatePatronsBtn.disabled = true;
    ui.generateInnkeeperBtn.disabled = true;

    ui.copyFeedback.style.opacity = 0;
    setTimeout(() => { ui.copyFeedback.textContent = ''; }, 300);
}

// --- HISTORY & EXPORT FUNCTIONS ---

function saveTavern() {
    if (ui.outputName.textContent === "Your Tavern Awaits") {
        showCopyFeedback("Generate a tavern first!", true);
        return;
    }
    const tavern = {
        name: ui.outputName.textContent,
        subtitle: ui.outputSubtitle.textContent,
        description: ui.outputDescription.textContent,
        innkeeper: ui.outputInnkeeper.textContent,
        signatureDrink: ui.outputSignatureDrink.textContent,
        patrons: ui.outputPatrons.textContent,
        rumor: ui.rumorsText.dataset.rumor,
        id: Date.now()
    };
    
    savedTaverns.unshift(tavern);
    localStorage.setItem('savedTaverns', JSON.stringify(savedTaverns));
    renderHistory();
    showCopyFeedback("Tavern Saved!");
}

function renderHistory() {
    ui.historyList.innerHTML = '';
    if (savedTaverns.length === 0) {
        ui.historyList.innerHTML = '<p>No taverns saved yet. Generate and save a tavern to see it here!</p>';
        ui.exportHistoryBtn.disabled = true;
        ui.clearHistoryBtn.disabled = true;
        return;
    }
    
    ui.exportHistoryBtn.disabled = false;
    ui.clearHistoryBtn.disabled = false;

    savedTaverns.forEach(tavern => {
        const item = document.createElement('details');
        item.className = 'history-item';
        item.innerHTML = `
            <summary>
                <span class="expand-icon" aria-hidden="true">+</span>
                <div class="history-item-header">
                    <h3>${tavern.name}</h3>
                    <p>${tavern.subtitle}</p>
                </div>
                <button class="btn-delete-item" data-id="${tavern.id}" title="Remove ${tavern.name}">Remove</button>
            </summary>
            <div class="history-item-body">
                <div class="output-group"><strong>Description</strong><p>${tavern.description}</p></div>
                <div class="output-group"><strong>Innkeeper</strong><p>${tavern.innkeeper}</p></div>
                <div class="output-group"><strong>Signature Drink</strong><p>${tavern.signatureDrink}</p></div>
                <hr>
                <div class="output-group"><strong>Patrons</strong><p>${tavern.patrons}</p></div>
                <div class="output-group"><strong>Rumor</strong><p>${tavern.rumor}</p></div>
            </div>
        `;

        const deleteBtn = item.querySelector('.btn-delete-item');
        deleteBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const tavernId = parseInt(e.currentTarget.dataset.id, 10);
            if (!isNaN(tavernId)) {
                deleteTavern(tavernId);
            }
        });

        ui.historyList.appendChild(item);
    });
}


function loadHistory() {
    const historyData = localStorage.getItem('savedTaverns');
    if (historyData) {
        savedTaverns = JSON.parse(historyData);
    }
    renderHistory();
}

function deleteTavern(idToDelete) {
    savedTaverns = savedTaverns.filter(tavern => tavern.id !== idToDelete);
    localStorage.setItem('savedTaverns', JSON.stringify(savedTaverns));
    renderHistory();
}

function clearHistory() {
    if (savedTaverns.length === 0) return;
    if (confirm("Are you sure you want to delete all saved taverns? This cannot be undone.")) {
        savedTaverns = [];
        localStorage.setItem('savedTaverns', JSON.stringify(savedTaverns));
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
    if (savedTaverns.length === 0) { showCopyFeedback("No history to export.", true); return; }
    const dataStr = JSON.stringify(savedTaverns, null, 2);
    downloadFile(dataStr, "instantforge_tavern_history.json", "application/json");
    hideExportModal();
}

function exportAsCsv() {
    if (savedTaverns.length === 0) { showCopyFeedback("No history to export.", true); return; }
    const headers = ['name', 'subtitle', 'description', 'innkeeper', 'signatureDrink', 'patrons', 'rumor'];
    const escapeCsv = (str) => `"${(str || '').replace(/"/g, '""').replace(/\r?\n|\r/g, ' ')}"`;
    let csvContent = headers.join(',') + '\n';
    savedTaverns.forEach(tavern => {
        const row = headers.map(header => escapeCsv(tavern[header]));
        csvContent += row.join(',') + '\n';
    });
    downloadFile(csvContent, "instantforge_tavern_history.csv", "text/csv;charset=utf-8;");
    hideExportModal();
}

function exportAsMarkdown() {
    if (savedTaverns.length === 0) { showCopyFeedback("No history to export.", true); return; }
    const markdownContent = savedTaverns.map(tavern => {
        return `## ${tavern.name}\n*${tavern.subtitle}*\n\n**Description**\n${tavern.description}\n\n**Innkeeper**\n${tavern.innkeeper}\n\n**Signature Drink**\n${tavern.signatureDrink}\n\n**Patrons**\n${tavern.patrons}\n\n**Rumor**\n${tavern.rumor}`;
    }).join('\n\n---\n\n');
    downloadFile(markdownContent, "instantforge_tavern_history.md", "text/markdown;charset=utf-8;");
    hideExportModal();
}

function exportAsPdf() {
    if (savedTaverns.length === 0) { showCopyFeedback("No history to export.", true); return; }
    const tavernHtml = savedTaverns.map(tavern => `
        <div class="tavern-page">
            <h2>${tavern.name}</h2>
            <p class="subtitle"><em>${tavern.subtitle}</em></p>
            <div class="output-group"><strong>Description</strong><p>${tavern.description}</p></div>
            <div class="output-group"><strong>Innkeeper</strong><p>${tavern.innkeeper}</p></div>
            <div class="output-group"><strong>Signature Drink</strong><p>${tavern.signatureDrink}</p></div>
            <hr>
            <div class="output-group"><strong>Patrons</strong><p>${tavern.patrons}</p></div>
            <div class="output-group"><strong>Rumor</strong><p>${tavern.rumor}</p></div>
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
            .tavern-page { page-break-inside: avoid; margin-bottom: 2em; border-bottom: 1px solid #ccc; padding-bottom: 1em; }
            @media print { .tavern-page { border-bottom: none; } }
        </style>
    `;
    const htmlContent = `<!DOCTYPE html><html><head><title>InstantForge Tavern History</title>${printStyles}</head><body><h1>Saved Taverns</h1>${tavernHtml}</body></html>`;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); }, 250);
    hideExportModal();
}

function setupLockButtons() {
    Object.keys(lockStates).forEach(field => {
        const key = `lock${capitalize(field)}Btn`;
        if (ui[key]) {
            const btn = ui[key];
            btn.innerHTML = iconLockOpenSVG + iconLockClosedSVG;
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                lockStates[field] = !lockStates[field];
                btn.dataset.locked = lockStates[field];
                const action = lockStates[field] ? 'Unlock' : 'Lock';
                btn.setAttribute('aria-label', `${action} ${capitalize(field)}`);
            });
        }
    });
}

function generateInnkeeperAsNpc() {
    if (!currentInnkeeper) {
        showCopyFeedback("Generate a tavern with an innkeeper first!", true);
        return;
    }
    if (!npcDataForPatrons || !npcDataForPatrons.jobs || !npcDataForPatrons.races) {
        showCopyFeedback("NPC data not ready. Please try again in a moment.", true);
        return;
    }

    const newNpcsToQueue = [{
        quantity: 1,
        race: '', 
        job: 'Innkeeper',
        appearance: currentInnkeeper
    }];

    const existingQueue = JSON.parse(sessionStorage.getItem('pendingNpcsForGeneration')) || [];
    const combinedQueue = existingQueue.concat(newNpcsToQueue);
    
    sessionStorage.setItem('pendingNpcsForGeneration', JSON.stringify(combinedQueue));
    
    const totalQueued = combinedQueue.reduce((acc, curr) => acc + curr.quantity, 0);
    showCopyFeedback(`Innkeeper added to queue! ${totalQueued} total now in queue.`);
}

function generatePatronsAsNpcs() {
    if (!currentPatrons || currentPatrons.length === 0) {
        showCopyFeedback("Generate a tavern with patrons first!", true);
        return;
    }
    if (!npcDataForPatrons || !npcDataForPatrons.jobs || !npcDataForPatrons.races) {
        showCopyFeedback("NPC data not ready. Please try again in a moment.", true);
        return;
    }

    const patronsToQueue = currentPatrons.map(patronString => {
        const lowerPatronString = patronString.toLowerCase();
        let npcInfo = {
            quantity: 1,
            race: '',
            job: '',
            appearance: patronString
        };

        const sortedRaces = [...npcDataForPatrons.races].sort((a,b) => b.length - a.length);
        for (const race of sortedRaces) {
            if (lowerPatronString.includes(race.replace('_', ' '))) {
                npcInfo.race = race;
                break;
            }
        }
        
        const sortedJobs = [...npcDataForPatrons.jobs].sort((a, b) => b.length - a.length);
        for (const job of sortedJobs) {
            const jobRegex = new RegExp(`\\b${job.toLowerCase()}\\b`);
            if (jobRegex.test(lowerPatronString)) {
                npcInfo.job = job;
                break;
            }
        }
        return npcInfo;
    });

    const existingQueue = JSON.parse(sessionStorage.getItem('pendingNpcsForGeneration')) || [];
    const combinedQueue = existingQueue.concat(patronsToQueue);
    
    sessionStorage.setItem('pendingNpcsForGeneration', JSON.stringify(combinedQueue));
    
    const totalQueued = combinedQueue.reduce((acc, curr) => acc + curr.quantity, 0);
    const addedCount = patronsToQueue.length;
    showCopyFeedback(`${addedCount} patrons added to queue! ${totalQueued} total now in queue.`);
}


// --- EVENT LISTENERS & INITIALIZATION ---
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('tavern-data.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        tavernData = await response.json();

        // Fetch NPC data for patron generation
        try {
            const npcResponse = await fetch('npc-data.json');
            if (npcResponse.ok) {
                npcDataForPatrons = await npcResponse.json();
            } else {
                throw new Error('Failed to fetch npc-data.json');
            }
        } catch (e) {
            console.error("Could not load npc-data for patrons.", e);
            ui.generatePatronsBtn.title = "Could not load NPC data.";
            ui.generatePatronsBtn.disabled = true;
            ui.generateInnkeeperBtn.title = "Could not load NPC data.";
            ui.generateInnkeeperBtn.disabled = true;
        }

        populateSelects();
        loadHistory();
        setupLockButtons();
        
        ui.generateBtn.addEventListener('click', () => generateTavern(false));
        ui.randomizeBtn.addEventListener('click', () => generateTavern(true));
        ui.copyBtn.addEventListener('click', copyToClipboard);
        ui.saveBtn.addEventListener('click', saveTavern);
        ui.clearBtn.addEventListener('click', clearAll);
        ui.clearHistoryBtn.addEventListener('click', clearHistory);
        ui.generatePatronsBtn.addEventListener('click', generatePatronsAsNpcs);
        ui.generateInnkeeperBtn.addEventListener('click', generateInnkeeperAsNpc);
        
        ui.exportHistoryBtn.addEventListener('click', showExportModal);
        ui.closeModalBtn.addEventListener('click', hideExportModal);
        ui.exportModal.addEventListener('click', (e) => { if (e.target === ui.exportModal) hideExportModal(); });
        ui.exportJsonBtn.addEventListener('click', exportAsJson);
        ui.exportCsvBtn.addEventListener('click', exportAsCsv);
        ui.exportMdBtn.addEventListener('click', exportAsMarkdown);
        ui.exportPdfBtn.addEventListener('click', exportAsPdf);

        ui.rumorsContainer.addEventListener('click', () => {
            if (ui.rumorsText.classList.contains('hidden') && ui.rumorsText.dataset.rumor) {
                ui.rumorsText.textContent = ui.rumorsText.dataset.rumor;
                ui.rumorsText.classList.remove('hidden');
                ui.rumorsText.classList.add('visible');
                ui.rumorsContainer.classList.add('revealed');
            }
        });

    } catch (error) {
        console.error("Could not load or parse tavern-data.json", error);
        document.querySelector('main').innerHTML = `<p style="color: white; text-align: center; font-size: 1.2rem;">Error: Could not load required game data. Please refresh the page.</p>`;
    }
});