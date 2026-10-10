import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {agreement, buildRound, getInsight} from '../web/experience-core.mjs';

const load = name => JSON.parse(readFileSync(new URL(`../web/${name}`, import.meta.url), 'utf8'));
const catalog = load('met_catalog.json');
const data = load('met_experience_data.json');
const judged = load('met_judge_results.json');
const predictions = load('met_model_predictions.json');
const historical = load('met_28_features.json');
const fullJudged = load('met_all_judge_results.json');
const fullPredictions = load('met_all_pair_model_predictions.json');
const fullCatalog = load('met_all_pair_catalog.json');
const fullFeatures = load('met_all_28_features.json');
const displayFeatures = load('met_all_display_features.json');
const visualScreen = JSON.parse(readFileSync(new URL('../Data/met_visual_screen_v1.json', import.meta.url), 'utf8'));

test('all verified Paintings are browsable and the pilot is exactly 500 new works', () => {
  assert.equal(catalog.total, 5326);
  assert.equal(catalog.artworks.length, 5326);
  assert.equal(new Set(catalog.artworks.map(art => art.id)).size, 5326);
  const pilot = catalog.artworks.filter(art => art.pilot);
  assert.equal(pilot.length, 500);
  assert.ok(pilot.every(art => /^met-art\/\d+\.jpg$/.test(art.image) && art.sourceUrl.endsWith(`/${art.id}`)));
});

test('new game pairs use complete six-judge results and measured model predictions', () => {
  assert.equal(data.version, 'cac-met-paintings-v7');
  assert.equal(data.pairs.length, 2860);
  assert.equal(Object.keys(data.artworks).length, 5326);
  const rated = data.pairs.filter(pair => pair.ratingSource === 'original-cac');
  const newPairs = data.pairs.filter(pair => pair.ratingSource === 'six-judge-met-v1');
  const additionalPairs = data.pairs.filter(pair => pair.ratingSource === 'six-judge-met-all-v1');
  assert.equal(rated.length, 532);
  assert.equal(newPairs.length, 250);
  assert.equal(additionalPairs.length, 2078);
  assert.ok(rated.every(pair => Number.isFinite(pair.qA) && Number.isFinite(pair.modelQA)));
  assert.deepEqual(new Set(newPairs.map(pair => pair.id)), new Set(Object.keys(judged.pairs)));
  assert.ok(newPairs.every(pair => pair.qA === judged.pairs[pair.id].qA
    && Number.isFinite(pair.qA) && pair.qA >= 0 && pair.qA <= 1
    && pair.modelQA === predictions.pairs[pair.id].modelQA
    && pair.modelSource === 'cac-research-numerical-reproduction-v1'
    && Object.keys(judged.pairs[pair.id].normalVotes).length === 6));
  const newIds = newPairs.flatMap(pair => [pair.a, pair.b]);
  assert.equal(new Set(newIds).size, 500, 'each new work appears in one pilot pair');
  assert.ok(newIds.every(id => data.artworks[id].featureSource === 'met-image-features-v1'
    && Object.values(data.artworks[id].features).length === 4
    && Object.values(data.artworks[id].features).every(value => Number.isFinite(value) && value >= 0 && value <= 1)
    && data.artworks[id].feature28Source === 'cac-research-numerical-reproduction-v1'
    && Object.keys(data.artworks[id].features28).length === 28
    && Object.keys(historical.features[id]).length === 28));
  assert.deepEqual(new Set(newIds), new Set(catalog.artworks.filter(art => art.pilot).map(art => art.id)));
  assert.ok(data.pairs.every(pair => data.artworks[pair.a].period === pair.period && data.artworks[pair.b].period === pair.period));
  assert.equal(visualScreen.method, 'met-contact-sheet-visual-screen-v1');
  assert.equal(visualScreen.screenedCount, 4543);
  assert.equal(Object.keys(visualScreen.displayImageSha256).length, 4543);
  assert.equal(Object.keys(visualScreen.excluded).length, 265);
  const screenedOut = new Set(Object.keys(visualScreen.excluded));
  const expectedAdditional = fullCatalog.pairs.filter(pair => !screenedOut.has(pair.a) && !screenedOut.has(pair.b));
  assert.deepEqual(new Set(additionalPairs.map(pair => pair.id)), new Set(expectedAdditional.map(pair => pair.id)));
  assert.equal(data.visualScreen.removedPairs, 194);
  assert.equal(fullJudged.planFingerprint, fullPredictions.planFingerprint);
  assert.equal(fullJudged.planFingerprint, fullCatalog.planFingerprint);
  assert.equal(Object.keys(fullJudged.calibrationVotes).length, 568);
  assert.ok(additionalPairs.every(pair => pair.qA === fullJudged.pairs[pair.id].qA
    && pair.modelQA === fullPredictions.pairs[pair.id].modelQA
    && Object.keys(fullJudged.pairs[pair.id].normalVotes).length === 6));
  const additionalIds = additionalPairs.flatMap(pair => [pair.a, pair.b]);
  assert.equal(new Set(additionalIds).size, 4155);
  assert.ok(additionalIds.every(id => data.artworks[id].feature28Source === fullFeatures.method
    && Object.keys(data.artworks[id].features28).length === 28
    && data.artworks[id].featureSource === displayFeatures.method
    && Object.keys(data.artworks[id].features).length === 4
    && Object.values(data.artworks[id].features).every(value => Number.isFinite(value) && value >= 0 && value <= 1)));
  assert.equal(Object.keys(displayFeatures.features).length, 5043);
  assert.ok([...new Set([...newIds, ...additionalIds])].every(id =>
    JSON.stringify(data.artworks[id].features) === JSON.stringify(displayFeatures.features[id])));
});

test('new pairs can be played with judge agreement, model agreement and measured features', () => {
  const newPairs = data.pairs.filter(pair => pair.ratingSource === 'six-judge-met-v1');
  const byId = new Map(newPairs.map(pair => [pair.id, pair]));
  const records = newPairs.slice(0, 10).map(pair => ({pairId: pair.id, choice: 'A'}));
  const comparable = newPairs.slice(0, 10).filter(pair => pair.qA !== 0.5);
  const matched = comparable.filter(pair => pair.qA > 0.5).length;
  assert.deepEqual(agreement(records, byId), {
    matched, total: comparable.length,
    percent: comparable.length ? Math.round(matched / comparable.length * 100) : null
  });
  const modelComparable = newPairs.slice(0, 10).filter(pair => pair.modelQA !== 0.5);
  const modelMatched = modelComparable.filter(pair => pair.modelQA > 0.5).length;
  assert.deepEqual(agreement(records, byId, 'modelQA'), {
    matched: modelMatched, total: modelComparable.length,
    percent: modelComparable.length ? Math.round(modelMatched / modelComparable.length * 100) : null
  });
  const insight = getInsight(records, byId, data.artworks);
  assert.ok(insight === null || ['brightness','saturation','detail','symmetry'].includes(insight.dimension));
  const round = buildRound(newPairs);
  assert.equal(round.deck.length, 10);
  assert.equal(new Set(round.deck.map(item => item.pairId)).size, 10);
});

test('additional new pairs can produce the same four-feature round observation', () => {
  const additional = data.pairs.filter(pair => pair.ratingSource === 'six-judge-met-all-v1');
  const selected = additional.filter(pair =>
    Math.abs(data.artworks[pair.a].features.brightness - data.artworks[pair.b].features.brightness) > 1e-9).slice(0, 10);
  assert.equal(selected.length, 10);
  const byId = new Map(selected.map(pair => [pair.id, pair]));
  const records = selected.map(pair => ({pairId: pair.id,
    choice: data.artworks[pair.a].features.brightness > data.artworks[pair.b].features.brightness ? 'A' : 'B'}));
  const insight = getInsight(records, byId, data.artworks);
  assert.equal(insight.dimension, 'brightness');
  assert.equal(insight.direction, 'higher');
  assert.equal(insight.count, 10);
});
