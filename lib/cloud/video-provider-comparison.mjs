import {LIMITS} from '../budget.mjs';
/** Published research snapshots, not live account quotes or authorization to spend.
 * Rates in 1/1000 of a US cent per output second to avoid floating point rounding.
 */
export const VIDEO_RATE_RESEARCH=Object.freeze([
 Object.freeze({provider:'runway',model:'gemini-omni-flash-1-1-360p',milliCentsPerSecond:3400,sourceUrl:'https://dev.runway.com/pricing',resolution:'360p'}),
 Object.freeze({provider:'runway',model:'minimax-h3-max-480p',milliCentsPerSecond:5000,sourceUrl:'https://dev.runway.com/pricing',resolution:'480p'}),
 Object.freeze({provider:'runway',model:'gen-4-5',milliCentsPerSecond:12000,sourceUrl:'https://dev.runway.com/pricing',resolution:'model-dependent'}),
 Object.freeze({provider:'fal',model:'kling-2-5-turbo-pro',milliCentsPerSecond:7000,sourceUrl:'https://fal.ai/explore/text-to-video-apis',resolution:'model-dependent'})
]);
export function compareVideoResearch({kind='music',totalSeconds=180,videoSeconds=0,otherCostCents=0}={}){
 if(!Object.hasOwn(LIMITS,kind)||!Number.isSafeInteger(totalSeconds)||totalSeconds<1||totalSeconds>3600||!Number.isSafeInteger(videoSeconds)||videoSeconds<0||videoSeconds>totalSeconds||!Number.isSafeInteger(otherCostCents)||otherCostCents<0||otherCostCents>LIMITS[kind])throw Error('Invalid production budget inputs');
 const remaining=LIMITS[kind]-otherCostCents;
 const options=VIDEO_RATE_RESEARCH.map(rate=>{
  const costCents=Math.ceil(videoSeconds*rate.milliCentsPerSecond/1000);
  const fullMotionCents=Math.ceil(totalSeconds*rate.milliCentsPerSecond/1000);
  const maxVideoSeconds=Math.min(totalSeconds,Math.floor(remaining*1000/rate.milliCentsPerSecond));
  return {...rate,videoCostCents:costCents,fullMotionCents,totalEstimatedCents:costCents+otherCostCents,maxVideoSeconds,withinCap:costCents<=remaining};
 });
 return {kind,totalSeconds,videoSeconds,stillOrEditedSeconds:totalSeconds-videoSeconds,otherCostCents,capCents:LIMITS[kind],options,sourceStatus:'published_research_not_live_verified',trustedProviderPricing:false,generationEnabled:false,providerCalled:false,jobCreated:false,paymentAuthorized:false};
}
