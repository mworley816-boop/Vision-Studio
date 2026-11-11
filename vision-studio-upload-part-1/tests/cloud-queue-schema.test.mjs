import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const sql=readFileSync(new URL('../supabase/phase22-queue.sql',import.meta.url),'utf8');
test('paid jobs are RLS protected and not writable by browser clients',()=>{
 assert.match(sql,/enable row level security/i);
 assert.match(sql,/revoke all on public\.studio_paid_jobs from public, anon, authenticated/i);
 assert.doesNotMatch(sql,/grant (insert|update|delete).*studio_paid_jobs to authenticated/i);
});
test('reservation serializes on production and includes unreconciled maximum charges',()=>{
 assert.match(sql,/where id=p_production_id for update/i);
 assert.match(sql,/status in \('completed','failed'\) then actual_charge_cents else max_charge_cents/i);
 assert.match(sql,/v_used\+p_max_cents>v_budget/i);
});
test('workers use skip locked and expired jobs require reconciliation',()=>{
 assert.match(sql,/for update skip locked/i);
 assert.match(sql,/status='needs_reconciliation'/i);
 assert.match(sql,/lease_expires_at<=now\(\)/i);
});
test('privileged RPC functions are non-exposed and service-only',()=>{
 assert.match(sql,/create schema if not exists studio_internal/i);
 assert.match(sql,/revoke all on schema studio_internal from public, anon, authenticated/i);
 assert.match(sql,/grant execute on function studio_internal\.reserve_job.*to service_role/i);
});
test('overcharges fail closed and idempotency keys are unique',()=>{
 assert.match(sql,/unique \(production_id,idempotency_key\)/i);
 assert.match(sql,/p_actual_cents>v_max/i);
});
