import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const route=readFileSync(new URL('../app/api/runway-model-budget-preview/route.ts',import.meta.url),'utf8');
const ui=readFileSync(new URL('../components/GenerationPreflight.tsx',import.meta.url),'utf8');
test('model budget route is owner-only and same-origin',()=>{assert.match(route,/requireStudioOwner\(client\)/);assert.match(route,/origin!==new URL\(request.url\).origin/);assert.match(route,/previewRunwayModelBudget\(input\)/);});
test('dashboard offers model selector and no-charge preview',()=>{assert.match(ui,/Runway model pricing reference · No charge/);assert.match(ui,/fetch\('\/api\/runway-model-budget-preview'/);assert.match(ui,/onClick=\{inspectRunwayModelBudget\}/);assert.match(ui,/data.paymentAuthorized!==false/);});
test('dashboard TSX has no duplicated function or broken pricing message',()=>{assert.equal(ui.split('async function inspectRunwayModelBudget()').length,2);assert.match(ui,/setRunwayModelMessage\('Reference estimate: \$'/);});
