import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../app/api/runway-connection/route.ts',import.meta.url),'utf8');
test('OpenNext Cloudflare runtime bindings are read for Runway secret',()=>{assert.match(source,/getCloudflareContext\(\{async:true\}\)/);assert.match(source,/context\.env as Record<string,unknown>/);});
test('local development retains process.env fallback',()=>assert.match(source,/process\.env\.RUNWAYML_API_SECRET/));
test('owner authentication precedes runtime secret resolution and network probe',()=>{assert.ok(source.indexOf('await requireStudioOwner(client)')<source.indexOf('getCloudflareContext({async:true})'));assert.ok(source.indexOf('getCloudflareContext({async:true})')<source.indexOf('await probeRunwayConnection'));});
test('only scoped Runway secret is passed to probe',()=>assert.match(source,/env:\{RUNWAYML_API_SECRET:secret\}/));
test('no secret appears in response',()=>{assert.doesNotMatch(source,/NextResponse\.json\(\{[^}]*secret/);assert.match(source,/NextResponse\.json\(result/);});
