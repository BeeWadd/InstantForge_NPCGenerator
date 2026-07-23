import { readFile, stat } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');

const pages = [
  'index.html',
  'forge.html',
  'npc-generator.html',
  'magic-item-generator.html',
  'tavern-generator.html',
  'weapon-generator.html',
];

const runtimePairs = [
  ['npc-generator.html', 'npc-generator.js', 'npc-data.json'],
  ['magic-item-generator.html', 'magic-item-generator.js', 'magic-item-data.json'],
  ['tavern-generator.html', 'tavern-generator.js', 'tavern-data.json'],
  ['weapon-generator.html', 'weapon-generator.js', 'weapon-data.json'],
];

const sharedModules = [
  'assets/js/index.js',
  'assets/js/forge.js',
  'assets/js/forge-data.js',
  'assets/js/forge-transfer.js',
  'assets/js/instantforge-analytics.js',
  'assets/js/instantforge-utils.js',
];

const errors = [];

async function requireNonempty(fileName) {
  try {
    const details = await stat(resolve(root, fileName));
    if (!details.isFile() || details.size === 0) {
      errors.push(`${fileName} must be a nonempty file`);
    }
  } catch {
    errors.push(`${fileName} is missing`);
  }
}

for (const page of pages) {
  await requireNonempty(page);
}

for (const moduleFile of sharedModules) {
  await requireNonempty(moduleFile);
}

function hasModuleScript(html, script) {
  return [...html.matchAll(/<script\b[^>]*>/gi)].some(([tag]) =>
    tag.includes(`src="${script}"`) && /type=["']module["']/i.test(tag),
  );
}

const landingPage = await readFile(resolve(root, 'index.html'), 'utf8');
if (!hasModuleScript(landingPage, 'assets/js/index.js')) {
  errors.push('index.html must load assets/js/index.js as a module');
}

const forgePage = await readFile(resolve(root, 'forge.html'), 'utf8');
if (!hasModuleScript(forgePage, 'assets/js/forge.js')) {
  errors.push('forge.html must load assets/js/forge.js as a module');
}

for (const [page, script, data] of runtimePairs) {
  await requireNonempty(script);
  await requireNonempty(data);

  const html = await readFile(resolve(root, page), 'utf8');
  if (!hasModuleScript(html, script)) {
    errors.push(`${page} must load ${script} as a module`);
  }

  const source = await readFile(resolve(root, script), 'utf8');
  if (!/from\s+["']\.\/assets\/js\/instantforge-utils\.js["']/.test(source)) {
    errors.push(`${script} must import the shared InstantForge utilities`);
  }

  if (!source.includes(`fetch('${data}')`) && !source.includes(`fetch("${data}")`)) {
    errors.push(`${script} must load ${data}`);
  }

  try {
    const parsed = JSON.parse(await readFile(resolve(root, data), 'utf8'));
    if (parsed === null || typeof parsed !== 'object') {
      errors.push(`${data} must contain a JSON object or array`);
    }
  } catch (error) {
    errors.push(`${data} has invalid JSON: ${error.message}`);
  }
}

for (const script of [...runtimePairs.map(([, fileName]) => fileName), ...sharedModules]) {
  const result = spawnSync(process.execPath, ['--check', resolve(root, script)], {
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    errors.push(`${script} has invalid JavaScript: ${(result.stderr || result.stdout).trim()}`);
  }
}

for (const fileName of ['package.json', 'vite.config.ts', 'README.md']) {
  const source = await readFile(resolve(root, fileName), 'utf8');
  if (/gemini|ai studio|process\.env\.(?:api_key|gemini_api_key)/i.test(source)) {
    errors.push(`${fileName} still contains an obsolete AI/API configuration reference`);
  }
}

for (const page of pages) {
  const source = await readFile(resolve(root, page), 'utf8');
  if (/googletagmanager\.com\/gtag\/js|gtag\(['"]config/i.test(source)) {
    errors.push(`${page} must not load or configure Google Analytics directly`);
  }
}

if (errors.length > 0) {
  console.error(`Source checks failed:\n- ${errors.join('\n- ')}`);
  process.exit(1);
}

console.log(`Source checks passed (${pages.length} pages, ${runtimePairs.length} generators).`);
