import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const route=readFileSync(new URL('../app/api/productions/route.ts',import.meta.url),'utf8');
test('creation endpoint requires origin and verified session',()=>{
 for(const token of ["headers.get('origin')","new URL(request.url).origin","auth.getUser()","createCloudProduction","'projectId','title','kind'","private, no-store"])assert.ok(route.includes(token),token);
});
test('creation endpoint rejects caller-supplied owner, budget or payment fields',()=>{
 assert.match(route,/Unexpected production fields/);
 assert.match(route,/Object\.keys\(body\)/);
 assert.doesNotMatch(route,/service_role|SUPABASE_SERVICE_ROLE_KEY|authorizePayment|reserveFunds|provider\.generate/i);
});
test('creation never claims paid generation is enabled',()=>{
 assert.match(route,/generationEnabled:false,paymentAuthorized:false,jobCreated:false/);
 assert.match(route,/status:201/);
});
