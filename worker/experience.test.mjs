import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import worker from './worker.mjs';
import {validateExperienceEvent} from './experience.mjs';
import manifest from './experience_manifest.json' with {type:'json'};

const origin = 'https://vincentliu.ai';
const uuid = () => crypto.randomUUID();

function database() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(readFileSync(new URL('./schema.sql', import.meta.url), 'utf8'));
  return {
    sqlite,
    prepare(sql) {
      const bind = (...params) => {
        const stmt = sqlite.prepare(sql);
        return {
          first: async () => stmt.get(...params) ?? null,
          all: async () => ({results: stmt.all(...params)}),
          run: async () => ({meta:{changes:stmt.run(...params).changes}})
        };
      };
      return {bind, ...bind()};
    }
  };
}

function event(overrides = {}) {
  const pair = manifest.pairs[0], chosenAt = new Date(), shownAt = new Date(chosenAt.getTime()-3000);
  return {id:uuid(),sessionId:uuid(),roundId:uuid(),datasetVersion:manifest.version,
    pairId:pair.id,leftId:pair.a,rightId:pair.b,choice:'A',position:1,layout:'side-by-side',
    source:'direct',shownAt:shownAt.toISOString(),chosenAt:chosenAt.toISOString(),elapsedMs:3000,
    profile:{mood:'',interests:[],language:''},consent:true,...overrides};
}

async function call(env, path, method='GET', body=null, token=null) {
  const headers={origin,...(body?{'content-type':'application/json'}:{}),
    ...(token?{authorization:`Bearer ${token}`}:{})};
  return worker.fetch(new Request(`https://collector.example${path}`,{
    method,headers,...(body?{body:JSON.stringify(body)}:{})}),env);
}

test('frozen v7 pairs and required online event fields', () => {
  assert.equal(manifest.pairs.length,2860);
  const good=event();
  assert.equal(validateExperienceEvent(good),null);
  assert.equal(validateExperienceEvent({...good,choice:'skip'}),null);
  for(const change of [{datasetVersion:'other'},{leftId:'0'},{position:11},{consent:false},
    {profile:{mood:'fake',interests:[],language:''}},{choice:'C'},{source:'bad/url'},
    {elapsedMs:-1},{name:'unrequested'}])
    assert.notEqual(validateExperienceEvent({...good,...change}),null);
});

test('v7 migration preserves the existing 60-pair table and data', () => {
  const sqlite=new DatabaseSync(':memory:');
  sqlite.exec(`CREATE TABLE choices (id TEXT PRIMARY KEY,payload_json TEXT NOT NULL);
    INSERT INTO choices VALUES ('old-event','{"choice":"A"}');`);
  sqlite.exec(readFileSync(new URL('./migrate_experience_v7.sql',import.meta.url),'utf8'));
  assert.equal(sqlite.prepare('SELECT payload_json FROM choices WHERE id = ?').get('old-event').payload_json,'{"choice":"A"}');
  assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE type='table' AND name='experience_choices'").get().n,1);
});

test('online v7 save, retry, conflict, community and private export use real SQLite', async () => {
  const DB=database(),env={DB,ADMIN_TOKEN:'owner-secret',ALLOWED_ORIGIN:origin};
  const pick=event(), session=pick.sessionId;
  assert.equal((await call(env,'/experience/health')).status,200);
  assert.equal((await call(env,'/admin/experience.csv')).status,401);
  assert.equal((await call(env,'/admin/test-sessions','POST',{sessionId:session},'owner-secret')).status,200);
  const first=await call(env,'/experience/choices','POST',pick);
  assert.equal(first.status,201);
  assert.equal(first.headers.get('access-control-allow-origin'),origin);
  assert.equal((await call(env,'/experience/choices','POST',pick)).status,200);
  assert.equal((await call(env,'/experience/choices','POST',{...pick,id:uuid(),choice:'B'})).status,409);
  assert.equal(DB.sqlite.prepare('SELECT COUNT(*) AS n FROM experience_choices').get().n,1);
  const csv=await (await call(env,'/admin/experience.csv?environment=test','GET',null,'owner-secret')).text();
  assert.match(csv,new RegExp(pick.id));
  assert.match(csv,/interests_json/);
  const community=await (await call(env,`/experience/community?pairs=${pick.pairId}`)).json();
  assert.deepEqual(community.pairs[pick.pairId],{a:0,b:0,total:0});
  const deleted=await (await call(env,`/admin/test-sessions/${session}`,'DELETE',null,'owner-secret')).json();
  assert.equal(deleted.deleted,1);
  assert.equal(DB.sqlite.prepare('SELECT COUNT(*) AS n FROM experience_choices').get().n,0);

  const publicPick=event({choice:'skip'});
  assert.equal((await call(env,'/experience/choices','POST',publicPick)).status,201);
  const second=event({choice:'B',sessionId:publicPick.sessionId,roundId:uuid()});
  assert.equal((await call(env,'/experience/choices','POST',second)).status,201);
  const counts=await (await call(env,`/experience/community?pairs=${pick.pairId}`)).json();
  assert.deepEqual(counts.pairs[pick.pairId],{a:0,b:1,total:1});
  const summary=await (await call(env,'/admin/experience-summary','GET',null,'owner-secret')).json();
  assert.deepEqual(summary.groups,[{environment:'production',dataset_version:manifest.version,choices:2,sessions:1}]);
  assert.equal((await call(env,'/experience/community?pairs=unknown')).status,400);
  assert.equal((await worker.fetch(new Request('https://collector.example/experience/health',
    {headers:{origin:'https://other.example'}}),env)).status,404);
});
