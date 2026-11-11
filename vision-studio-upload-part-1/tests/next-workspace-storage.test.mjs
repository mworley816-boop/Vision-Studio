import test from 'node:test';import assert from 'node:assert/strict';
import {loadNextWorkspace,saveNextWorkspace,NEXT_WORKSPACE_KEYS,NEXT_ATOMIC_KEY} from '../lib/next-workspace-storage.mjs';
function memory(){const values=new Map();return {getItem:k=>values.has(k)?values.get(k):null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};}
const project={id:'a',name:'Example',kind:'music',mode:'approval'};
const production={id:'b',projectId:'a',kind:'music',scenes:[]};
const bible={projectId:'a',characters:[],locations:[]};
test('loads missing workspace as empty',()=>assert.deepEqual(loadNextWorkspace(memory()),{projects:[],productions:[],bibles:[]}));
test('round trips valid records',()=>{const store=memory(),data={projects:[project],productions:[production],bibles:[bible]};saveNextWorkspace(store,data);assert.deepEqual(loadNextWorkspace(store),data);});
test('refuses corrupted saved JSON instead of replacing it',()=>{const store=memory();store.setItem(NEXT_WORKSPACE_KEYS.projects,'{broken');assert.throws(()=>loadNextWorkspace(store),/damaged/);});
test('rejects cross-project and cross-type productions before writing',()=>{const store=memory();assert.throws(()=>saveNextWorkspace(store,{projects:[project],productions:[{...production,kind:'episode'}],bibles:[]}),/invalid/);assert.equal(store.getItem(NEXT_WORKSPACE_KEYS.projects),null);});
test('rolls back earlier writes when later storage write fails',()=>{const store=memory();store.setItem(NEXT_WORKSPACE_KEYS.projects,'original');const failing={...store,setItem(k,v){if(k===NEXT_ATOMIC_KEY)throw Error('quota');store.setItem(k,v)}};assert.throws(()=>saveNextWorkspace(failing,{projects:[project],productions:[production],bibles:[bible]}),/quota/);assert.equal(store.getItem(NEXT_WORKSPACE_KEYS.projects),'original');});
