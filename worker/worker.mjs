import experienceManifest from './experience_manifest.json' with { type: 'json' };
import { handleExperience, adminExperience } from './experience.mjs';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CSV_FIELDS = ['id', 'session_id', 'round_id', 'dataset_version', 'pair_id', 'position',
    'a_artwork_id', 'b_artwork_id', 'choice', 'layout', 'shown_at', 'chosen_at',
    'elapsed_ms', 'received_at', 'environment'];

function json(data, status = 200, headers = {}) {
    return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store', ...headers } });
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

async function admin(request, env, path, url) {
    if (!await authorized(request, env)) return json({ ok: false, error: 'Unauthorized' }, 401);
    if (['/admin/experience-summary','/admin/experience-countries',
        '/admin/experience-ips','/admin/experience.csv'].includes(path)
        && request.method === 'GET')
        return adminExperience(env, url);
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
            'content-disposition': `attachment; filename="follow-your-eye-choices-${environment}.csv"`,
            'cache-control': 'no-store', 'x-content-type-options': 'nosniff' } });
    }
    if (path === '/admin/test-sessions' && request.method === 'POST') {
        let body;
        try { body = await request.json(); } catch { return json({ ok: false, error: 'Invalid JSON' }, 400); }
        if (!body || Object.keys(body).length !== 1 || !UUID.test(body.sessionId ?? ''))
            return json({ ok: false, error: 'Invalid session ID' }, 400);
        const prior = await env.DB.prepare('SELECT id FROM choices WHERE session_id = ? LIMIT 1')
            .bind(body.sessionId).first();
        const experiencePrior = await env.DB.prepare('SELECT id FROM experience_choices WHERE session_id = ? LIMIT 1')
            .bind(body.sessionId).first();
        if (prior || experiencePrior) return json({ ok: false, error: 'Register before the first choice' }, 409);
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
        const experienceDeleted = await env.DB.prepare("DELETE FROM experience_choices WHERE session_id = ? AND environment = 'test'")
            .bind(session).run();
        await env.DB.prepare('DELETE FROM test_sessions WHERE session_id = ?').bind(session).run();
        return json({ ok: true, deleted: (deleted.meta?.changes ?? 0) + (experienceDeleted.meta?.changes ?? 0) });
    }
    return json({ ok: false, error: 'Not found' }, 404);
}

export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        const path = url.pathname;
        if (path === '/health' && request.method === 'GET')
            return json({ ok: true, datasetVersion: experienceManifest.version });
        if (path.startsWith('/admin/')) return admin(request, env, path, url);
        if (path.startsWith('/experience/')) return handleExperience(request, env, url);
        return json({ ok: false, error: 'Not found' }, 404);
    }
};
