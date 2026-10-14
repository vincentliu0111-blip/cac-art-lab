import { readFile, stat, writeFile } from 'node:fs/promises';

const [command, argument] = process.argv.slice(2);
const sessionPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const tokenPath = process.env.FYE_ADMIN_TOKEN_FILE || '/private/tmp/follow-your-eye-admin-token';
if ((await stat(tokenPath)).mode & 0o077) throw new Error('Owner token file must be readable only by its owner (mode 600)');
const token = (await readFile(tokenPath, 'utf8')).trim();
if (token.length < 32) throw new Error('Owner token is missing or too short');
const config = JSON.parse(await readFile(new URL('../web/collection_config.json', import.meta.url), 'utf8'));
if (!config.endpoint?.startsWith('https://')) throw new Error('No deployed collection endpoint');

let path, method = 'GET', body;
if (command === 'summary') path = '/admin/experience-summary';
else if (command === 'countries') path = '/admin/experience-countries';
else if (command === 'countries-test') path = '/admin/experience-countries?environment=test';
else if (command === 'ips') path = '/admin/experience-ips';
else if (command === 'ips-test') path = '/admin/experience-ips?environment=test';
else if (command === 'summary-legacy') path = '/admin/summary';
else if (['export-production', 'export-test', 'export-legacy-production', 'export-legacy-test'].includes(command)) {
    if (!argument) throw new Error('Provide an output CSV path');
    const environment = command.endsWith('test') ? 'test' : 'production';
    path = command.startsWith('export-legacy-')
        ? `/admin/choices.csv?environment=${environment}`
        : `/admin/experience.csv?environment=${environment}`;
} else if (command === 'register-test' && sessionPattern.test(argument || '')) {
    path = '/admin/test-sessions'; method = 'POST'; body = JSON.stringify({ sessionId: argument });
} else if (command === 'delete-test' && sessionPattern.test(argument || '')) {
    path = `/admin/test-sessions/${argument}`; method = 'DELETE';
} else throw new Error('Usage: owner_cli.mjs summary | countries | countries-test | ips | ips-test | summary-legacy | export-production FILE | export-test FILE | export-legacy-production FILE | export-legacy-test FILE | register-test UUID | delete-test UUID');

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
