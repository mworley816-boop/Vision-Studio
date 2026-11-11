import test from 'node:test';import assert from 'node:assert/strict';import {LIMITS,canReserve,reserve,settle,remainingCents} from '../lib/budget.mjs';
test('separate fixed caps',()=>{assert.equal(LIMITS.music,500);assert.equal(LIMITS.episode,2000)});
test('reserve at limit and reject over limit',()=>{const state={kind:'music',spentCents:100,reservedCents:0};assert.equal(canReserve('music',100,0,400),true);assert.equal(canReserve('music',100,0,401),false);assert.equal(reserve(state,400).reservedCents,400);assert.throws(()=>reserve(state,401))});
test('settlement does not exceed reservation',()=>{const s={kind:'episode',spentCents:0,reservedCents:500};assert.deepEqual(settle(s,500,350),{kind:'episode',spentCents:350,reservedCents:0});assert.throws(()=>settle(s,500,501))});
test('reject invalid inputs',()=>{assert.throws(()=>remainingCents('music',-1,0));assert.throws(()=>canReserve('music',0,0,0.1));assert.throws(()=>remainingCents('other',0,0))});
