import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../preview/index.html',import.meta.url),'utf8');
test('corrupt saved workspace blocks project creation before state mutation',()=>{
 assert.match(html,/if\(storageError\)\{\$\('backup-status'\)\.textContent='Cannot create a project until workspace storage is recovered\.';return;\}const name=/);
});
test('corrupt saved workspace blocks misleading empty backup export',()=>{
 assert.match(html,/\$\('export'\)\.addEventListener\('click',\(\)=>\{try\{requireWritable\(\);const data=/);
});
test('recovery import clears storage error only after atomic save succeeds',()=>{
 assert.match(html,/saveAtomicWorkspace\(localStorage,incoming\.projects,incoming\.productions\);projects=incoming\.projects;productions=incoming\.productions;storageError=null;/);
});
test('corrupt workspace prevents approval changes before mutating records',()=>{
 assert.match(html,/checkbox\.addEventListener\('change',\(\)=>\{try\{requireWritable\(\);\}catch\(err\)/);
});
