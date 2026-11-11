import test from 'node:test';
import assert from 'node:assert/strict';
import {collectWorkspaceRecovery} from '../lib/workspace-recovery.mjs';
import {NEXT_ATOMIC_KEY,NEXT_WORKSPACE_KEYS} from '../lib/next-workspace-storage.mjs';
function storage(data){return {getItem:k=>Object.hasOwn(data,k)?data[k]:null};}
test('raw recovery preserves malformed canonical workspace exactly',()=>{const raw='{bad json';const result=collectWorkspaceRecovery(storage({[NEXT_ATOMIC_KEY]:raw}));assert.equal(result.records[NEXT_ATOMIC_KEY],raw);assert.equal(result.format,'vision-studio-raw-recovery');});
test('raw recovery retains legacy and canonical records simultaneously',()=>{const result=collectWorkspaceRecovery(storage({[NEXT_ATOMIC_KEY]:'new',[NEXT_WORKSPACE_KEYS.projects]:'old'}));assert.equal(Object.keys(result.records).length,2);});
test('raw recovery refuses misleading empty export',()=>assert.throws(()=>collectWorkspaceRecovery(storage({})),/No saved/));
test('raw recovery never mutates storage',()=>{const store={getItem:k=>k===NEXT_ATOMIC_KEY?'x':null,setItem(){throw Error('must not write')},removeItem(){throw Error('must not delete')}};assert.equal(collectWorkspaceRecovery(store).records[NEXT_ATOMIC_KEY],'x');});
