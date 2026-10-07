import manifest from './manifest.json' with { type: 'json' };

const PAIRS = new Map(manifest.pairs.map(pair => [pair.id, pair]));
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EVENT_FIELDS = ['id', 'sessionId', 'roundId', 'datasetVersion', 'pairId', 'position',
    'aArtworkId', 'bArtworkId', 'choice', 'layout', 'shownAt', 'chosenAt', 'elapsedMs'];
const CSV_FIELDS = ['id', 'session_id', 'round_id', 'dataset_version', 'pair_id', 'position',
    'a_artwork_id', 'b_artwork_id', 'choice', 'layout', 'shown_at', 'chosen_at',
    'elapsed_ms', 'received_at', 'environment'];

function json(data, status = 200, headers = {}) {
    return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store', ...headers } });
}

function cors(origin) {
    return { 'access-control-allow-origin': origin, 'vary': 'Origin',
        'access-control-allow-methods': 'POST, OPTIONS', 'access-control-allow-headers': 'content-type',
        'access-control-max-age': '600' };
}

function timestamp(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value)) return NaN;
    const date = Date.parse(value);
    return Number.isFinite(date) && new Date(date).toISOString() === value ? date : NaN;
}

export function validateEvent(value, now = Date.now()) {
    if (!value || typeof value !== 'object' || Array.isArray(value)
        || Object.keys(value).length !== EVENT_FIELDS.length
        || EVENT_FIELDS.some(field => !Object.hasOwn(value, field))) return 'Unexpected or missing event fields';
    if (![value.id, value.sessionId, value.roundId].every(id => typeof id === 'string' && UUID.test(id))) return 'Invalid event identifiers';
    if (value.datasetVersion !== manifest.version) return 'Unknown dataset version';
    const pair = PAIRS.get(value.pairId);
    if (!pair || value.position !== pair.position || value.aArtworkId !== pair.a
        || value.bArtworkId !== pair.b) return 'Pair, artwork, or position does not match the frozen dataset';
    if (value.choice !== 'A' && value.choice !== 'B') return 'Choice must be A or B';
    if (value.layout !== 'side-by-side' && value.layout !== 'stacked') return 'Invalid display layout';
    if (!Number.isInteger(value.elapsedMs) || value.elapsedMs < 0 || value.elapsedMs > 2592000000) return 'Invalid elapsed time';
    const shown = timestamp(value.shownAt);
    const chosen = timestamp(value.chosenAt);
    if (!Number.isFinite(shown) || !Number.isFinite(chosen) || chosen < shown
        || shown > now + 300000 || chosen > now + 300000
        || chosen - shown > 2592000000) return 'Invalid display or choice time';
    if (Math.abs(chosen - shown - value.elapsedMs) > 5000) return 'Elapsed time does not match timestamps';
    return null;
}

function csvCell(value) {
    const text = String(value ?? '');
    const safe = /^[=+\-@\t\r]/.test(text) ? "'" + text : text;
    return '"' + safe.replaceAll('"', '""') + '"';
}

async function authorized(request, env) {
    const supplied = request.headers.get('authorization')?.replace(/^Bearer /, '') ?? '';
    if (!env.ADMIN_TOKEN || !supplied) return false;
    const enc = new TextEncoder();
    const [a, b] = await Promise.all([crypto.subtle.digest('SHA-256', enc.encode(supplied)),
        crypto.subtle.digest('SHA-256', enc.encode(env.ADMIN_TOKEN))]);
    const x = new Uint8Array(a), y = new Uint8Array(b);
    let difference = 0;
    for (let i = 0; i < x.length; i += 1) difference |= x[i] ^ y[i];
    return difference === 0;
}

async function saveEvent(request, env) {
    const size = Number(request.headers.get('content-length') ?? 0);
    if (size > 4096) return json({ ok: false, error: 'Event too large' }, 413);
    let value;
    try {
        const body = await request.text();
        if (body.length > 4096) return json({ ok: false, error: 'Event too large' }, 413);
        value = JSON.parse(body);
    } catch { return json({ ok: false, error: 'Invalid JSON' }, 400); }
    const error = validateEvent(value);
    if (error) return json({ ok: false, error }, 400);
    const payload = JSON.stringify(value);
    const test = await env.DB.prepare('SELECT session_id FROM test_sessions WHERE session_id = ?')
        .bind(value.sessionId).first();
    const environment = test ? 'test' : 'production';
    const receivedAt = new Date().toISOString();
    const result = await env.DB.prepare(`INSERT OR IGNORE INTO choices
      (id,session_id,round_id,dataset_version,pair_id,position,a_artwork_id,b_artwork_id,
       choice,layout,shown_at,chosen_at,elapsed_ms,received_at,environment,payload_json)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(value.id, value.sessionId, value.roundId,
        value.datasetVersion, value.pairId, value.position, value.aArtworkId,
        value.bArtworkId, value.choice, value.layout, value.shownAt, value.chosenAt, value.elapsedMs,
        receivedAt, environment, payload).run();
    if (result.meta?.changes === 1) return json({ ok: true, duplicate: false, id: value.id }, 201);
    const existing = await env.DB.prepare(`SELECT id,payload_json FROM choices
      WHERE id = ? OR (session_id = ? AND round_id = ? AND (pair_id = ? OR position = ?)) LIMIT 1`)
        .bind(value.id, value.sessionId, value.roundId, value.pairId, value.position).first();
    if (existing?.id === value.id && existing.payload_json === payload)
        return json({ ok: true, duplicate: true, id: value.id });
    return json({ ok: false, error: 'A different choice is already recorded for this event or pair' }, 409);
}

async function admin(request, env, path, url) {
    if (!await authorized(request, env)) return json({ ok: false, error: 'Unauthorized' }, 401);
    if (path === '/admin/summary' && request.method === 'GET') {
        const rows = (await env.DB.prepare(`SELECT environment,dataset_version,
            COUNT(*) AS choices,COUNT(DISTINCT session_id) AS sessions
            FROM choices GROUP BY environment,dataset_version ORDER BY environment,dataset_version`).all()).results;
        return json({ ok: true, groups: rows });
    }
    if (path === '/admin/choices.csv' && request.method === 'GET') {
        const environment = url.searchParams.get('environment') ?? 'production';
        if (!['production', 'test'].includes(environment)) return json({ ok: false, error: 'Invalid environment' }, 400);
        const version = url.searchParams.get('version');
        if (version && !/^[a-z0-9][a-z0-9-]{0,79}$/.test(version))
            return json({ ok: false, error: 'Invalid version' }, 400);
        const query = `SELECT ${CSV_FIELDS.join(',')} FROM choices WHERE environment = ?`
            + (version ? ' AND dataset_version = ?' : '') + ' ORDER BY received_at,id';
        const rows = (await env.DB.prepare(query).bind(...(version ? [environment, version] : [environment])).all()).results;
        const content = [CSV_FIELDS.join(','), ...rows.map(row => CSV_FIELDS.map(key => csvCell(row[key])).join(','))].join('\r\n') + '\r\n';
        return new Response(content, { headers: { 'content-type': 'text/csv; charset=utf-8',
            'content-disposition': `attachment; filename="cac-choices-${environment}.csv"`,
            'cache-control': 'no-store', 'x-content-type-options': 'nosniff' } });
    }
    if (path === '/admin/test-sessions' && request.method === 'POST') {
        let body;
        try { body = await request.json(); } catch { return json({ ok: false, error: 'Invalid JSON' }, 400); }
        if (!body || Object.keys(body).length !== 1 || !UUID.test(body.sessionId ?? ''))
            return json({ ok: false, error: 'Invalid session ID' }, 400);
        const prior = await env.DB.prepare('SELECT id FROM choices WHERE session_id = ? LIMIT 1')
            .bind(body.sessionId).first();
        if (prior) return json({ ok: false, error: 'Register before the first choice' }, 409);
        await env.DB.prepare('INSERT OR IGNORE INTO test_sessions VALUES (?,?)')
            .bind(body.sessionId, new Date().toISOString()).run();
        return json({ ok: true, sessionId: body.sessionId });
    }
    const match = /^\/admin\/test-sessions\/([0-9a-f-]+)$/i.exec(path);
    if (match && request.method === 'DELETE' && UUID.test(match[1])) {
        const session = match[1];
        const registered = await env.DB.prepare('SELECT session_id FROM test_sessions WHERE session_id = ?')
            .bind(session).first();
        if (!registered) return json({ ok: false, error: 'Unknown test session' }, 404);
        const deleted = await env.DB.prepare("DELETE FROM choices WHERE session_id = ? AND environment = 'test'")
            .bind(session).run();
        await env.DB.prepare('DELETE FROM test_sessions WHERE session_id = ?').bind(session).run();
        return json({ ok: true, deleted: deleted.meta?.changes ?? 0 });
    }
    return json({ ok: false, error: 'Not found' }, 404);
}

export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        const path = url.pathname;
        if (path === '/health' && request.method === 'GET')
            return json({ ok: true, datasetVersion: manifest.version });
        if (path.startsWith('/admin/')) return admin(request, env, path, url);
        const origin = request.headers.get('origin');
        if (path !== '/choices' || origin !== env.ALLOWED_ORIGIN)
            return json({ ok: false, error: 'Not found' }, 404);
        if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(origin) });
        if (request.method !== 'POST') return json({ ok: false, error: 'Method not allowed' }, 405);
        try {
            const response = await saveEvent(request, env);
            const headers = new Headers(response.headers);
            for (const [key, value] of Object.entries(cors(origin))) headers.set(key, value);
            return new Response(response.body, { status: response.status, headers });
        } catch (error) {
            console.error('Choice storage error', error);
            return json({ ok: false, error: 'Storage unavailable; retry the same choice' }, 503, cors(origin));
        }
    }
};
