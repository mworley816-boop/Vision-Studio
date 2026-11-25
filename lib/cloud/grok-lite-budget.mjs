/** Published reference estimate: one start frame per attempt, maximum 15 seconds per clip. */
export function previewGrokLiteBudget({kind,scenes,resolution='480p',retries=0,extrasCents=0,spentCents=0,reservedCents=0}={}){
 const safe={generationEnabled:false,providerCalled:false,jobCreated:false,paymentAuthorized:false,requiresFreshPricingVerification:true};
 const block=reason=>({status:'blocked',reason,...safe});
 const cap=kind==='music'?500:kind==='episode'?2000:0;
 const rate=resolution==='480p'?2:resolution==='720p'?3:0;
 if(!cap||!rate||!Array.isArray(scenes)||!scenes.length||scenes.length>100||!Number.isSafeInteger(retries)||retries<0||retries>10||![extrasCents,spentCents,reservedCents].every(n=>Number.isSafeInteger(n)&&n>=0&&n<=1000000))return block('Invalid production inputs');
 let seconds=0,clips=0;
 for(const scene of scenes){if(!scene||!Number.isSafeInteger(scene.duration)||scene.duration<1||scene.duration>420)return block('Invalid scene duration');seconds+=scene.duration;clips+=Math.ceil(scene.duration/15);}
 const attempts=clips*(retries+1),generatedSeconds=seconds*(retries+1);
 if(clips>100||generatedSeconds>3600)return block('Production exceeds planning limit');
 const videoCents=generatedSeconds*rate+attempts;
 const estimatedCents=videoCents+extrasCents;
 return {status:'reference_only',model:'grok_imagine_1_5_lite',resolution,clips,attempts,generatedSeconds,videoCents,estimatedCents,withinCap:estimatedCents+spentCents+reservedCents<=cap,remainingCents:cap-estimatedCents-spentCents-reservedCents,...safe};
}
