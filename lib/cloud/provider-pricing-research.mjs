/**
 * Phase 21: research leads only. These are NOT a trusted pricing catalog.
 * Rates are intentionally absent: providers may change price, resolution,
 * audio, duration, and billing rules without notice.
 */
export const PROVIDER_PRICING_RESEARCH=Object.freeze([
 Object.freeze({provider:'runway',model:'kling-4-0-flash',sourceUrl:'https://dev.runwayml.com/learn/kling-4-0-api',billingNotes:'Per output second; input video changes billing; fractional USD rates require precision beyond integer cents.',status:'research_only'}),
 Object.freeze({provider:'runway',model:'gen-4-5',sourceUrl:'https://dev.runwayml.com/learn/ai-video-api-pricing',billingNotes:'Check current model/resolution and API availability before any estimate.',status:'research_only'}),
 Object.freeze({provider:'fal',model:'wan-v2-2-a14b',sourceUrl:'https://fal.ai/models/fal-ai/wan/v2.2-a14b/image-to-video',billingNotes:'Resolution-dependent per-second rate; confirm current API details.',status:'research_only'}),
 Object.freeze({provider:'fal',model:'kling-2-5-turbo-pro',sourceUrl:'https://fal.ai/explore/text-to-video-apis',billingNotes:'Confirm current model-specific endpoint, duration, and price.',status:'research_only'})
]);
export function listProviderPricingResearch(){
 return PROVIDER_PRICING_RESEARCH.map(({provider,model,sourceUrl,billingNotes,status})=>({provider,model,sourceUrl,billingNotes,status}));
}
