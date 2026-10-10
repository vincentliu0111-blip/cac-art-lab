// Local-only integration preview. Keeps the production config file untouched.
import {createServer} from 'node:http';
import {readFileSync, statSync} from 'node:fs';
import {resolve, extname} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import worker from '../worker/worker.mjs';
import manifest from '../worker/experience_manifest.json' with {type:'json'};

const port = Number(process.argv[2] || 8770);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid port');
const origin = `http://127.0.0.1:${port}`;
const root = resolve(new URL('../web/', import.meta.url).pathname);
const sqlite = new DatabaseSync(':memory:');
sqlite.exec(readFileSync(new URL('../worker/schema.sql', import.meta.url), 'utf8'));
const DB = {
  prepare(sql) {
    const bind = (...params) => {
      const stmt = sqlite.prepare(sql);
      return {first:async()=>stmt.get(...params)??null,
        all:async()=>({results:stmt.all(...params)}),
        run:async()=>({meta:{changes:stmt.run(...params).changes}})};
    };
    return {bind,...bind()};
  }
};
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript',
  '.json':'application/json','.css':'text/css','.jpg':'image/jpeg','.xml':'application/xml','.txt':'text/plain'};
createServer(async(req,res)=>{
  const url=new URL(req.url,origin);
  if(url.pathname==='/collection_config.json'){
    res.writeHead(200,{'content-type':'application/json'});
    res.end(JSON.stringify({datasetVersion:manifest.version,endpoint:origin}));return;
  }
  if(url.pathname.startsWith('/experience/')||url.pathname.startsWith('/admin/')){
    const chunks=[];for await(const chunk of req)chunks.push(chunk);
    const headers=new Headers(req.headers);headers.set('origin',origin);
    const response=await worker.fetch(new Request(origin+url.pathname+url.search,
      {method:req.method,headers,body:chunks.length?Buffer.concat(chunks):undefined}),
      {DB,ALLOWED_ORIGIN:origin,ADMIN_TOKEN:'preview-only-owner-token'});
    res.writeHead(response.status,Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));return;
  }
  const pathname=url.pathname==='/'?'/index.html':url.pathname;
  const file=resolve(root,'.'+decodeURIComponent(pathname));
  if(!file.startsWith(root+'/')){res.writeHead(404);res.end();return;}
  try{if(!statSync(file).isFile())throw new Error('Not a file');
    res.writeHead(200,{'content-type':types[extname(file)]||'application/octet-stream'});
    res.end(readFileSync(file));
  }catch{res.writeHead(404);res.end();}
}).listen(port,'127.0.0.1',()=>console.log(`Local preview at ${origin}`));
