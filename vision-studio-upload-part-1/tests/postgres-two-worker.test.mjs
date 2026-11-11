import test from 'node:test';
import assert from 'node:assert/strict';
import {validateTwoWorkerEnvironment,twoWorkerLockSmoke} from '../scripts/check-postgres-two-worker.mjs';
const env={VISION_DISPOSABLE_DATABASE:'YES',VISION_TEST_DATABASE_URL:'postgresql://user:pass@localhost/vision_test',VISION_TEST_DATABASE_HOST:'localhost',VISION_TEST_DATABASE_NAME:'vision_test'};
test('two-worker tests require separate explicit opt-in',()=>assert.throws(()=>validateTwoWorkerEnvironment(env),/opt-in/));
test('two-worker tests reject a production-like database',()=>assert.throws(()=>validateTwoWorkerEnvironment({...env,VISION_ENABLE_TWO_WORKER_TEST:'YES',VISION_TEST_DATABASE_URL:'postgresql://user:pass@localhost/production'})));
test('two-worker tests fail closed when psql is missing',async()=>await assert.rejects(twoWorkerLockSmoke({env:{...env,VISION_ENABLE_TWO_WORKER_TEST:'YES'},check:()=>({status:1})}),/psql unavailable/));
test('two-worker tests do not contact database without confirmation',async()=>await assert.rejects(twoWorkerLockSmoke({env,check:()=>{throw Error('should not execute')}}),/opt-in/));
