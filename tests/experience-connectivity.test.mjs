import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../web/app.js', import.meta.url), 'utf8');
const helper = source.slice(source.indexOf('async function fetchWithTimeout('), source.indexOf('function freshState()'));
const flow = source.slice(source.indexOf('async function checkCollector()'), source.indexOf("$('chooseLeft').addEventListener", source.indexOf('async function checkCollector()')));
assert.ok(helper.startsWith('async function fetchWithTimeout(') && flow.startsWith('async function checkCollector()'));

test('a failed save stays queued and retries without a health preflight', async () => {
  const event = {id:'choice-1'};
  const elements = new Map();
  const get = id => {
    if (!elements.has(id)) elements.set(id,{hidden:false,textContent:'',complete:true,naturalWidth:100,disabled:false});
    return elements.get(id);
  };
  const requests = [];
  let postFails = true, configFails = false;
  const context = vm.createContext({
    state:{queue:[event],index:0,deck:[{},{}]},data:{version:'dataset-1'},location:{hostname:'vincentliu.ai'},
    collector:false,connectionProblem:false,checkingCollector:false,syncing:false,hasSynced:false,rejected:false,
    syncController:null,collectorEndpoint:'',view:'play',$:get,t:key=>key,
    AbortController,setTimeout,clearTimeout,
    renderPlay(){},renderComparisons(){},
    async mutateState(change){change(context.state);},
    async fetch(url){
      requests.push(url);
      if(url==='./collection_config.json'){
        if(configFails)throw Error('Configuration unavailable');
        return {ok:true,json:async()=>({datasetVersion:'dataset-1',endpoint:'https://collector.example'})};
      }
      if(url==='https://collector.example/experience/choices'){
        if(postFails)throw Error('Network unavailable');
        return {ok:true,json:async()=>({ok:true,id:event.id})};
      }
      throw Error(`Unexpected request: ${url}`);
    },
  });
  vm.runInContext(helper+flow,context);
  await vm.runInContext('checkCollector()',context);
  assert.equal(context.state.queue.length,1);
  assert.equal(get('pendingExplanation').textContent,'saveFailed');
  assert.equal(get('retrySave').hidden,false);
  assert.deepEqual(requests,['./collection_config.json','https://collector.example/experience/choices']);

  postFails=false;
  await vm.runInContext('checkCollector()',context);
  assert.equal(context.state.queue.length,0);
  assert.equal(context.hasSynced,true);
  assert.equal(get('retrySave').hidden,true);
  assert.equal(requests.filter(url=>url.endsWith('/experience/health')).length,0);

  configFails=true;
  await vm.runInContext('checkCollector()',context);
  assert.equal(get('connectionNotice').hidden,false);
  assert.equal(get('chooseLeft').disabled,true);
  assert.equal(get('chooseRight').disabled,true);
});
