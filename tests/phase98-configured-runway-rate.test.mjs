import test from 'node:test';import assert from 'node:assert/strict';import {previewConfiguredRunwayRate as preview} from '../lib/cloud/configured-runway-rate.mjs';
const evidence={provider:'runway',modelKey:'gen4_turbo',currency:'USD',unit:'output_second',sourceUrl:'https://docs.dev.runwayml.com/guides/pricing/',verifiedAtMs:1000,expiresAtMs:5000,centsPerSecond:5};
const input={modelKey:'gen4_turbo',seconds:10,nowMs:2000};
test('server configured evidence is preview only',()=>{const r=preview({...input,env:{RUNWAY_REVIEWED_RATE_EVIDENCE:JSON.stringify([evidence])}});assert.equal(r.estimatedCents,50);assert.equal(r.generationEnabled,false);assert.equal(r.requiresJobQuote,true)});
test('missing malformed duplicate or caller evidence fails closed',()=>{for(const raw of [undefined,'bad','{}',JSON.stringify([evidence,evidence])])assert.equal(preview({...input,evidence,env:{RUNWAY_REVIEWED_RATE_EVIDENCE:raw}}).status,'blocked')});
