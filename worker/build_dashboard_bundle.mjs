import { readFile, writeFile } from 'node:fs/promises';

const source = await readFile(new URL('./worker.mjs', import.meta.url), 'utf8');
const manifest = JSON.parse(await readFile(new URL('./manifest.json', import.meta.url), 'utf8'));
const marker = "import manifest from './manifest.json' with { type: 'json' };";
if (!source.startsWith(marker)) throw new Error('Unexpected Worker entrypoint');
const bundle = `const manifest = ${JSON.stringify(manifest)};` + source.slice(marker.length);
await writeFile(new URL('./dashboard_bundle.js', import.meta.url), bundle);
console.log('Built single-file dashboard Worker from worker.mjs and manifest.json');
