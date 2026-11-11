import test from 'node:test';
import assert from 'node:assert/strict';
import {checkLocalPostgresEnvironment} from '../scripts/check-local-postgres-environment.mjs';
const target={VISION_DISPOSABLE_DATABASE:'YES',VISION_TEST_DATABASE_URL:'postgresql://tester:secret@localhost:5432/vision_ci_test',VISION_TEST_DATABASE_HOST:'localhost',VISION_TEST_DATABASE_NAME:'vision_ci_test'};
const spawnOk=()=>({status:0});
test('missing client fails closed',()=>{const r=checkLocalPostgresEnvironment({env:target,spawn:(c)=>({status:c==='psql'?1:0})});assert.equal(r.ready,false)});
test('missing database acknowledgement fails closed',()=>{const r=checkLocalPostgresEnvironment({env:{},spawn:spawnOk});assert.equal(r.ready,false)});
test('valid environment and installed client reports readiness without database contact',()=>{let calls=[];const r=checkLocalPostgresEnvironment({env:target,spawn:(c,args)=>{calls.push([c,args]);return {status:0}}});assert.equal(r.ready,true);assert.deepEqual(calls,[['psql',['--version']],['docker',['--version']]])});
test('docker is optional when psql and target are available',()=>{const r=checkLocalPostgresEnvironment({env:target,spawn:(c)=>({status:c==='docker'?1:0})});assert.equal(r.ready,true)});
