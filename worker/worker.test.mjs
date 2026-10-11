import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import worker from './worker.mjs';

const origin = 'https://vincentliu.ai';

function database() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(readFileSync(new URL('./schema.sql', import.meta.url), 'utf8'));
  return {
    sqlite,
    prepare(sql) {
      const bind = (...params) => {
        const statement = sqlite.prepare(sql);
        return {
          first: async () => statement.get(...params) ?? null,
          all: async () => ({ results: statement.all(...params) }),
          run: async () => ({ meta: { changes: statement.run(...params).changes } })
        };
      };
      return { bind, ...bind() };
    }
  };
}

function call(env, path, method = 'GET', body = null, token = null) {
  return worker.fetch(new Request(`https://collector.example${path}`, {
    method,
    headers: { origin, ...(body ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {})
  }), env);
}

test('retired public choice route rejects writes and preflight', async () => {
  const env = { DB: database(), ADMIN_TOKEN: 'owner-secret', ALLOWED_ORIGIN: origin };
  assert.equal((await call(env, '/choices', 'POST', { choice: 'A' })).status, 404);
  assert.equal((await call(env, '/choices', 'OPTIONS')).status, 404);
  assert.equal(env.DB.sqlite.prepare('SELECT COUNT(*) AS n FROM choices').get().n, 0);
});

test('historical choices remain available only through authenticated owner export', async () => {
  const DB = database(), env = { DB, ADMIN_TOKEN: 'owner-secret', ALLOWED_ORIGIN: origin };
  const session = crypto.randomUUID(), round = crypto.randomUUID();
  DB.sqlite.prepare(`INSERT INTO choices
    (id,session_id,round_id,dataset_version,pair_id,position,a_artwork_id,b_artwork_id,
     choice,layout,shown_at,chosen_at,elapsed_ms,received_at,environment,payload_json)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
      crypto.randomUUID(), session, round, 'archived-paintings-v1', 'archived-pair', 1,
      '100', '200', 'A', 'side-by-side', '2026-09-11T00:00:00.000Z',
      '2026-09-11T00:00:03.000Z', 3000, '2026-09-11T00:00:04.000Z',
      'production', '{"choice":"A"}'
    );
  assert.equal((await call(env, '/admin/choices.csv')).status, 401);
  const summary = await (await call(env, '/admin/summary', 'GET', null, 'owner-secret')).json();
  assert.deepEqual(summary.groups, [{ environment: 'production', dataset_version: 'archived-paintings-v1',
    choices: 1, sessions: 1 }]);
  const csv = await (await call(env, '/admin/choices.csv', 'GET', null, 'owner-secret')).text();
  assert.match(csv, /archived-pair/);
  assert.match(csv, /archived-paintings-v1/);
  assert.equal((await call(env, '/choices', 'POST', { choice: 'B' })).status, 404);
  assert.equal(DB.sqlite.prepare('SELECT COUNT(*) AS n FROM choices').get().n, 1);
});
