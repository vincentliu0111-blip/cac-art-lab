import fs from 'node:fs';
import crypto from 'node:crypto';
import manifest from './manifest.json' with { type: 'json' };

const raw = fs.readFileSync(new URL('../web/app_data.json', import.meta.url));
const pairs = JSON.parse(raw);
const artworks = JSON.parse(fs.readFileSync(new URL('../web/artworks.json', import.meta.url)));
const config = JSON.parse(fs.readFileSync(new URL('../web/collection_config.json', import.meta.url)));
const digest = crypto.createHash('sha256').update(raw).digest('hex');
if (digest !== manifest.appDataSha256 || config.datasetVersion !== manifest.version
    || pairs.length !== manifest.pairs.length) throw new Error('Dataset version or fingerprint changed');
for (let i = 0; i < pairs.length; i += 1) {
    const pair = pairs[i], expected = manifest.pairs[i];
    if (pair.pair_id !== expected.id || i + 1 !== expected.position
        || pair.img_A !== expected.a + '.jpg' || pair.img_B !== expected.b + '.jpg')
        throw new Error(`Pair ${i + 1} differs from the collector manifest`);
    for (const side of ['A', 'B']) {
        const info = artworks[pair['img_' + side]];
        if (!info || info.id !== Number(pair['img_' + side].replace('.jpg', ''))
            || info.url !== `https://www.metmuseum.org/art/collection/search/${info.id}`
            || typeof info.visualAlt !== 'string' || info.visualAlt.length < 30)
            throw new Error(`Artwork details missing for pair ${i + 1} side ${side}`);
    }
}
console.log(`PASS ${manifest.version}: ${pairs.length} frozen pairs and ${Object.keys(artworks).length} artwork records`);
