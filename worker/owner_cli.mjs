import { readFile, stat, writeFile } from 'node:fs/promises';

const [command, argument] = process.argv.slice(2);
const sessionPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const tokenPath = process.env.CAC_ADMIN_TOKEN_FILE || '/private/tmp/cac-art-admin-token';
if ((await stat(tokenPath)).mode & 0o077) throw new Error('Owner token file must be readable only by its owner (mode 600)');
const token = (await readFile(tokenPath, 'utf8')).trim();
if (token.length < 32) throw new Error('Owner token is missing or too short');
const config = JSON.parse(await readFile(new URL('../web/collection_config.json', import.meta.url), 'utf8'));
if (!config.endpoint?.startsWith('https://')) throw new Error('No deployed collection endpoint');

let path, method = 'GET', body;
if (command === 'summary') path = '/admin/summary';
else if (command === 'export-production' || command === 'export-test') {
    if (!argument) throw new Error('Provide an output CSV path');
    const environment = command === 'export-test' ? 'test' : 'production';
    path = `/admin/choices.csv?environment=${environment}&version=${encodeURIComponent(config.datasetVersion)}`;
} else if (command === 'register-test' && sessionPattern.test(argument || '')) {
    path = '/admin/test-sessions'; method = 'POST'; body = JSON.stringify({ sessionId: argument });
} else if (command === 'delete-test' && sessionPattern.test(argument || '')) {
    path = `/admin/test-sessions/${argument}`; method = 'DELETE';
} else throw new Error('Usage: owner_cli.mjs summary | export-production FILE | export-test FILE | register-test UUID | delete-test UUID');

const response = await fetch(config.endpoint + path, {
    method,
    headers: { authorization: `Bearer ${token}`, ...(body ? { 'content-type': 'application/json' } : {}) },
    body
});
if (!response.ok) throw new Error(`Owner API returned HTTP ${response.status}: ${await response.text()}`);
if (command.startsWith('export-')) {
    const csv = await response.text();
    await writeFile(argument, csv, { flag: 'wx', mode: 0o600 });
    console.log(`Saved ${argument}`);
} else console.log(await response.text());
