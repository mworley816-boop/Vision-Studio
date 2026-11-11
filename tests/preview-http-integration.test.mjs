import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {createPreviewServer} from '../scripts/preview-server.mjs';

async function withServer(fn){
  const server=createPreviewServer();
  server.listen(0,'127.0.0.1');
  await once(server,'listening');
  try {return await fn(`http://127.0.0.1:${server.address().port}`);}
  finally {await new Promise((resolve,reject)=>server.close(err=>err?reject(err):resolve()));}
}

test('offline preview serves interactive application and project bridge',()=>withServer(async base=>{
  const page=await fetch(base+'/');
  assert.equal(page.status,200);
  const html=await page.text();
  assert.match(html,/id="create"/);
  assert.match(html,/Create local draft/);
  assert.match(html,/workspace-bridge\.mjs/);
  assert.match(html,/Content-Security-Policy|OFFLINE DESIGN PREVIEW/);
  const bridge=await fetch(base+'/workspace-bridge.mjs');
  assert.equal(bridge.status,200);
  assert.match(await bridge.text(),/newProduction/);
}));

test('offline preview serves production modules with JS MIME type',()=>withServer(async base=>{
  for(const path of ['/project-editor.mjs','/workspace-backup.mjs','/lib/workspace.mjs','/lib/budget.mjs']){
    const response=await fetch(base+path);
    assert.equal(response.status,200,path);
    assert.match(response.headers.get('content-type'),/javascript/);
    assert.ok((await response.text()).length>30);
  }
}));

test('offline preview rejects mutation requests and private routes',()=>withServer(async base=>{
  const post=await fetch(base+'/',{method:'POST'});
  assert.equal(post.status,405);
  assert.equal(post.headers.get('allow'),'GET, HEAD');
  for(const path of ['/api/production-feed','/../package.json','/secrets','/app/page.tsx']){
    const response=await fetch(base+path);
    assert.equal(response.status,404,path);
  }
}));

test('offline preview returns CSP and disables caching',()=>withServer(async base=>{
  const response=await fetch(base+'/');
  assert.match(response.headers.get('content-security-policy'),/connect-src 'none'/);
  assert.equal(response.headers.get('cache-control'),'no-store');
  assert.equal(response.headers.get('x-content-type-options'),'nosniff');
}));
