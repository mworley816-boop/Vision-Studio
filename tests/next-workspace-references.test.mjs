import test from 'node:test';
import assert from 'node:assert/strict';
import {saveNextWorkspace,loadNextWorkspace,NEXT_ATOMIC_KEY} from '../lib/next-workspace-storage.mjs';
function store(){const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)};}
const base={projects:[{id:'p',kind:'music',mode:'approval'}],productions:[{id:'v',projectId:'p',kind:'music',spentCents:0,reservedCents:0,scenes:[{id:'s',description:'Shot',approved:false,characterIds:['c'],locationId:'l'}]}],bibles:[{projectId:'p',characters:[{id:'c',name:'Hero'}],locations:[{id:'l',name:'Studio'}]}]};
const copy=()=>structuredClone(base);
test('valid scene references survive canonical save and load',()=>{const s=store();saveNextWorkspace(s,copy());assert.deepEqual(loadNextWorkspace(s),base);});
test('reject unknown scene character without modifying storage',()=>{const s=store(),d=copy();d.productions[0].scenes[0].characterIds=['missing'];assert.throws(()=>saveNextWorkspace(s,d),/character references/);assert.equal(s.getItem(NEXT_ATOMIC_KEY),null);});
test('reject location belonging to another project',()=>{const s=store(),d=copy();d.projects.push({id:'other',kind:'music',mode:'approval'});d.bibles.push({projectId:'other',characters:[],locations:[{id:'foreign',name:'Elsewhere'}]});d.productions[0].scenes[0].locationId='foreign';assert.throws(()=>saveNextWorkspace(s,d),/location references/);});
test('reject duplicate Visual Bible identity IDs',()=>{const s=store(),d=copy();d.bibles[0].characters.push({id:'c',name:'Imposter'});assert.throws(()=>saveNextWorkspace(s,d),/Visual Bible references/);});
test('reject malformed scene reference arrays and preserve prior record',()=>{const s=store();saveNextWorkspace(s,copy());const before=s.getItem(NEXT_ATOMIC_KEY);const d=copy();d.productions[0].scenes[0].characterIds=['c','c'];assert.throws(()=>saveNextWorkspace(s,d),/character references/);assert.equal(s.getItem(NEXT_ATOMIC_KEY),before);});
