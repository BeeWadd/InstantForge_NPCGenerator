
console.log("InstantForge: Magic Items script loaded.");
let itemData;
let savedItems = [];

// --- CONSTANTS ---
const iconLockOpenSVG = `<svg class="icon-lock-open" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path></svg>`;
const iconLockClosedSVG = `<svg class="icon-lock-closed" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>`;

// --- STATE ---
let lockStates = {
    name: false,
    description: false,
    history: false,
};

// --- UTILITY FUNCTIONS ---
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const capitalize = (str) => str ? str.charAt(0).toUpperCase() + str.slice(1) : '';

// --- DOM ELEMENTS ---
const ui = {
    itemType: document.getElementById('item-type'),
    powerLevel: document.getElementById('power-level'),
    name: document.getElementById('name'),
    description: document.getElementById('description'),
    history: document.getElementById('history'),
    generateBtn: document.getElementById('generate'),
    randomizeBtn: document.getElementById('randomize'),
    copyBtn: document.getElementById('copy'),
    saveBtn: document.getElementById('save'),
    clearBtn: document.getElementById('clear'),
    copyFeedback: document.getElementById('copy-feedback'),
    outputName: document.getElementById('output-name'),
    outputSubtitle: document.getElementById('output-subtitle'),
    outputDescription: document.getElementById('output-description'),
    outputPowers: document.getElementById('output-powers'),
    outputHistory: document.getElementById('output-history'),
    curseContainer: document.getElementById('curse-container'),
    curseText: document.getElementById('curse-text'),
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
    lockDescriptionBtn: document.getElementById('lock-description'),
    lockHistoryBtn: document.getElementById('lock-history'),
};

// --- GENERATION LOGIC ---

function generateName(itemType, power) {
    const itemInfo = itemData.itemData[itemType];
    if (!itemInfo || !itemInfo.nameTemplates) return "Unnamed Item";
    
    const template = pick(itemInfo.nameTemplates);
    let name = template;

    if (template.includes('{subtype}')) {
        name = name.replace('{subtype}', pick(itemInfo.subtypes));
    }
    if (template.includes('{adjective}')) {
        name = name.replace('{adjective}', pick(itemInfo.adjectives));
    }
    if (template.includes('{effectWord}')) {
        name = name.replace('{effectWord}', power.name);
    }
    if (template.includes('{creatorName}')) {
        name = name.replace('{creatorName}', pick(itemInfo.creatorNames));
    }
    return name;
}

function generateDescription(itemType) {
    const itemInfo = itemData.itemData[itemType];
    const subtype = pick(itemInfo.subtypes);
    const material = pick(itemInfo.materials);
    const visual = pick(itemInfo.visuals);
    return `A ${subtype} made of ${material} that ${visual}.`;
}

function generateHistory() {
    const creator = pick(itemData.creators);
    const history = pick(itemData.histories);
    return `This item was created by ${creator} and was once ${history}.`;
}

function generateItem(forceRandomize = false) {
    const itemType = (forceRandomize || !ui.itemType.value) ? pick(itemData.types) : ui.itemType.value;
    const powerLevel = (forceRandomize || !ui.powerLevel.value) ? pick(itemData.powerLevels) : ui.powerLevel.value;
    
    const itemInfo = itemData.itemData[itemType];
    const powerInfo = itemInfo.powers[powerLevel];

    if (!powerInfo || powerInfo.length === 0) {
        console.warn(`No power data for ${itemType} at ${powerLevel}. Falling back.`);
        generateItem(true); // Force a full randomize to find a valid combo
        return;
    }

    const power = pick(powerInfo);
    
    const name = !lockStates.name ? generateName(itemType, power) : ui.name.value;
    const description = !lockStates.description ? generateDescription(itemType) : ui.description.value;
    const history = !lockStates.history ? generateHistory() : ui.history.value;
    
    ui.itemType.value = itemType;
    ui.powerLevel.value = powerLevel;
    ui.name.value = name;
    ui.description.value = description;
    ui.history.value = history;

    const powers = power.description;
    
    const curseChance = { "Common": 0, "Uncommon": 0.1, "Rare": 0.25, "Very Rare": 0.4, "Legendary": 0.5 };
    let curse = "None.";
    if (Math.random() < (curseChance[powerLevel] || 0)) {
        curse = pick(itemData.curses);
    }
    
    ui.outputName.textContent = name;
    ui.outputSubtitle.textContent = `${powerLevel} ${itemType}`;
    ui.outputDescription.textContent = description;
    ui.outputPowers.textContent = powers;
    ui.outputHistory.textContent = history;
    
    ui.curseText.classList.remove('visible');
    ui.curseText.classList.add('hidden');
    ui.curseContainer.classList.remove('revealed');
    
    ui.curseText.textContent = "(Click to reveal)";
    ui.curseText.dataset.curse = curse;
}

function populateSelects() {
    itemData.types.forEach(type => {
        const option = document.createElement('option');
        option.value = type;
        option.textContent = type;
        ui.itemType.appendChild(option);
    });
    itemData.powerLevels.forEach(level => {
        const option = document.createElement('option');
        option.value = level;
        option.textContent = level;
        ui.powerLevel.appendChild(option);
    });
}

function copyToClipboard() {
    const name = ui.outputName.textContent;
    if (name === "Your Item Appears Here") {
        showCopyFeedback("Generate an item first!", true);
        return;
    }

    const textToCopy = `
Name: ${name}
${ui.outputSubtitle.textContent}
---
Description: ${ui.outputDescription.textContent}
Powers: ${ui.outputPowers.textContent}
---
History: ${ui.outputHistory.textContent}
Curse: ${ui.curseText.dataset.curse || "(hidden)"}
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
    const inputs = [ui.name, ui.description, ui.history];
    inputs.forEach(input => input.value = '');
    const selects = [ui.itemType, ui.powerLevel];
    selects.forEach(select => select.value = '');

    lockStates = { name: false, description: false, history: false };
    Object.keys(lockStates).forEach(field => {
        const btn = ui[`lock${capitalize(field)}Btn`];
        btn.dataset.locked = 'false';
        btn.setAttribute('aria-label', `Lock ${capitalize(field)}`);
    });

    ui.outputName.textContent = 'Your Item Appears Here';
    ui.outputSubtitle.textContent = '';
    ui.outputDescription.textContent = '';
    ui.outputPowers.textContent = '';
    ui.outputHistory.textContent = '';
    
    ui.curseText.classList.remove('visible');
    ui.curseText.classList.add('hidden');
    ui.curseContainer.classList.remove('revealed');
    ui.curseText.textContent = '(Click to reveal)';
    if (ui.curseText.dataset.curse) {
        delete ui.curseText.dataset.curse;
    }
    
    ui.copyFeedback.style.opacity = 0;
    setTimeout(() => { ui.copyFeedback.textContent = ''; }, 300);
}

// --- HISTORY & EXPORT FUNCTIONS ---

function saveItem() {
    if (ui.outputName.textContent === "Your Item Appears Here") {
        showCopyFeedback("Generate an item first!", true);
        return;
    }
    const item = {
        name: ui.outputName.textContent,
        subtitle: ui.outputSubtitle.textContent,
        description: ui.outputDescription.textContent,
        powers: ui.outputPowers.textContent,
        history: ui.outputHistory.textContent,
        curse: ui.curseText.dataset.curse,
        id: Date.now()
    };
    
    savedItems.unshift(item);
    localStorage.setItem('savedMagicItems', JSON.stringify(savedItems));
    renderHistory();
    showCopyFeedback("Item Saved!");
}

function renderHistory() {
    ui.historyList.innerHTML = '';
    if (savedItems.length === 0) {
        ui.historyList.innerHTML = '<p>No items saved yet. Generate and save an item to see it here!</p>';
        ui.exportHistoryBtn.disabled = true;
        ui.clearHistoryBtn.disabled = true;
        return;
    }
    
    ui.exportHistoryBtn.disabled = false;
    ui.clearHistoryBtn.disabled = false;

    savedItems.forEach(item => {
        const element = document.createElement('details');
        element.className = 'history-item';
        element.innerHTML = `
            <summary>
                <span class="expand-icon" aria-hidden="true">+</span>
                <div class="history-item-header">
                    <h3>${item.name}</h3>
                    <p>${item.subtitle}</p>
                </div>
                <button class="btn-delete-item" data-id="${item.id}" title="Remove ${item.name}">Remove</button>
            </summary>
            <div class="history-item-body">
                <div class="output-group"><strong>Description</strong><p>${item.description}</p></div>
                <div class="output-group"><strong>Powers</strong><p>${item.powers}</p></div>
                <hr>
                <div class="output-group"><strong>History</strong><p>${item.history}</p></div>
                <div class="output-group"><strong>Curse</strong><p>${item.curse}</p></div>
            </div>
        `;
        ui.historyList.appendChild(element);
    });
}

function loadHistory() {
    const historyData = localStorage.getItem('savedMagicItems');
    if (historyData) {
        savedItems = JSON.parse(historyData);
    }
    renderHistory();
}

function deleteItem(idToDelete) {
    savedItems = savedItems.filter(item => item.id !== idToDelete);
    localStorage.setItem('savedMagicItems', JSON.stringify(savedItems));
    renderHistory();
}

function clearHistory() {
    if (savedItems.length === 0) return;
    if (confirm("Are you sure you want to delete all saved items? This cannot be undone.")) {
        savedItems = [];
        localStorage.setItem('savedMagicItems', JSON.stringify(savedItems));
        renderHistory();
        showCopyFeedback("History Cleared.");
    }
}

function showExportModal() { ui.exportModal.classList.add('visible'); }
function hideExportModal() { ui.exportModal.classList.remove('visible'); }

function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

function exportAsJson() {
    if (savedItems.length === 0) { showCopyFeedback("No history to export.", true); return; }
    const dataStr = JSON.stringify(savedItems, null, 2);
    downloadFile(dataStr, "instantforge_item_history.json", "application/json");
    hideExportModal();
}

function exportAsCsv() {
    if (savedItems.length === 0) { showCopyFeedback("No history to export.", true); return; }
    const headers = ['name', 'subtitle', 'description', 'powers', 'history', 'curse'];
    const escapeCsv = (str) => `"${(str || '').replace(/"/g, '""').replace(/\r?\n|\r/g, ' ')}"`;
    let csvContent = headers.join(',') + '\n';
    savedItems.forEach(item => {
        const row = headers.map(header => escapeCsv(item[header]));
        csvContent += row.join(',') + '\n';
    });
    downloadFile(csvContent, "instantforge_item_history.csv", "text/csv;charset=utf-8;");
    hideExportModal();
}

function exportAsMarkdown() {
    if (savedItems.length === 0) { showCopyFeedback("No history to export.", true); return; }
    const markdownContent = savedItems.map(item => {
        return `## ${item.name}\n*${item.subtitle}*\n\n**Description**\n${item.description}\n\n**Powers**\n${item.powers}\n\n**History**\n${item.history}\n\n**Curse**\n${item.curse}`;
    }).join('\n\n---\n\n');
    downloadFile(markdownContent, "instantforge_item_history.md", "text/markdown;charset=utf-8;");
    hideExportModal();
}

function exportAsPdf() {
    if (savedItems.length === 0) { showCopyFeedback("No history to export.", true); return; }
    const itemHtml = savedItems.map(item => `
        <div class="item-page">
            <h2>${item.name}</h2>
            <p class="subtitle"><em>${item.subtitle}</em></p>
            <div class="output-group"><strong>Description</strong><p>${item.description}</p></div>
            <div class="output-group"><strong>Powers</strong><p>${item.powers}</p></div>
            <hr>
            <div class="output-group"><strong>History</strong><p>${item.history}</p></div>
            <div class="output-group"><strong>Curse</strong><p>${item.curse}</p></div>
        </div>
    `).join('');

    const printStyles = `<style>
        @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400..700;1,400..700&family=MedievalSharp&display=swap');
        body { font-family: 'Lora', serif; color: #333; }
        h1, h2 { font-family: 'MedievalSharp', cursive; }
        h2 { font-size: 22pt; margin-bottom: 0; }
        .subtitle { font-size: 11pt; color: #666; margin-top: 0; }
        .output-group { margin-bottom: 1em; }
        .output-group strong { color: #8B0000; display: block; font-size: 10pt; text-transform: uppercase; letter-spacing: 1px; }
        .output-group p { margin: 0.25em 0 0 0; padding-left: 1em; border-left: 2px solid #ccc; }
        hr { border: 0; height: 1px; background: #ccc; margin: 1em 0; }
        .item-page { page-break-inside: avoid; margin-bottom: 2em; border-bottom: 1px solid #ccc; padding-bottom: 1em; }
        @media print { .item-page { border-bottom: none; } }
    </style>`;

    const htmlContent = `<!DOCTYPE html><html><head><title>InstantForge Item History</title>${printStyles}</head><body><h1>Saved Magic Items</h1>${itemHtml}</body></html>`;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); }, 250);
    hideExportModal();
}

function setupLockButtons() {
    const lockableFields = ['name', 'description', 'history'];
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
        const response = await fetch('magic-item-data.json');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        itemData = await response.json();

        populateSelects();
        loadHistory();
        setupLockButtons();
        
        ui.generateBtn.addEventListener('click', () => generateItem(false));
        ui.randomizeBtn.addEventListener('click', () => generateItem(true));
        ui.copyBtn.addEventListener('click', copyToClipboard);
        ui.saveBtn.addEventListener('click', saveItem);
        ui.clearBtn.addEventListener('click', clearAll);
        ui.clearHistoryBtn.addEventListener('click', clearHistory);
        
        ui.historyList.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-delete-item')) {
                e.preventDefault();
                const itemId = parseInt(e.target.dataset.id, 10);
                if (!isNaN(itemId)) deleteItem(itemId);
            }
        });

        ui.exportHistoryBtn.addEventListener('click', showExportModal);
        ui.closeModalBtn.addEventListener('click', hideExportModal);
        ui.exportModal.addEventListener('click', (e) => { if (e.target === ui.exportModal) hideExportModal(); });
        ui.exportJsonBtn.addEventListener('click', exportAsJson);
        ui.exportCsvBtn.addEventListener('click', exportAsCsv);
        ui.exportMdBtn.addEventListener('click', exportAsMarkdown);
        ui.exportPdfBtn.addEventListener('click', exportAsPdf);

        ui.curseContainer.addEventListener('click', () => {
            if (ui.curseText.classList.contains('hidden') && ui.curseText.dataset.curse) {
                ui.curseText.textContent = ui.curseText.dataset.curse;
                ui.curseText.classList.remove('hidden');
                ui.curseText.classList.add('visible');
                ui.curseContainer.classList.add('revealed');
            }
        });

    } catch (error) {
        console.error("Could not load or parse magic-item-data.json", error);
        document.querySelector('main').innerHTML = `<p style="color: white; text-align: center; font-size: 1.2rem;">Error: Could not load required game data. Please refresh the page.</p>`;
    }
});
