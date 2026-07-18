import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';

const root = __dirname;

const pages = {
  index: resolve(root, 'index.html'),
  npc: resolve(root, 'npc-generator.html'),
  magicItem: resolve(root, 'magic-item-generator.html'),
  tavern: resolve(root, 'tavern-generator.html'),
  weapon: resolve(root, 'weapon-generator.html'),
};

// Generator data is loaded at runtime with fetch(), so Vite cannot discover it
// through the JavaScript module graph. Emit it at stable root paths.
const dataFiles = [
  'npc-data.json',
  'magic-item-data.json',
  'tavern-data.json',
  'weapon-data.json',
];

function emitDataFiles(): Plugin {
  return {
    name: 'emit-generator-data',
    apply: 'build',
    generateBundle() {
      for (const fileName of dataFiles) {
        this.emitFile({
          type: 'asset',
          fileName,
          source: readFileSync(resolve(root, fileName)),
        });
      }
    },
  };
}

export default defineConfig({
  // Relative URLs keep the build portable under the GitHub Pages project path.
  base: './',
  plugins: [emitDataFiles()],
  build: {
    rollupOptions: {
      input: pages,
    },
  },
});
