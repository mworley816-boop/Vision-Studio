import test from 'node:test';
import assert from 'node:assert/strict';
import {createProduction,addScene,approveScene} from '../lib/workspace.mjs';
import {createVisualBible,addCharacter,addLocation,updateStyle,assignSceneReferences} from '../lib/visual-bible.mjs';
import {createProductionPlan,queueShot,finishShot,cancelShot,renderManifest} from '../lib/production-engine.mjs';
function fixture(kind='episode'){
 let p=createProduction('project-1',kind,'Episode 1','prod-1');p=addScene(p,{id:'scene-1',description:'Character enters studio'});
 let b=updateStyle(createVisualBible('project-1'),'storybook 3D','pastels');b=addCharacter(b,{id:'char-1',name:'Bunny',description:'white rabbit'});b=addLocation(b,{id:'loc-1',name:'Studio',description:'bright ballet room'});
 p=assignSceneReferences(p,'scene-1',['char-1'],'loc-1');return {p,b};
}
test('approval mode blocks unapproved scenes',()=>{const {p,b}=fixture();assert.throws(()=>createProductionPlan(p,b,'approval'),/approval/);});
test('automatic mode creates shot briefs with references',()=>{const {p,b}=fixture();const plan=createProductionPlan(p,b,'automatic');assert.equal(plan.shots[0].characters[0].name,'Bunny');});
test('cross-project bible is rejected',()=>{const {p,b}=fixture();assert.throws(()=>createProductionPlan(p,{...b,projectId:'other'},'automatic'),/PROJECT_MISMATCH/);});
test('episode reserves, settles and prepares manifest',()=>{let {p,b}=fixture();p=approveScene(p,'scene-1',true);let plan=createProductionPlan(p,b,'approval');({production:p,plan}=queueShot(p,plan,'scene-1','job-1',1000));assert.equal(p.reservedCents,1000);({production:p,plan}=finishShot(p,plan,'scene-1',650,'asset-1'));assert.equal(p.spentCents,650);assert.equal(p.reservedCents,0);assert.equal(renderManifest(p,plan).targetDurationSeconds,420);});
test('music-video cap prevents overspend',()=>{let {p,b}=fixture('music');let plan=createProductionPlan(p,b,'automatic');assert.throws(()=>queueShot(p,plan,'scene-1','job-1',501),/cap/i);});
test('cancel releases reserved budget',()=>{let {p,b}=fixture();let plan=createProductionPlan(p,b,'automatic');({production:p,plan}=queueShot(p,plan,'scene-1','job-1',900));({production:p,plan}=cancelShot(p,plan,'scene-1'));assert.equal(p.reservedCents,0);assert.equal(plan.shots[0].status,'planned');});
test('over-estimate actual charge cannot settle',()=>{let {p,b}=fixture();let plan=createProductionPlan(p,b,'automatic');({production:p,plan}=queueShot(p,plan,'scene-1','job-1',300));assert.throws(()=>finishShot(p,plan,'scene-1',301,'asset'),/charge|reconciliation/i);});
test('cannot render incomplete plan',()=>{const {p,b}=fixture();const plan=createProductionPlan(p,b,'automatic');assert.throws(()=>renderManifest(p,plan),/generated assets/);});
