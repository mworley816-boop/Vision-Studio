import test from 'node:test';
import assert from 'node:assert/strict';
import {estimatePreciseVideoCost as estimate} from '../lib/cloud/precise-video-cost.mjs';
const base={kind:'music',sceneCount:5,secondsPerScene:10,microUsdPerSecond:94000,nowMs:1500,verifiedAtMs:1000,validUntilMs:2000,sourceUrl:'https://example.com/synthetic'};
test('fractional-cent per second is precise and rounds each scene upward',()=>{
 const r=estimate(base);assert.equal(r.status,'estimate_checked_only');assert.equal(r.estimatedCostCents,470);assert.equal(r.paymentAuthorized,false);assert.equal(r.providerCalled,false);
});
test('per-scene rounding prevents underestimating many small clips',()=>{
 const r=estimate({...base,sceneCount:100,secondsPerScene:1,microUsdPerSecond:10001,kind:'episode'});
 assert.equal(r.status,'estimate_checked_only');assert.equal(r.estimatedCostCents,200);
});
test('budget is strictly enforced',()=>assert.equal(estimate({...base,sceneCount:6}).status,'blocked'));
test('stale pricing blocked',()=>assert.equal(estimate({...base,nowMs:2000}).status,'blocked'));
test('invalid rate blocked',()=>assert.equal(estimate({...base,microUsdPerSecond:0}).status,'blocked'));
test('unverified source blocked',()=>assert.equal(estimate({...base,sourceUrl:'http://example.com'}).status,'blocked'));
test('episode cap separately enforced',()=>assert.equal(estimate({...base,kind:'episode',sceneCount:20}).status,'estimate_checked_only'));
