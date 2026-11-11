import test from 'node:test';
import assert from 'node:assert/strict';
import {buildPreflightSql,checkSchema,requiredFunctions} from '../scripts/check-postgres-schema.mjs';
const env={VISION_DISPOSABLE_DATABASE:'YES',VISION_TEST_DATABASE_URL:'postgresql://localhost:5432/vision_disposable',VISION_TEST_DATABASE_HOST:'localhost',VISION_TEST_DATABASE_NAME:'vision_disposable'};
test('preflight SQL only reads system catalog',()=>{const sql=buildPreflightSql();assert.match(sql,/pg_proc/);assert.match(sql,/studio_internal/);for(const name of requiredFunctions)assert.ok(sql.includes(name));assert.doesNotMatch(sql,/\b(insert|update|delete|drop|alter|create)\b/i)});
test('missing disposable opt-in never invokes psql',()=>{let calls=0;assert.throws(()=>checkSchema({env:{},spawn:()=>{calls++}}));assert.equal(calls,0)});
test('missing client fails before database access',()=>{let calls=0;assert.throws(()=>checkSchema({env,spawn:()=>{calls++;return {status:1}}}),/psql is required/);assert.equal(calls,1)});
test('preflight rejects missing function',()=>{let calls=0;const spawn=()=>{calls++;return calls===1?{status:0}:{status:0,stdout:requiredFunctions.map((x,i)=>`${x}|${i===0?'missing':'present'}`).join('\n')}};assert.throws(()=>checkSchema({env,spawn}),/functions missing/)});
test('preflight accepts complete function catalog',()=>{let calls=0;const spawn=()=>{calls++;return calls===1?{status:0}:{status:0,stdout:requiredFunctions.map(x=>`${x}|present`).join('\n')}};assert.equal(checkSchema({env,spawn}).functions.length,5);assert.equal(calls,2)});
