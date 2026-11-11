import test from 'node:test';
import assert from 'node:assert/strict';
import {assessReadiness} from '../scripts/check-postgres-integration.mjs';
const minimal=['approve_render_review','enqueue_approved_render','claim_approved_render','confirm_render_authorization','invalidate_render_approvals'].map(n=>`create or replace function studio_internal.${n}(`).join('\n');
test('database readiness fails closed without psql',()=>{assert.equal(assessReadiness({sqlText:minimal,psqlAvailable:false,connectionConfigured:true}).ready,false)});
test('database readiness fails closed without disposable database',()=>{assert.equal(assessReadiness({sqlText:minimal,psqlAvailable:true,connectionConfigured:false}).ready,false)});
test('database readiness detects missing function',()=>{assert.deepEqual(assessReadiness({sqlText:minimal.replace('studio_internal.claim_approved_render','studio_internal.missing'),psqlAvailable:true,connectionConfigured:true}).missing,['claim_approved_render'])});
test('database readiness recognizes all prerequisites',()=>{assert.equal(assessReadiness({sqlText:minimal,psqlAvailable:true,connectionConfigured:true}).ready,true)});
