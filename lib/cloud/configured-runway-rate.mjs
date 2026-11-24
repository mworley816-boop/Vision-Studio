import {inspectRunwayRateEvidence} from './runway-rate-evidence.mjs';
/** Only deployment-controlled configuration is accepted; never request-body evidence. */
export function previewConfiguredRunwayRate({env,modelKey,seconds,nowMs}={}){
 let evidence=null;
 const raw=env?.RUNWAY_REVIEWED_RATE_EVIDENCE;
 if(typeof raw==='string'&&raw.length<=16384){
  try{const entries=JSON.parse(raw);if(Array.isArray(entries)){const matches=entries.filter(e=>e&&e.modelKey===modelKey);if(matches.length===1)evidence=matches[0];}}catch{/* fail closed */}
 }
 return inspectRunwayRateEvidence({evidence,modelKey,seconds,nowMs});
}
