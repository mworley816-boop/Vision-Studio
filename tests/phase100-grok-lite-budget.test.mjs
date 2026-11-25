import test from 'node:test';import assert from 'node:assert/strict';import {previewGrokLiteBudget as preview} from '../lib/cloud/grok-lite-budget.mjs';
test('180 second music video includes twelve frame charges',()=>{const r=preview({kind:'music',scenes:[{duration:180}]});assert.equal(r.estimatedCents,372);assert.equal(r.clips,12);assert.equal(r.withinCap,true);assert.equal(r.generationEnabled,false)});
test('retries and 720p stay subject to cap',()=>{const r=preview({kind:'music',scenes:[{duration:180}],resolution:'720p',retries:1});assert.equal(r.estimatedCents,1104);assert.equal(r.withinCap,false)});
test('invalid duration blocked',()=>assert.equal(preview({kind:'music',scenes:[{duration:0}]}).status,'blocked'));
