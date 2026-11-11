import test from 'node:test';
import assert from 'node:assert/strict';
import {loadOrMigrateWorkspace,ATOMIC_KEY} from '../preview/atomic-workspace.mjs';
const project={id:'p1',name:'Music',kind:'music',mode:'approval'};
const production={id:'v1',projectId:'p1',kind:'music',title:'Music',status:'draft',spentCents:0,reservedCents:0,scenes:[{id:'s1',description:'Scene',approved:true}]};
function store(initial={}){const values=new Map(Object.entries(initial));return {getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),values};}
const legacy={'vision-studio-offline-preview-v1':JSON.stringify([project]),'vision-studio-offline-productions-v1':JSON.stringify([production])};
test('legacy projects and approved scenes migrate atomically',()=>{const s=store(legacy);const result=loadOrMigrateWorkspace(s);assert.equal(result.migrated,true);assert.equal(result.workspace.productions[0].scenes[0].approved,true);assert.ok(s.getItem(ATOMIC_KEY));assert.equal(s.getItem('vision-studio-offline-productions-v1'),legacy['vision-studio-offline-productions-v1']);});
test('migration is idempotent and prefers current workspace',()=>{const s=store(legacy);loadOrMigrateWorkspace(s);s.setItem('vision-studio-offline-preview-v1','invalid');const result=loadOrMigrateWorkspace(s);assert.equal(result.migrated,false);assert.equal(result.workspace.projects.length,1);});
test('corrupted current workspace never silently falls back to legacy',()=>{const s=store({...legacy,[ATOMIC_KEY]:'{broken'});assert.throws(()=>loadOrMigrateWorkspace(s));assert.equal(s.getItem(ATOMIC_KEY),'{broken');});
test('invalid legacy scenes are not discarded or overwritten',()=>{const s=store({...legacy,'vision-studio-offline-productions-v1':'{broken'});assert.throws(()=>loadOrMigrateWorkspace(s),/Legacy workspace/);assert.equal(s.getItem(ATOMIC_KEY),null);});
test('failed migration preserves old keys and does not create v3',()=>{const s=store(legacy);s.setItem=()=>{throw Error('quota');};assert.throws(()=>loadOrMigrateWorkspace(s),/quota/);assert.equal(s.getItem(ATOMIC_KEY),null);assert.equal(s.getItem('vision-studio-offline-preview-v1'),legacy['vision-studio-offline-preview-v1']);});
