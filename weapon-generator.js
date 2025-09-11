console.log("InstantForge: Weapons script loaded.");
let weaponData;
let savedWeapons = [];

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
    weaponType: document.getElementById('weapon-type'),
    quality: document.getElementById('quality'),
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
    outputProperties: document.getElementById('output-properties'),
    outputHistory: document.getElementById('output-history'),
    featureContainer: document.getElementById('feature-container'),
    featureText: document.getElementById('feature-text'),
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

function generateName(subtype, quality, property) {
    const templates = weaponData.nameTemplates;
    const template = pick(templates.patterns);
    
    let result = template;

    if (template.includes('{subtype}')) {
        result = result.replace('{subtype}', subtype);
    }
    if (template.includes('{adjective}')) {
        let adjective = pick(templates.adjectives);
        // If magical, maybe use the property name
        if (quality === 'Magical' && property && Math.random() > 0.5) {
            adjective = property.name;
        }
        result = result.replace('{adjective}', adjective);
    }
     if (template.includes('{adjective2}')) {
        result = result.replace('{adjective2}', pick(templates.adjective2));
    }
    if (template.includes('{noun}')) {
        result = result.replace('{noun}', pick(templates.nouns));
    }
    if (template.includes('{creator}')) {
        result = result.replace('{creator}', pick(templates.creators));
    }

    return result;
}

function generateDescription(subtype, quality) {
    const c = weaponData.components;
    const isRanged = ["Ranged"].includes(ui.weaponType.value);
    
    let parts = [];
    if (isRanged) {
        parts.push(`a stock of ${pick(c.haftMaterials.wood)}`);
    } else {
        const bladeMat = Math.random() > 0.8 ? pick(c.bladeMaterials.exotic) : pick(c.bladeMaterials.metal);
        parts.push(`a blade of ${bladeMat}`);
        parts.push(`a haft of ${pick(c.haftMaterials.wood)}`);
    }
    
    parts.push(pick(c.grips));
    
    if (!isRanged) {
        if (Math.random() > 0.3) parts.push(`a ${pick(c.guards)}`);
        if (Math.random() > 0.3) parts.push(`a ${pick(c.pommels)}`);
    }

    const descriptor = pick(weaponData.descriptors[quality]);
    
    return `This ${subtype} has ${parts.join(', ')}. Overall, it ${descriptor}.`;
}

function generateHistory(quality) {
    return pick(weaponData.histories[quality]);
}

function generateWeapon(forceRandomize = false) {
    const weaponType = (forceRandomize || !ui.weaponType.value) ? pick(Object.keys(weaponData.types)) : ui.weaponType.value;
    const quality = (forceRandomize || !ui.quality.value) ? pick(weaponData.qualities) : ui.quality.value;
    
    const subtype = pick(weaponData.types[weaponType]);
    
    let property = { name: "Mundane", description: "This weapon has no special properties beyond its make." };
    if (quality === 'Magical') {
        property = pick(weaponData.magicalProperties);
    }

    const name = !lockStates.name ? generateName(subtype, quality, property) : ui.name.value;
    const description = !lockStates.description ? generateDescription(subtype, quality) : ui.description.value;
    const history = !lockStates.history ? generateHistory(quality) : ui.history.value;
    
    ui.weaponType.value = weaponType;
    ui.quality.value = quality;
    ui.name.value = name;
    ui.description.value = description;
    ui.history.value = history;
    
    const feature = quality !== 'Magical' ? pick(weaponData.notableFeatures) : "Its magic is its most notable feature.";
    
    ui.outputName.textContent = name;
    ui.outputSubtitle.textContent = `${quality} ${subtype}`;
    ui.outputDescription.textContent = description;
    ui.outputProperties.textContent = property.description;
    ui.outputHistory.textContent = history;
    
    ui.featureText.classList.remove('visible');
    ui.featureText.classList.add('hidden');
    ui.featureContainer.classList.remove('revealed');
    
    ui.featureText.textContent = "(Click to reveal)";
    ui.featureText.dataset.feature = feature;
}

function populateSelects() {
    Object.keys(weaponData.types).forEach(type => {
        const option = document.createElement('option');
        option.value = type;
        option.textContent = type;
        ui.weaponType.appendChild(option);
    });
    weaponData.qualities.forEach(level => {
        const option = document.createElement('option');
        option.value = level;
        option.textContent = level;
        ui.quality.appendChild(option);
    });
}

function copyToClipboard() {
    const name = ui.outputName.textContent;
    if (name === "Your Weapon Awaits") {
        showCopyFeedback("Generate a weapon first!", true);
        return;
    }

    const textToCopy = `
Name: ${name}
${ui.outputSubtitle.textContent}
---
Description: ${ui.outputDescription.textContent}
Properties: ${ui.outputProperties.textContent}
---
History: ${ui.outputHistory.textContent}
Notable Feature: ${ui.featureText.dataset.feature || "(hidden)"}
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
    // Clear inputs respecting locks
    if (!lockStates.name) ui.name.value = '';
    if (!lockStates.description) ui.description.value = '';
    if (!lockStates.history) ui.history.value = '';
    
    // Always clear dropdowns
    ui.weaponType.value = '';
    ui.quality.value = '';

    // Clear output
    ui.outputName.textContent = 'Your Weapon Awaits';
    ui.outputSubtitle.textContent = '';
    ui.outputDescription.textContent = '';
    ui.outputProperties.textContent = '';
    ui.outputHistory.textContent = '';
    
    ui.featureText.classList.remove('visible');
    ui.featureText.classList.add('hidden');
    ui.featureContainer.classList.remove('revealed');
    ui.featureText.textContent = '(Click to reveal)';
    if (ui.featureText.dataset.feature) {
        delete ui.featureText.dataset.feature;
    }
    
    ui.copyFeedback.style.opacity = 0;
    setTimeout(() => { ui.copyFeedback.textContent = ''; }, 300);
}

function saveWeapon() {
    if (ui.outputName.textContent === "Your Weapon Awaits") {
        showCopyFeedback("Generate a weapon first!", true);
        return;
    }
    const weapon = {
        name: ui.outputName.textContent,
        subtitle: ui.outputSubtitle.textContent,
        description: ui.outputDescription.textContent,
        properties: ui.outputProperties.textContent,
        history: ui.outputHistory.textContent,
        feature: ui.featureText.dataset.feature,
        id: Date.now()
    };
    
    savedWeapons.unshift(weapon);
    localStorage.setItem('savedWeapons', JSON.stringify(savedWeapons));
    renderHistory();
    showCopyFeedback("Weapon Saved!");
}

function renderHistory() {
    ui.historyList.innerHTML = '';
    if (savedWeapons.length === 0) {
        ui.historyList.innerHTML = '<p>No weapons saved yet. Generate and save a weapon to see it here!</p>';
        ui.exportHistoryBtn.disabled = true;
        ui.clearHistoryBtn.disabled = true;
        return;
    }
    
    ui.exportHistoryBtn.disabled = false;
    ui.clearHistoryBtn.disabled = false;

    savedWeapons.forEach(weapon => {
        const element = document.createElement('details');
        element.className = 'history-item';
        element.innerHTML = `
            <summary>
                <span class="expand-icon" aria-hidden="true">+</span>
                <div class="history-item-header">
                    <h3>${weapon.name}</h3>
                    <p>${weapon.subtitle}</p>
                </div>
                <button class="btn-delete-item" data-id="${weapon.id}" title="Remove ${weapon.name}">Remove</button>
            </summary>
            <div class="history-item-body">
                <div class="output-group"><strong>Description</strong><p>${weapon.description}</p></div>
                <div class="output-group"><strong>Properties</strong><p>${weapon.properties}</p></div>
                <hr>
                <div class="output-group"><strong>History</strong><p>${weapon.history}</p></div>
                <div class="output-group"><strong>Notable Feature</strong><p>${weapon.feature}</p></div>
            </div>
        `;
        ui.historyList.appendChild(element);
    });
}

function loadHistory() {
    const historyData = localStorage.getItem('savedWeapons');
    if (historyData) {
        savedWeapons = JSON.parse(historyData);
    }
    renderHistory();
}

function deleteWeapon(idToDelete) {
    savedWeapons = savedWeapons.filter(weapon => weapon.id !== idToDelete);
    localStorage.setItem('savedWeapons', JSON.stringify(savedWeapons));
    renderHistory();
}

function clearHistory() {
    if (savedWeapons.length === 0) return;
    if (confirm("Are you sure you want to delete all saved weapons? This cannot be undone.")) {
        savedWeapons = [];
        localStorage.setItem('savedWeapons', JSON.stringify(savedWeapons));
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
    if (savedWeapons.length === 0) { showCopyFeedback("No history to export.", true); return; }
    const dataStr = JSON.stringify(savedWeapons, null, 2);
    downloadFile(dataStr, "instantforge_weapon_history.json", "application/json");
    hideExportModal();
}

function exportAsCsv() {
    if (savedWeapons.length === 0) { showCopyFeedback("No history to export.", true); return; }
    const headers = ['name', 'subtitle', 'description', 'properties', 'history', 'feature'];
    const escapeCsv = (str) => `"${(str || '').replace(/"/g, '""').replace(/\r?\n|\r/g, ' ')}"`;
    let csvContent = headers.join(',') + '\n';
    savedWeapons.forEach(weapon => {
        const row = headers.map(header => escapeCsv(weapon[header]));
        csvContent += row.join(',') + '\n';
    });
    downloadFile(csvContent, "instantforge_weapon_history.csv", "text/csv;charset=utf-8;");
    hideExportModal();
}

function exportAsMarkdown() {
    if (savedWeapons.length === 0) { showCopyFeedback("No history to export.", true); return; }
    const markdownContent = savedWeapons.map(weapon => {
        return `## ${weapon.name}\n*${weapon.subtitle}*\n\n**Description**\n${weapon.description}\n\n**Properties**\n${weapon.properties}\n\n**History**\n${weapon.history}\n\n**Notable Feature**\n${weapon.feature}`;
    }).join('\n\n---\n\n');
    downloadFile(markdownContent, "instantforge_weapon_history.md", "text/markdown;charset=utf-8;");
    hideExportModal();
}

function exportAsPdf() {
    if (savedWeapons.length === 0) { showCopyFeedback("No history to export.", true); return; }
    const weaponHtml = savedWeapons.map(weapon => `
        <div class="weapon-page">
            <h2>${weapon.name}</h2>
            <p class="subtitle"><em>${weapon.subtitle}</em></p>
            <div class="output-group"><strong>Description</strong><p>${weapon.description}</p></div>
            <div class="output-group"><strong>Properties</strong><p>${weapon.properties}</p></div>
            <hr>
            <div class="output-group"><strong>History</strong><p>${weapon.history}</p></div>
            <div class="output-group"><strong>Notable Feature</strong><p>${weapon.feature}</p></div>
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
        .weapon-page { page-break-inside: avoid; margin-bottom: 2em; border-bottom: 1px solid #ccc; padding-bottom: 1em; }
        @media print { .weapon-page { border-bottom: none; } }
    </style>`;

    const htmlContent = `<!DOCTYPE html><html><head><title>InstantForge Weapon History</title>${printStyles}</head><body><h1>Saved Weapons</h1>${weaponHtml}</body></html>`;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); }, 250);
    hideExportModal();
}

function setupLockButtons() {
    Object.keys(lockStates).forEach(field => {
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
        const response = await fetch('weapon-data.json');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        weaponData = await response.json();

        populateSelects();
        loadHistory();
        setupLockButtons();
        
        ui.generateBtn.addEventListener('click', () => generateWeapon(false));
        ui.randomizeBtn.addEventListener('click', () => generateWeapon(true));
        ui.copyBtn.addEventListener('click', copyToClipboard);
        ui.saveBtn.addEventListener('click', saveWeapon);
        ui.clearBtn.addEventListener('click', clearAll);
        ui.clearHistoryBtn.addEventListener('click', clearHistory);
        
        ui.historyList.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-delete-item')) {
                e.preventDefault();
                const weaponId = parseInt(e.target.dataset.id, 10);
                if (!isNaN(weaponId)) deleteWeapon(weaponId);
            }
        });

        ui.exportHistoryBtn.addEventListener('click', showExportModal);
        ui.closeModalBtn.addEventListener('click', hideExportModal);
        ui.exportModal.addEventListener('click', (e) => { if (e.target === ui.exportModal) hideExportModal(); });
        ui.exportJsonBtn.addEventListener('click', exportAsJson);
        ui.exportCsvBtn.addEventListener('click', exportAsCsv);
        ui.exportMdBtn.addEventListener('click', exportAsMarkdown);
        ui.exportPdfBtn.addEventListener('click', exportAsPdf);

        ui.featureContainer.addEventListener('click', () => {
            if (ui.featureText.classList.contains('hidden') && ui.featureText.dataset.feature) {
                ui.featureText.textContent = ui.featureText.dataset.feature;
                ui.featureText.classList.remove('hidden');
                ui.featureText.classList.add('visible');
                ui.featureContainer.classList.add('revealed');
            }
        });

    } catch (error) {
        console.error("Could not load or parse weapon-data.json", error);
        document.querySelector('main').innerHTML = `<p style="color: white; text-align: center; font-size: 1.2rem;">Error: Could not load required game data. Please refresh the page.</p>`;
    }
});