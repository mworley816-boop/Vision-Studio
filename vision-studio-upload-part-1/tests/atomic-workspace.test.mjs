import test from 'node:test';
import assert from 'node:assert/strict';
import {saveAtomicWorkspace,loadAtomicWorkspace,ATOMIC_KEY} from '../preview/atomic-workspace.mjs';
const project={id:'p1',name:'Video',kind:'music',mode:'approval'};
const production={id:'v1',projectId:'p1',kind:'music',title:'Video',status:'draft',spentCents:0,reservedCents:0,scenes:[{id:'s1',description:'Opening',approved:true}]};
function store(){const values=new Map();return {getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),values};}
test('atomic workspace persists scenes and approvals',()=>{const s=store();saveAtomicWorkspace(s,[project],[production]);assert.equal(loadAtomicWorkspace(s).productions[0].scenes[0].approved,true);assert.equal(s.values.size,1);});
test('invalid incoming production never overwrites stored workspace',()=>{const s=store();saveAtomicWorkspace(s,[project],[production]);const before=s.getItem(ATOMIC_KEY);assert.throws(()=>saveAtomicWorkspace(s,[project],[{...production,projectId:'wrong'}]));assert.equal(s.getItem(ATOMIC_KEY),before);});
test('storage quota failure leaves prior workspace unchanged',()=>{const s=store();saveAtomicWorkspace(s,[project],[production]);const before=s.getItem(ATOMIC_KEY);s.setItem=()=>{throw Error('quota exceeded');};assert.throws(()=>saveAtomicWorkspace(s,[],[]),/quota/);assert.equal(s.getItem(ATOMIC_KEY),before);});
test('corrupt atomic storage rejected rather than silently accepted',()=>{const s=store();s.setItem(ATOMIC_KEY,JSON.stringify({version:3,projects:[project],productions:[{...production,kind:'episode'}]}));assert.throws(()=>loadAtomicWorkspace(s));});
