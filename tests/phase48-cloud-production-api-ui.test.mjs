import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const page=readFileSync(new URL('../app/cloud/page.tsx',import.meta.url),'utf8');
const api=readFileSync(new URL('../app/api/productions/route.ts',import.meta.url),'utf8');
test('cloud UI creates production metadata through server endpoint',()=>{
 assert.match(page,/fetch\('\/api\/productions'/);
 assert.match(page,/method:'POST'/);
 assert.match(page,/credentials:'same-origin'/);
 assert.match(page,/project\.kind==='series'\?'episode':'music'/);
 assert.doesNotMatch(page,/createCloudProduction\(browserClient\(\)/);
});
test('cloud UI handles server refusal and disables duplicate creation',()=>{
 assert.match(page,/response\.ok/);
 assert.match(page,/payload\.error/);
 assert.match(page,/disabled=\{busy\} onClick=\{\(\)=>addProduction\(project\)\}/);
});
test('API remains metadata-only with no payment authorization',()=>{
 assert.match(api,/generationEnabled:false,paymentAuthorized:false,jobCreated:false/);
});
