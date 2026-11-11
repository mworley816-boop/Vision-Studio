import test from 'node:test';
import assert from 'node:assert/strict';
import {validateDisposableTarget} from '../scripts/check-postgres-test-target.mjs';
const good={VISION_DISPOSABLE_DATABASE:'YES',VISION_TEST_DATABASE_URL:'postgresql://tester:secret@127.0.0.1:5432/vision_ci_test',VISION_TEST_DATABASE_HOST:'127.0.0.1',VISION_TEST_DATABASE_NAME:'vision_ci_test'};
test('explicitly acknowledged disposable target is accepted',()=>assert.equal(validateDisposableTarget(good),good.VISION_TEST_DATABASE_URL));
test('production-like database names are rejected',()=>assert.throws(()=>validateDisposableTarget({...good,VISION_TEST_DATABASE_URL:'postgresql://tester@127.0.0.1/vision'})));
test('host mismatch is rejected',()=>assert.throws(()=>validateDisposableTarget({...good,VISION_TEST_DATABASE_HOST:'example.org'})));
test('database name mismatch is rejected',()=>assert.throws(()=>validateDisposableTarget({...good,VISION_TEST_DATABASE_NAME:'other_ci_test'})));
test('missing explicit acknowledgement is rejected',()=>assert.throws(()=>validateDisposableTarget({...good,VISION_DISPOSABLE_DATABASE:'NO'})));
