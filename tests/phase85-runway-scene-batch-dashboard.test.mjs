import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const route=readFileSync(new URL('../app/api/runway-scene-batch-preview/route.ts',import.meta.url),'utf8');
const ui=readFileSync(new URL('../components/GenerationPreflight.tsx',import.meta.url),'utf8');
test('scene batch route requires owner and origin',()=>{assert.match(route,/requireStudioOwner\(client\)/);assert.match(route,/origin!==new URL\(request.url\).origin/);assert.match(route,/previewRunwaySceneBatch\(input\)/)});
test('dashboard offers scene, retry and expense controls',()=>{for(const phrase of ['Full production scene budget','sceneCount','retryClips','assetCents','audioCents','otherCents','inspectBatchBudget'])assert.ok(ui.includes(phrase))});
test('dashboard preview is non-authorizing',()=>{assert.match(ui,/data.paymentAuthorized!==false/);assert.match(ui,/No job, provider call, reservation, or payment/);assert.equal(ui.split('async function inspectBatchBudget()').length,2)});
