import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../app/page.tsx',import.meta.url),'utf8');
test('storyboard input drafts are keyed by production ID',()=>{
 assert.match(source,/useState<Record<string,string>>\(\{\}\)/);
 assert.match(source,/value=\{sceneDrafts\[p\.id\]\|\|''\}/);
 assert.match(source,/\[p\.id\]:e\.target\.value/);
});
test('adding a scene uses the corresponding draft only',()=>{
 assert.match(source,/const description=\(sceneDrafts\[p\.id\]\|\|''\)\.trim\(\)/);
 assert.match(source,/\[p\.id\]:''/);
 assert.doesNotMatch(source,/setSceneText/);
});
