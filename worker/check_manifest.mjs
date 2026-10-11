import fs from 'node:fs';
import crypto from 'node:crypto';
import manifest from './experience_manifest.json' with { type: 'json' };

const raw = fs.readFileSync(new URL('../web/met_experience_data.json', import.meta.url));
const data = JSON.parse(raw);
const config = JSON.parse(fs.readFileSync(new URL('../web/collection_config.json', import.meta.url)));
const digest = crypto.createHash('sha256').update(raw).digest('hex');
if (digest !== manifest.sourceSha256 || data.version !== manifest.version
    || config.datasetVersion !== manifest.version || data.pairs.length !== manifest.pairs.length)
    throw new Error('Dataset version or fingerprint changed');
for (let i = 0; i < manifest.pairs.length; i += 1) {
    const pair = data.pairs[i], expected = manifest.pairs[i];
    if (pair.id !== expected.id || pair.a !== expected.a || pair.b !== expected.b)
        throw new Error(`Pair ${i + 1} differs from the collector manifest`);
    if (!data.artworks[pair.a] || !data.artworks[pair.b] || pair.a === pair.b)
        throw new Error(`Artwork details missing for pair ${i + 1}`);
}
console.log(`PASS ${manifest.version}: ${manifest.pairs.length} current pairs`);
