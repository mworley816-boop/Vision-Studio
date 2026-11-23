import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const page=readFileSync(new URL('../app/cloud/page.tsx',import.meta.url),'utf8');
test('saved estimate fetches authenticated cloud production rather than unsaved editor',()=>{assert.match(page,/await listCloudProductions\(browserClient\(\),selected\)/);assert.match(page,/previewSavedStoryboardBudget\(/);assert.match(page,/Unsaved editor changes are excluded/)});
test('cloud dashboard offers model selection and manual no-charge preview',()=>{for(const phrase of ['Saved storyboard budget · No charge','Estimate latest saved storyboard · No charge','setSavedModel','savedEstimate'])assert.ok(page.includes(phrase))});
test('saved storyboard estimate never grants generation or payment',()=>{assert.match(page,/result.providerCalled!==false/);assert.match(page,/result.paymentAuthorized!==false/);assert.match(page,/No provider request, generation, approval, or payment/)});
