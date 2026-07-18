import { access, readFile, readdir, stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const output = resolve(root, 'dist');

const pages = [
  'index.html',
  'npc-generator.html',
  'magic-item-generator.html',
  'tavern-generator.html',
  'weapon-generator.html',
];

const dataFiles = [
  'npc-data.json',
  'magic-item-data.json',
  'tavern-data.json',
  'weapon-data.json',
];

const errors = [];

async function requireNonempty(relativePath) {
  try {
    const details = await stat(resolve(output, relativePath));
    if (!details.isFile() || details.size === 0) {
      errors.push(`${relativePath} must be a nonempty file`);
    }
  } catch {
    errors.push(`${relativePath} is missing`);
  }
}

for (const fileName of [...pages, ...dataFiles]) {
  await requireNonempty(fileName);
}

for (const dataFile of dataFiles) {
  try {
    JSON.parse(await readFile(resolve(output, dataFile), 'utf8'));
  } catch (error) {
    errors.push(`${dataFile} is not valid JSON: ${error.message}`);
  }
}

for (const page of pages) {
  const pagePath = resolve(output, page);
  let html;
  try {
    html = await readFile(pagePath, 'utf8');
  } catch {
    continue;
  }

  const references = html.matchAll(/(?:src|href)=["']([^"']+)["']/g);
  let localScriptCount = 0;
  for (const [, reference] of references) {
    if (/^(?:https?:|data:|mailto:|#)/i.test(reference)) continue;

    const cleanReference = reference.split(/[?#]/, 1)[0];
    if (cleanReference.endsWith('.js')) localScriptCount += 1;
    const referencedPath = resolve(dirname(pagePath), cleanReference);
    try {
      await access(referencedPath);
    } catch {
      errors.push(`${page} references missing build output: ${reference}`);
    }
  }

  if (localScriptCount === 0) {
    errors.push(`${page} does not reference a built JavaScript module`);
  }
}

const builtAssets = await readdir(resolve(output, 'assets'), { recursive: true });
const builtScripts = builtAssets.filter((fileName) => fileName.endsWith('.js'));
const bundledSource = (
  await Promise.all(
    builtScripts.map((fileName) => readFile(resolve(output, 'assets', fileName), 'utf8')),
  )
).join('\n');

for (const marker of ['__instantforge_storage_probe__', 'export-forge']) {
  if (!bundledSource.includes(marker)) {
    errors.push(`built JavaScript is missing the shared-module marker: ${marker}`);
  }
}

if (errors.length > 0) {
  console.error(`Build verification failed:\n- ${errors.join('\n- ')}`);
  process.exit(1);
}

console.log(
  `Build verified (${pages.length} pages, ${builtScripts.length} bundled scripts, and ${dataFiles.length} data files).`,
);
