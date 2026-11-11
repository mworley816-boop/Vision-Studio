import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const sql=readFileSync(new URL('../supabase/phase34-render-authorization.sql',import.meta.url),'utf8');
const claim=sql.split('create or replace function studio_internal.claim_approved_render')[1].split('end $$;')[0];
test('claim locks revision before job',()=>{
 const a=claim.indexOf('for update of l skip locked');
 const b=claim.indexOf('for update of j skip locked');
 assert.ok(a>=0&&b>a);
});
test('claim rechecks eligibility after revision lock',()=>{
 const after=claim.split('if v_production is null then return; end if;')[1];
 assert.match(after,/r\.decision='approved'/);
 assert.match(after,/l\.revision=j\.ledger_revision/);
});
test('claim has bounded worker input and lease',()=>{
 assert.match(claim,/length\(p_worker\) not between 8 and 120/);
 assert.match(claim,/p_lease_seconds not between 30 and 600/);
});
test('claim uses wall clock lease and unique token',()=>{
 assert.match(claim,/v_token=gen_random_uuid\(\)/);
 assert.match(claim,/lease_expires_at=clock_timestamp\(\)/);
});
