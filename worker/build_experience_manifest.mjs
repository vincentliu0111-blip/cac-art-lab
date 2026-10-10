import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const source = new URL('../web/met_experience_data.json', import.meta.url);
const target = new URL('./experience_manifest.json', import.meta.url);
const bytes = readFileSync(source);
const data = JSON.parse(bytes);
if (!/^cac-met-paintings-v\d+$/.test(data.version) || !Array.isArray(data.pairs)) {
  throw new Error('Unexpected experience dataset');
}
const pairs = data.pairs.map(({ id, a, b }) => ({ id, a, b }));
if (new Set(pairs.map(pair => pair.id)).size !== pairs.length ||
    pairs.some(pair => !pair.id || !data.artworks[pair.a] || !data.artworks[pair.b] || pair.a === pair.b)) {
  throw new Error('Invalid pair manifest');
}
const manifest = {
  version: data.version,
  sourceSha256: createHash('sha256').update(bytes).digest('hex'),
  pairs
};
const output = JSON.stringify(manifest, null, 2) + '\n';
if (process.argv.includes('--check')) {
  if (readFileSync(target, 'utf8') !== output) throw new Error('Experience manifest is stale');
  console.log(`PASS ${manifest.version}: ${pairs.length} pairs`);
} else {
  writeFileSync(target, output);
  console.log(`Wrote ${pairs.length} pairs for ${manifest.version}`);
}
