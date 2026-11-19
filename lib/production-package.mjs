import {normalizeStoryboard} from './visual-editor.mjs';
import {sceneShotPlan} from './scene-shot-plan.mjs';
export function productionPackage(document,bible={}){
 const scenes=normalizeStoryboard(document).scenes;
 const total=scenes.reduce((sum,scene)=>sum+Number(scene.duration||0),0);
 const heading=['VISION STUDIO · PRODUCTION PLANNING PACKAGE','Scenes: '+scenes.length,'Planned duration: '+Number(total.toFixed(2))+' seconds','Status: Planning export only; not proof of approval or provider readiness.','No provider contacted. No generation or payment authorized.',''];
 const sections=scenes.map(scene=>sceneShotPlan({scenes},scene.id,bible).text);
 return [...heading,...sections.flatMap((section,index)=>[index?'\n'+('=').repeat(42)+'\n':'',section])].join('\n');
}
