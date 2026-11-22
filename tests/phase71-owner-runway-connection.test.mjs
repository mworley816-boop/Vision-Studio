import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const route=readFileSync(new URL('../app/api/runway-connection/route.ts',import.meta.url),'utf8');
const ui=readFileSync(new URL('../components/GenerationPreflight.tsx',import.meta.url),'utf8');
test('connection route requires studio owner before provider probe',()=>{assert.match(route,/await requireStudioOwner\(client\)/);assert.ok(route.indexOf('await requireStudioOwner(client)')<route.indexOf('await probeRunwayConnection'));});
test('connection route rejects cross-origin requests',()=>assert.match(route,/Origin mismatch/));
test('connection route exposes POST only',()=>{assert.match(route,/export async function POST/);assert.doesNotMatch(route,/export async function GET/);});
test('connection check does not return credentials',()=>assert.match(route,/NextResponse.json\(result/));
test('dashboard provides owner-only connection control',()=>{assert.match(ui,/Check Runway connection · No charge/);assert.match(ui,/fetch\('\/api\/runway-connection'/);});
test('dashboard verifies no-generation response',()=>assert.match(ui,/result.paymentAuthorized!==false/));
