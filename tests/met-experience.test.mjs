import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {agreement, buildRound, buildRoundWithPreference, getInsight} from '../web/experience-core.mjs';
import {orderForBrowse} from '../web/gallery-order.mjs';

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
const qualityReview = JSON.parse(readFileSync(new URL('../Data/met_quality_review_v2.json', import.meta.url), 'utf8'));
const openingReview = JSON.parse(readFileSync(new URL('../Data/met_opening_pairs_v1.json', import.meta.url), 'utf8'));
const styleMatches = load('met_style_matched_pairs.json');
const westernArtworks = load('met_western_artworks.json');
const departmentSnapshot = JSON.parse(readFileSync(new URL('../Data/met_department_snapshot_v1.json', import.meta.url), 'utf8'));

test('all verified Paintings are browsable and the pilot is exactly 500 new works', () => {
  assert.equal(catalog.total, 5326);
  assert.equal(catalog.artworks.length, 5326);
  assert.equal(new Set(catalog.artworks.map(art => art.id)).size, 5326);
  const pilot = catalog.artworks.filter(art => art.pilot);
  assert.equal(pilot.length, 500);
  assert.ok(pilot.every(art => /^met-art\/\d+\.jpg$/.test(art.image) && art.sourceUrl.endsWith(`/${art.id}`)));
});

test('new game pairs use complete six-judge results and measured model predictions', () => {
  assert.equal(data.version, 'follow-your-eye-met-paintings-v3');
  assert.equal(data.pairs.length, 2751);
  assert.equal(Object.keys(data.artworks).length, 5326);
  const rated = data.pairs.filter(pair => pair.ratingSource === 'original-study');
  const newPairs = data.pairs.filter(pair => pair.ratingSource === 'six-judge-met-v1');
  const additionalPairs = data.pairs.filter(pair => pair.ratingSource === 'six-judge-met-all-v1');
  assert.equal(rated.length, 478);
  assert.equal(newPairs.length, 247);
  assert.equal(additionalPairs.length, 2026);
  assert.ok(rated.every(pair => Number.isFinite(pair.qA) && Number.isFinite(pair.modelQA)));
  assert.ok(newPairs.every(pair => Object.hasOwn(judged.pairs,pair.id)));
  assert.ok(newPairs.every(pair => pair.qA === judged.pairs[pair.id].qA
    && Number.isFinite(pair.qA) && pair.qA >= 0 && pair.qA <= 1
    && pair.modelQA === predictions.pairs[pair.id].modelQA
    && pair.modelSource === 'study-numerical-reproduction-v1'
    && Object.keys(judged.pairs[pair.id].normalVotes).length === 6));
  const newIds = newPairs.flatMap(pair => [pair.a, pair.b]);
  assert.equal(new Set(newIds).size, 494, 'each retained pilot work appears in one active pair');
  assert.ok(newIds.every(id => data.artworks[id].featureSource === 'met-image-features-v1'
    && Object.values(data.artworks[id].features).length === 4
    && Object.values(data.artworks[id].features).every(value => Number.isFinite(value) && value >= 0 && value <= 1)
    && data.artworks[id].feature28Source === 'study-numerical-reproduction-v1'
    && Object.keys(data.artworks[id].features28).length === 28
    && Object.keys(historical.features[id]).length === 28));
  assert.ok(newIds.every(id => catalog.artworks.some(art => art.pilot && art.id === id)));
  assert.ok(data.pairs.every(pair => data.artworks[pair.a].period === pair.period && data.artworks[pair.b].period === pair.period));
  assert.equal(visualScreen.method, 'met-contact-sheet-visual-screen-v1');
  assert.equal(visualScreen.screenedCount, 4543);
  assert.equal(Object.keys(visualScreen.displayImageSha256).length, 4543);
  assert.equal(Object.keys(visualScreen.excluded).length, 265);
  assert.equal(qualityReview.activePairCount,2751);
  assert.equal(Object.keys(qualityReview.excluded).length,103);
  assert.equal(qualityReview.removedPairIds.length,109);
  const screenedOut = new Set([...Object.keys(visualScreen.excluded),...Object.keys(qualityReview.excluded)]);
  assert.ok(data.pairs.every(pair => !screenedOut.has(pair.a) && !screenedOut.has(pair.b)));
  assert.ok(qualityReview.removedPairIds.every(id => !data.pairs.some(pair => pair.id === id)));
  const expectedAdditional = fullCatalog.pairs.filter(pair => !screenedOut.has(pair.a) && !screenedOut.has(pair.b));
  assert.deepEqual(new Set(additionalPairs.map(pair => pair.id)), new Set(expectedAdditional.map(pair => pair.id)));
  assert.equal(data.visualScreen.removedPairs, 303);
  assert.equal(fullJudged.planFingerprint, fullPredictions.planFingerprint);
  assert.equal(fullJudged.planFingerprint, fullCatalog.planFingerprint);
  assert.equal(Object.keys(fullJudged.calibrationVotes).length, 568);
  assert.ok(additionalPairs.every(pair => pair.qA === fullJudged.pairs[pair.id].qA
    && pair.modelQA === fullPredictions.pairs[pair.id].modelQA
    && Object.keys(fullJudged.pairs[pair.id].normalVotes).length === 6));
  const additionalIds = additionalPairs.flatMap(pair => [pair.a, pair.b]);
  assert.equal(new Set(additionalIds).size, 4051);
  assert.ok(additionalIds.every(id => data.artworks[id].feature28Source === fullFeatures.method
    && Object.keys(data.artworks[id].features28).length === 28
    && data.artworks[id].featureSource === displayFeatures.method
    && Object.keys(data.artworks[id].features).length === 4
    && Object.values(data.artworks[id].features).every(value => Number.isFinite(value) && value >= 0 && value <= 1)));
  assert.equal(Object.keys(displayFeatures.features).length, 5043);
  assert.ok([...new Set([...newIds, ...additionalIds])].every(id =>
    JSON.stringify(data.artworks[id].features) === JSON.stringify(displayFeatures.features[id])));
});

test('visually reviewed opening pairs lead a round while available', () => {
  assert.equal(openingReview.reviewedCandidatePairs,150);
  assert.equal(openingReview.selectedPairCount,51);
  assert.deepEqual(data.openingPairs,openingReview.selected.map(pair => pair.id));
  const curated=new Set(data.openingPairs), active=new Set(data.pairs.map(pair => pair.id));
  assert.ok([...curated].every(id => active.has(id)));
  const byId=new Map(data.pairs.map(pair => [pair.id,pair]));
  const seen=[];
  for(let i=0;i<12;i++){
    const round=buildRound(data.pairs,seen,10,Math.random,data.openingPairs);
    assert.equal(round.deck.length,10);
    assert.ok(round.deck.slice(0,3).every(item => curated.has(item.pairId)));
    assert.equal(new Set(round.deck.slice(0,3).map(item => byId.get(item.pairId).period)).size,3);
    assert.ok(round.deck.every(item => !seen.includes(item.pairId)));
    seen.push(...round.deck.map(item => item.pairId));
  }
});

test('new rounds use existing, more visually comparable evaluated pairs', () => {
  assert.equal(styleMatches.sourceVersion,data.version);
  assert.equal(styleMatches.pairIds.length,1200);
  const ids=new Set(styleMatches.pairIds),byId=new Map(data.pairs.map(pair=>[pair.id,pair]));
  assert.equal(ids.size,styleMatches.pairIds.length);
  assert.ok([...ids].every(id=>byId.has(id)));
  assert.ok(!ids.has('met-436899-51724'), 'the ink-versus-tempera example is excluded');
  const catalogById=new Map(catalog.artworks.map(art=>[art.id,art]));
  const category=id=>['oil','ink','tempera','watercolor','gouache','acrylic','fresco','pastel','lacquer'].find(term=>catalogById.get(id)?.medium.toLowerCase().includes(term));
  for(const id of ids){
    const pair=byId.get(id),first=data.artworks[pair.a].features,second=data.artworks[pair.b].features;
    assert.ok(category(pair.a) && category(pair.a)===category(pair.b));
    const distance=([['brightness',.3],['saturation',.25],['detail',.17],['symmetry',.08]]
      .reduce((sum,[key,scale])=>sum+Math.abs(first[key]-second[key])/scale,0))/4;
    assert.ok(distance<=.7+1e-12);
  }
  const selected=data.pairs.filter(pair=>ids.has(pair.id));
  const opening=data.openingPairs.filter(id=>ids.has(id));
  assert.equal(opening.length,16);
  const round=buildRound(selected,[],10,Math.random,opening);
  assert.equal(round.deck.length,10);
  assert.ok(round.deck.every(item=>ids.has(item.pairId)));
});

test('official Met department groups keep Western works prominent without hiding the collection', () => {
  const western = new Set(westernArtworks.westernArtworkIds);
  const catalogIds = new Set(catalog.artworks.map(art => String(art.id)));
  const departments = new Set(['European Paintings', 'Robert Lehman Collection', 'European Sculpture and Decorative Arts', 'The American Wing']);
  assert.equal(westernArtworks.catalogVersion, catalog.version);
  assert.equal(westernArtworks.experienceVersion, data.version);
  assert.equal(western.size, westernArtworks.westernArtworkIds.length);
  assert.equal(western.size, 2185);
  assert.deepEqual(western, new Set([...catalogIds].filter(id => departments.has(departmentSnapshot.departmentById[id]))));
  const ordered = orderForBrowse(catalog.artworks, western);
  assert.equal(ordered.length, catalog.total);
  assert.equal(new Set(ordered.map(art => art.id)).size, catalog.total);
  assert.equal(ordered.slice(0, 60).filter(art => western.has(String(art.id))).length, 42);
});

test('new choice rounds prefer seven Western-Western pairs and keep the other screened pairs', () => {
  const western = new Set(westernArtworks.westernArtworkIds);
  const screened = new Set(styleMatches.pairIds);
  const pairs = data.pairs.filter(pair => screened.has(pair.id));
  const preferred = pairs.filter(pair => western.has(pair.a) && western.has(pair.b)).map(pair => pair.id);
  const preferredSet = new Set(preferred);
  const opening = data.openingPairs.filter(id => preferredSet.has(id));
  assert.equal(preferred.length, 448);
  assert.equal(opening.length, 14);
  let seen = [];
  for (let i = 0; i < 12; i++) {
    const round = buildRoundWithPreference(pairs, seen, {preferredPairIds: preferred, openingPairIds: opening});
    assert.equal(round.deck.length, 10);
    assert.equal(round.deck.filter(item => preferredSet.has(item.pairId)).length, 7);
    assert.ok(round.deck.every(item => screened.has(item.pairId) && !seen.includes(item.pairId)));
    seen = seen.concat(round.deck.map(item => item.pairId));
  }
  const remaining = pairs.filter(pair => !preferredSet.has(pair.id));
  const fallback = buildRoundWithPreference(pairs, preferred, {preferredPairIds: preferred});
  assert.equal(fallback.deck.length, 10);
  assert.ok(fallback.deck.every(item => remaining.some(pair => pair.id === item.pairId)));
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
