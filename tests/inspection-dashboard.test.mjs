import test from 'node:test';import assert from 'node:assert/strict';
import {safePreviewImage,parseInspectionPreview,summarizeInspections} from '../lib/inspection-dashboard.mjs';
const record={projectId:'p',productionId:'prod',sceneId:'s',generatedAssetId:'a',references:[{assetId:'ref',label:'Reference'}],findings:[{kind:'character',outcome:'uncertain',notes:'check face'}]};
test('valid preview and summary',()=>{const items=parseInspectionPreview(JSON.stringify([record]));assert.equal(items[0].references.length,1);assert.deepEqual(summarizeInspections(items),{scenes:1,flagged:1,missingImages:1});});
test('embedded raster previews only',()=>{assert.equal(safePreviewImage('https://example.com/a.png'),null);assert.equal(safePreviewImage('data:image/svg+xml;base64,AAA='),null);assert.equal(safePreviewImage('data:image/png;base64,AAAA'), 'data:image/png;base64,AAAA');});
test('reject duplicate scene',()=>assert.throws(()=>parseInspectionPreview(JSON.stringify([record,record])),/Duplicate/));
test('reject invalid model findings',()=>assert.throws(()=>parseInspectionPreview(JSON.stringify([{...record,findings:[{kind:'other',outcome:'match',notes:''}]}])),/Invalid finding/));
test('reject cross-size payloads and bad references',()=>{assert.throws(()=>parseInspectionPreview('x'.repeat(3000001)),/size/);assert.throws(()=>parseInspectionPreview(JSON.stringify([{...record,references:[]}])),/Invalid/);});
