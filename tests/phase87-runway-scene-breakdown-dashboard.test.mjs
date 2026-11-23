import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const route=readFileSync(new URL('../app/api/runway-scene-breakdown-preview/route.ts',import.meta.url),'utf8');
const ui=readFileSync(new URL('../components/GenerationPreflight.tsx',import.meta.url),'utf8');
test('scene breakdown endpoint is owner-only and same-origin',()=>{assert.match(route,/requireStudioOwner\(client\)/);assert.match(route,/origin!==new URL\(request.url\).origin/);assert.match(route,/previewRunwaySceneBreakdown\(input\)/)});
test('dashboard supports editable scene rows and retry estimates',()=>{for(const phrase of ['Scene-by-scene cost breakdown','setSceneRows','Add scene','Remove','inspectSceneBreakdown','sceneBreakdownLines'])assert.ok(ui.includes(phrase))});
test('dashboard enforces no-charge response flags',()=>{assert.match(ui,/data.paymentAuthorized!==false/);assert.match(ui,/No provider call, job, reservation, or payment/);assert.equal(ui.split('async function inspectSceneBreakdown()').length,2)});
