import test from 'node:test';
import assert from 'node:assert/strict';
import {createProduction,addScene} from '../lib/workspace.mjs';
import {createVisualBible,updateStyle,addLocation,assignSceneReferences} from '../lib/visual-bible.mjs';
import {reviewScene,storyboardReadiness} from '../lib/storyboard-readiness.mjs';
function fixture(){let b=updateStyle(createVisualBible('project'),'cinematic','plum');b=addLocation(b,{id:'loc',name:'Stage',description:'A stage'});let p=addScene(createProduction('project','music','Song','production'),{id:'scene',description:'A shot'});p=assignSceneReferences(p,'scene',[],'loc');return {b,p};}
test('approval requires valid continuity and project match',()=>{const {b,p}=fixture();assert.equal(reviewScene(p,'scene',true,b).scenes[0].approved,true);assert.throws(()=>reviewScene(p,'scene',true,{...b,projectId:'other'}),/continuity/);});
test('unassigned location cannot be approved',()=>{const {b,p}=fixture();assert.throws(()=>reviewScene(assignSceneReferences(p,'scene',[],''),'scene',true,b),/continuity/);});
test('readiness requires continuity even in automatic mode',()=>{const {b,p}=fixture();assert.equal(storyboardReadiness(p,'automatic',b).ready,true);assert.equal(storyboardReadiness(assignSceneReferences(p,'scene',[],''),'automatic',b).ready,false);});
test('approval-based mode requires scene approval',()=>{const {b,p}=fixture();assert.equal(storyboardReadiness(p,'approval',b).ready,false);assert.equal(storyboardReadiness(reviewScene(p,'scene',true,b),'approval',b).ready,true);});
test('missing scene and completed productions cannot be approved',()=>{const {b,p}=fixture();assert.throws(()=>reviewScene(p,'absent',true,b),/Scene not found/);assert.throws(()=>reviewScene({...p,status:'complete'},'scene',true,b),/locked/);});
