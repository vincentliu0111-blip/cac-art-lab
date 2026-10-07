import test from 'node:test';
import assert from 'node:assert/strict';
import worker, { validateEvent } from './worker.mjs';
import manifest from './manifest.json' with { type: 'json' };

const origin = 'https://vincentliu.ai';
const uuid = () => crypto.randomUUID();

class MemoryD1 {
    constructor() { this.choices = []; this.testSessions = new Set(); }
    prepare(sql) {
        const bind = (...args) => ({
            first: async () => {
                if (sql.includes('FROM test_sessions'))
                    return this.testSessions.has(args[0]) ? { session_id: args[0] } : null;
                if (sql.includes('WHERE id = ? OR')) {
                    const row = this.choices.find(r => r.id === args[0] ||
                        (r.session_id === args[1] && r.round_id === args[2]
                            && (r.pair_id === args[3] || r.position === args[4])));
                    return row && { id: row.id, payload_json: row.payload_json };
                }
                return this.choices.find(r => r.session_id === args[0]) ?? null;
            },
            run: async () => {
                if (sql.startsWith('INSERT OR IGNORE INTO choices')) {
                    const columns = ['id', 'session_id', 'round_id', 'dataset_version', 'pair_id', 'position',
                        'a_artwork_id', 'b_artwork_id', 'choice', 'layout', 'shown_at', 'chosen_at', 'elapsed_ms',
                        'received_at', 'environment', 'payload_json'];
                    const row = Object.fromEntries(columns.map((c, i) => [c, args[i]]));
                    if (this.choices.some(r => r.id === row.id || (r.session_id === row.session_id
                        && r.round_id === row.round_id && (r.pair_id === row.pair_id || r.position === row.position))))
                        return { meta: { changes: 0 } };
                    this.choices.push(row);
                    return { meta: { changes: 1 } };
                }
                if (sql.startsWith('INSERT OR IGNORE INTO test_sessions')) {
                    this.testSessions.add(args[0]); return { meta: { changes: 1 } };
                }
                if (sql.startsWith('DELETE FROM choices')) {
                    const before = this.choices.length;
                    this.choices = this.choices.filter(r => !(r.session_id === args[0] && r.environment === 'test'));
                    return { meta: { changes: before - this.choices.length } };
                }
                if (sql.startsWith('DELETE FROM test_sessions')) {
                    this.testSessions.delete(args[0]); return { meta: { changes: 1 } };
                }
                throw new Error('Unexpected SQL: ' + sql);
            },
            all: async () => ({ results: sql.includes('GROUP BY')
                ? [...new Set(this.choices.map(r => r.environment + '|' + r.dataset_version))].map(key => {
                    const [environment, dataset_version] = key.split('|');
                    const rows = this.choices.filter(r => r.environment === environment && r.dataset_version === dataset_version);
                    return { environment, dataset_version, choices: rows.length,
                        sessions: new Set(rows.map(r => r.session_id)).size };
                }) : this.choices.filter(r => r.environment === args[0]
                    && (args.length === 1 || r.dataset_version === args[1])) })
        });
        return { bind, all: () => bind().all() };
    }
}

function event(overrides = {}) {
    const pair = manifest.pairs[0];
    return { id: uuid(), sessionId: uuid(), roundId: uuid(), datasetVersion: manifest.version,
        pairId: pair.id, position: pair.position, aArtworkId: pair.a, bArtworkId: pair.b,
        choice: 'A', layout: 'side-by-side', shownAt: '2026-10-06T20:00:00.000Z', chosenAt: '2026-10-06T20:00:03.000Z',
        elapsedMs: 3000, ...overrides };
}

async function call(env, path, method = 'GET', body = null, token = null) {
    const headers = { origin, ...(body ? { 'content-type': 'application/json' } : {}),
        ...(token ? { authorization: `Bearer ${token}` } : {}) };
    return worker.fetch(new Request(`https://collector.example${path}`, {
        method, headers, ...(body ? { body: JSON.stringify(body) } : {})
    }), env);
}

test('frozen version, order, artwork, timing and choice payload shape', () => {
    const value = event();
    assert.equal(validateEvent(value, Date.parse('2026-10-07T00:00:00.000Z')), null);
    for (const change of [{ position: 2 }, { datasetVersion: 'other' }, { aArtworkId: '0' },
        { choice: 'skip' }, { layout: 'diagonal' }, { elapsedMs: -1 }, { shownAt: value.chosenAt, chosenAt: value.shownAt },
        { name: 'unrequested person' }])
        assert.notEqual(validateEvent({ ...value, ...change }, Date.parse('2026-10-07T00:00:00.000Z')), null);
});

test('choice to D1 to owner CSV, idempotent retry, conflict, and test cleanup', async () => {
    const env = { DB: new MemoryD1(), ADMIN_TOKEN: 'owner-secret', ALLOWED_ORIGIN: origin };
    const value = event();
    assert.equal((await call(env, '/admin/choices.csv', 'GET')).status, 401);
    assert.equal((await call(env, '/admin/test-sessions', 'POST', { sessionId: value.sessionId }, 'owner-secret')).status, 200);
    const first = await call(env, '/choices', 'POST', value);
    assert.equal(first.status, 201);
    assert.equal(first.headers.get('access-control-allow-origin'), origin);
    assert.equal((await call(env, '/choices', 'POST', value)).status, 200);
    assert.equal((await call(env, '/choices', 'POST', { ...value, id: uuid(), choice: 'B' })).status, 409);
    assert.equal(env.DB.choices.length, 1);
    assert.equal(env.DB.choices[0].environment, 'test');
    const csv = await (await call(env, '/admin/choices.csv?environment=test&version=' + manifest.version,
        'GET', null, 'owner-secret')).text();
    assert.match(csv, new RegExp(value.id));
    assert.match(csv, new RegExp(value.pairId));
    assert.match(csv, /received_at/);
    const summary = await (await call(env, '/admin/summary', 'GET', null, 'owner-secret')).json();
    assert.deepEqual(summary.groups, [{ environment: 'test', dataset_version: manifest.version, choices: 1, sessions: 1 }]);
    const productionCsv = await (await call(env, '/admin/choices.csv', 'GET', null, 'owner-secret')).text();
    assert.equal(productionCsv.trim().split('\r\n').length, 1);
    const deletion = await call(env, '/admin/test-sessions/' + value.sessionId, 'DELETE', null, 'owner-secret');
    assert.deepEqual(await deletion.json(), { ok: true, deleted: 1 });
    assert.equal(env.DB.choices.length, 0);
});

test('a new round does not overwrite a prior record', async () => {
    const env = { DB: new MemoryD1(), ADMIN_TOKEN: 'owner-secret', ALLOWED_ORIGIN: origin };
    const first = event();
    const second = event({ sessionId: first.sessionId });
    assert.equal((await call(env, '/choices', 'POST', first)).status, 201);
    assert.equal((await call(env, '/choices', 'POST', second)).status, 201);
    assert.equal(env.DB.choices.length, 2);
    const csv = await (await call(env, '/admin/choices.csv', 'GET', null, 'owner-secret')).text();
    assert.equal(csv.trim().split('\r\n').length, 3);
});
