import test from 'node:test';
import assert from 'node:assert/strict';
import {migrateOfflineToNext} from '../lib/offline-to-next-migration.mjs';
import {ATOMIC_KEY} from '../preview/atomic-workspace.mjs';
import {NEXT_WORKSPACE_KEYS,loadNextWorkspace} from '../lib/next-workspace-storage.mjs';
function storage(){const m=new Map();return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)};}
const project={id:'p1',name:'Film',kind:'music',mode:'approval'};
const production={id:'prod1',projectId:'p1',kind:'music',title:'Song',status:'draft',spentCents:0,reservedCents:0,scenes:[{id:'s1',description:'Opening',approved:true}]};
test('migrates offline projects scenes and approvals without deleting source',()=>{const s=storage();const source=JSON.stringify({version:3,projects:[project],productions:[production]});s.setItem(ATOMIC_KEY,source);assert.equal(migrateOfflineToNext(s).migrated,true);const result=loadNextWorkspace(s);assert.equal(result.productions[0].scenes[0].approved,true);assert.equal(result.bibles[0].projectId,'p1');assert.equal(s.getItem(ATOMIC_KEY),source);});
test('does not overwrite existing Next workspace',()=>{const s=storage();s.setItem(ATOMIC_KEY,JSON.stringify({version:3,projects:[project],productions:[]}));s.setItem(NEXT_WORKSPACE_KEYS.projects,'broken');assert.equal(migrateOfflineToNext(s).migrated,false);assert.equal(s.getItem(NEXT_WORKSPACE_KEYS.projects),'broken');});
test('rejects damaged offline data without writing Next keys',()=>{const s=storage();s.setItem(ATOMIC_KEY,'{bad');assert.throws(()=>migrateOfflineToNext(s));for(const key of Object.values(NEXT_WORKSPACE_KEYS))assert.equal(s.getItem(key),null);});
test('no-op when no offline workspace exists',()=>{const s=storage();assert.equal(migrateOfflineToNext(s).migrated,false);});
