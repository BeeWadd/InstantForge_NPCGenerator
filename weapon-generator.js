import {
    createHistoryItem,
    createId,
    downloadFile,
    escapeCsvCell,
    escapeHtml,
    loadCollection,
    printableDocument,
    saveCollection,
    showFatalError,
    setupDialog,
    setupRevealControl,
} from './assets/js/instantforge-utils.js';
import { initializeAnalytics, trackAnalyticsEvent } from './assets/js/instantforge-analytics.js';

console.log("InstantForge: Weapons script loaded.");
let weaponData;
let savedWeapons = [];
let exportDialogControl;
let featureRevealControl;

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
    weaponSubtype: document.getElementById('weapon-subtype'),
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

function getConstructionFamily(weaponType, subtype) {
    const family = weaponData.constructionFamilies[weaponType];
    if (typeof family === 'string') return family;
    return family?.[subtype] || 'polearm';
}

function pickCoreMaterial(materials) {
    return Math.random() > 0.8 ? pick(materials.exotic) : pick(materials.metal);
}

function generateDescription(weaponType, subtype, quality) {
    const c = weaponData.components;
    const family = getConstructionFamily(weaponType, subtype);
    const coreMaterial = pickCoreMaterial(c.bladeMaterials);
    const parts = [];

    switch (family) {
        case 'blade':
            parts.push(`a blade of ${coreMaterial}`, pick(c.grips));
            if (Math.random() > 0.3) parts.push(pick(c.guards));
            if (Math.random() > 0.3) parts.push(pick(c.pommels));
            break;
        case 'axe':
            parts.push(`an axe head of ${coreMaterial}`, `a haft of ${pick(c.haftMaterials.wood)}`, pick(c.grips));
            break;
        case 'hammer':
            parts.push(`a striking head of ${coreMaterial}`, `a haft of ${pick(c.haftMaterials.wood)}`, pick(c.grips));
            break;
        case 'polearm':
            parts.push(`a head of ${coreMaterial}`, `a long shaft of ${pick(c.haftMaterials.wood)}`, pick(c.grips));
            break;
        case 'bow':
            parts.push(`limbs of ${pick(c.bowMaterials)}`, `a string of ${pick(c.strings)}`, pick(c.grips));
            break;
        case 'crossbow':
            parts.push(`a stock of ${pick(c.haftMaterials.wood)}`, `a bow of ${pick(c.bowMaterials)}`, `a string of ${pick(c.strings)}`, pick(c.grips));
            break;
        case 'sling':
            parts.push(`a pouch of ${pick(c.slingPouches)}`, `cords of ${pick(c.slingCords)}`);
            break;
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
    
    const subtype = (forceRandomize || !ui.weaponSubtype.value || ui.weaponType.value !== weaponType) 
        ? pick(weaponData.types[weaponType]) 
        : ui.weaponSubtype.value;
    
    let property = { name: "Mundane", description: "This weapon has no special properties beyond its make." };
    if (quality === 'Magical') {
        property = pick(weaponData.magicalProperties);
    }

    const name = !lockStates.name ? generateName(subtype, quality, property) : ui.name.value;
    const description = !lockStates.description ? generateDescription(weaponType, subtype, quality) : ui.description.value;
    const history = !lockStates.history ? generateHistory(quality) : ui.history.value;
    
    // Update form controls before updating output
    ui.weaponType.value = weaponType;
    populateSubtypes(weaponType);
    ui.weaponSubtype.value = subtype;
    ui.quality.value = quality;
    ui.name.value = name;
    ui.description.value = description;
    ui.history.value = history;
    
    const constructionFamily = getConstructionFamily(weaponType, subtype);
    const featurePool = [
        ...weaponData.notableFeaturesByFamily.all,
        ...(weaponData.notableFeaturesByFamily[constructionFamily] || [])
    ];
    const feature = quality !== 'Magical' ? pick(featurePool) : "Its magic is its most notable feature.";
    
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
    featureRevealControl?.reset();
    trackAnalyticsEvent('generation_complete', { generator_type: 'weapon' });
}

function populateSubtypes(weaponType) {
    ui.weaponSubtype.replaceChildren();
    if (weaponType && weaponData.types[weaponType]) {
        ui.weaponSubtype.disabled = false;
        const randomOption = document.createElement('option');
        randomOption.value = '';
        randomOption.textContent = 'Random';
        ui.weaponSubtype.appendChild(randomOption);

        weaponData.types[weaponType].forEach(subtype => {
            const option = document.createElement('option');
            option.value = subtype;
            option.textContent = subtype;
            ui.weaponSubtype.appendChild(option);
        });
    } else {
        ui.weaponSubtype.disabled = true;
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'Select a type first';
        ui.weaponSubtype.appendChild(defaultOption);
    }
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
    populateSubtypes(''); // Initialize subtype dropdown as disabled
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
    // Clear inputs (full clear ignores locks)
    ui.name.value = '';
    ui.description.value = '';
    ui.history.value = '';
    
    ui.weaponType.value = '';
    ui.quality.value = '';
    populateSubtypes(''); // Reset and disable subtype dropdown

    // Reset locks
    lockStates = { name: false, description: false, history: false };
    Object.keys(lockStates).forEach(field => {
        const btn = ui[`lock${capitalize(field)}Btn`];
        btn.dataset.locked = 'false';
        btn.setAttribute('aria-label', `Lock ${capitalize(field)}`);
    });

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
    featureRevealControl?.reset();
    
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
        id: createId('weapon')
    };

    const nextWeapons = [weapon, ...savedWeapons];
    const result = saveCollection('savedWeapons', nextWeapons);
    if (!result.ok) {
        showCopyFeedback("Could not save weapon. Browser storage may be unavailable or full.", true, 4000);
        return;
    }
    savedWeapons = nextWeapons;
    renderHistory();
    trackAnalyticsEvent('save_complete', { generator_type: 'weapon' });
    showCopyFeedback("Weapon Saved!");
}

function renderHistory() {
    ui.historyList.replaceChildren();
    if (savedWeapons.length === 0) {
        const emptyMessage = document.createElement('p');
        emptyMessage.textContent = 'No weapons saved yet. Generate and save a weapon to see it here!';
        ui.historyList.appendChild(emptyMessage);
        ui.exportHistoryBtn.disabled = true;
        ui.clearHistoryBtn.disabled = true;
        return;
    }
    
    ui.exportHistoryBtn.disabled = false;
    ui.clearHistoryBtn.disabled = false;

    savedWeapons.forEach(weapon => {
        const element = createHistoryItem({
            id: weapon.id,
            title: weapon.name,
            subtitle: weapon.subtitle,
            fields: [
                { label: 'Description', value: weapon.description },
                { label: 'Properties', value: weapon.properties },
                { label: 'History', value: weapon.history, dividerBefore: true },
                { label: 'Notable Feature', value: weapon.feature },
            ],
        });
        ui.historyList.appendChild(element);
    });
}

function loadHistory() {
    savedWeapons = loadCollection('savedWeapons', {
        requiredFields: ['name', 'subtitle', 'description', 'properties', 'history', 'feature'],
    }).map(weapon => ({ ...weapon, id: String(weapon.id ?? createId('weapon')) }));
    renderHistory();
}

function deleteWeapon(idToDelete) {
    const nextWeapons = savedWeapons.filter(weapon => String(weapon.id) !== String(idToDelete));
    const result = saveCollection('savedWeapons', nextWeapons);
    if (!result.ok) {
        showCopyFeedback("Could not remove weapon from browser storage.", true, 4000);
        return;
    }
    savedWeapons = nextWeapons;
    renderHistory();
}

function clearHistory() {
    if (savedWeapons.length === 0) return;
    if (confirm("Are you sure you want to delete all saved weapons? This cannot be undone.")) {
        const result = saveCollection('savedWeapons', []);
        if (!result.ok) {
            showCopyFeedback("Could not clear weapons from browser storage.", true, 4000);
            return;
        }
        savedWeapons = [];
        renderHistory();
        showCopyFeedback("History Cleared.");
    }
}

function showExportModal(event) { exportDialogControl.open(event?.currentTarget || ui.exportHistoryBtn); }
function hideExportModal() { exportDialogControl.close(); }

function exportAsJson() {
    if (savedWeapons.length === 0) { showCopyFeedback("No history to export.", true); return; }
    const dataStr = JSON.stringify(savedWeapons, null, 2);
    downloadFile(dataStr, "instantforge_weapon_history.json", "application/json");
    trackAnalyticsEvent('export_complete', { format: 'json' });
    hideExportModal();
}

function exportAsCsv() {
    if (savedWeapons.length === 0) { showCopyFeedback("No history to export.", true); return; }
    const headers = ['name', 'subtitle', 'description', 'properties', 'history', 'feature'];
    let csvContent = headers.join(',') + '\n';
    savedWeapons.forEach(weapon => {
        const row = headers.map(header => escapeCsvCell(weapon[header]));
        csvContent += row.join(',') + '\n';
    });
    downloadFile(csvContent, "instantforge_weapon_history.csv", "text/csv;charset=utf-8;");
    trackAnalyticsEvent('export_complete', { format: 'csv' });
    hideExportModal();
}

function exportAsMarkdown() {
    if (savedWeapons.length === 0) { showCopyFeedback("No history to export.", true); return; }
    const markdownContent = savedWeapons.map(weapon => {
        return `## ${weapon.name}\n*${weapon.subtitle}*\n\n**Description**\n${weapon.description}\n\n**Properties**\n${weapon.properties}\n\n**History**\n${weapon.history}\n\n**Notable Feature**\n${weapon.feature}`;
    }).join('\n\n---\n\n');
    downloadFile(markdownContent, "instantforge_weapon_history.md", "text/markdown;charset=utf-8;");
    trackAnalyticsEvent('export_complete', { format: 'markdown' });
    hideExportModal();
}

function exportAsPdf() {
    if (savedWeapons.length === 0) { showCopyFeedback("No history to export.", true); return; }
    const weaponHtml = savedWeapons.map(weapon => `
        <div class="weapon-page">
            <h2>${escapeHtml(weapon.name)}</h2>
            <p class="subtitle"><em>${escapeHtml(weapon.subtitle)}</em></p>
            <div class="output-group"><strong>Description</strong><p>${escapeHtml(weapon.description)}</p></div>
            <div class="output-group"><strong>Properties</strong><p>${escapeHtml(weapon.properties)}</p></div>
            <hr>
            <div class="output-group"><strong>History</strong><p>${escapeHtml(weapon.history)}</p></div>
            <div class="output-group"><strong>Notable Feature</strong><p>${escapeHtml(weapon.feature)}</p></div>
        </div>
    `).join('');

    const printStyles = `<style>
        body { font-family: Georgia, serif; color: #333; }
        h1, h2 { font-family: Georgia, serif; }
        h2 { font-size: 22pt; margin-bottom: 0; }
        .subtitle { font-size: 11pt; color: #666; margin-top: 0; }
        .output-group { margin-bottom: 1em; }
        .output-group strong { color: #8B0000; display: block; font-size: 10pt; text-transform: uppercase; letter-spacing: 1px; }
        .output-group p { margin: 0.25em 0 0 0; padding-left: 1em; border-left: 2px solid #ccc; }
        hr { border: 0; height: 1px; background: #ccc; margin: 1em 0; }
        .weapon-page { page-break-inside: avoid; margin-bottom: 2em; border-bottom: 1px solid #ccc; padding-bottom: 1em; }
        @media print { .weapon-page { border-bottom: none; } }
    </style>`;

    const htmlContent = printableDocument({
        title: 'InstantForge Weapon History',
        heading: 'Saved Weapons',
        itemsHtml: weaponHtml,
        styles: printStyles,
    });

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        showCopyFeedback("Could not open the print window. Check your popup settings.", true, 4000);
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
        initializeAnalytics();
        const response = await fetch('weapon-data.json');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        weaponData = await response.json();

        populateSelects();
        loadHistory();
        setupLockButtons();
        exportDialogControl = setupDialog(ui.exportModal, ui.closeModalBtn);
        featureRevealControl = setupRevealControl(ui.featureContainer, ui.featureText, 'feature');
        
        ui.weaponType.addEventListener('change', () => populateSubtypes(ui.weaponType.value));

        ui.generateBtn.addEventListener('click', () => generateWeapon(false));
        ui.randomizeBtn.addEventListener('click', () => generateWeapon(true));
        ui.copyBtn.addEventListener('click', copyToClipboard);
        ui.saveBtn.addEventListener('click', saveWeapon);
        ui.clearBtn.addEventListener('click', clearAll);
        ui.clearHistoryBtn.addEventListener('click', clearHistory);
        
        ui.historyList.addEventListener('click', (e) => {
            const deleteButton = e.target.closest('.btn-delete-item');
            if (deleteButton) {
                e.preventDefault();
                deleteWeapon(deleteButton.dataset.id);
            }
        });

        ui.exportHistoryBtn.addEventListener('click', showExportModal);
        ui.exportJsonBtn.addEventListener('click', exportAsJson);
        ui.exportCsvBtn.addEventListener('click', exportAsCsv);
        ui.exportMdBtn.addEventListener('click', exportAsMarkdown);
        ui.exportPdfBtn.addEventListener('click', exportAsPdf);

    } catch (error) {
        console.error("Could not load or parse weapon-data.json", error);
        showFatalError();
    }
});
