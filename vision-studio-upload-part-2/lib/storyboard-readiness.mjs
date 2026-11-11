import {approveScene,canBegin} from './workspace.mjs';
import {inspectContinuity} from './visual-bible.mjs';

/** Local planning only; this does not authorize generation or spending. */
export function storyboardReadiness(production, mode, bible) {
 const continuity = inspectContinuity(production,bible);
 const approvalsReady = canBegin(production,mode);
 return {ready: approvalsReady && continuity.ok, approvalsReady, continuityReady: continuity.ok, issues: continuity.issues};
}

/** An approval is valid only for the scene and the current project references. */
export function reviewScene(production, sceneId, approved, bible) {
 const scene=production.scenes.find(s=>s.id===sceneId);
 if (!scene) throw new Error('Scene not found');
 if (production.status==='complete') throw new Error('Completed production is locked');
 if (approved) {
  const continuity=inspectContinuity(production,bible);
  if (!continuity.ok) throw new Error('Resolve visual continuity issues before approval');
 }
 return approveScene(production,sceneId,approved);
}
