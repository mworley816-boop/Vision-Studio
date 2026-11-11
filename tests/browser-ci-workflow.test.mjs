import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const workflow=readFileSync(new URL('../.github/workflows/verify-application.yml',import.meta.url),'utf8');
const browser=readFileSync(new URL('../browser-tests/test_preview.py',import.meta.url),'utf8');
test('CI installs a browser and executes actual preview interactions',()=>{
 assert.match(workflow,/playwright install --with-deps chromium/);
 assert.match(workflow,/python browser-tests\/test_preview\.py/);
 assert.match(workflow,/actions\/setup-python@v5/);
});
test('browser runner can use bundled Chromium or explicit local override',()=>{
 assert.match(browser,/VISION_CHROMIUM_PATH/);
 assert.match(browser,/p\.chromium\.launch\(\*\*launch_options\)/);
 assert.doesNotMatch(browser,/executable_path='\/usr\/bin\/chromium'/);
});
test('browser test verifies creation, approval, backup, restore, reload',()=>{
 for(const step of ['Create production draft','Planning ready','expect_download','set_input_files','page.reload()']) assert.ok(browser.includes(step),step);
});
