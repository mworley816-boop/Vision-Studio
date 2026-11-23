export type SavedStoryboardScene={description:string;duration:number};
export type SavedStoryboardProduction={kind:'music'|'episode';scenes:SavedStoryboardScene[];spentCents?:number;reservedCents?:number};
export type SavedStoryboardBudgetInput={production?:SavedStoryboardProduction;modelKey?:string;assetCents?:number;audioCents?:number;otherCents?:number;retriesPerClip?:number};
type SafeFlags={readonly trustedProviderPricing:false;readonly generationEnabled:false;readonly providerCalled:false;readonly jobCreated:false;readonly paymentAuthorized:false};
export type SavedStoryboardBudgetResult=
 | (SafeFlags&{readonly status:'blocked';readonly reason:string})
 | (SafeFlags&{readonly status:'saved_storyboard_reference_only';readonly originalSceneCount:number;readonly estimatedClipCount:number;readonly retriesPerClip:number;readonly totalGeneratedSeconds:number;readonly estimatedCents:number;readonly remainingCents:number;readonly withinCap:boolean;readonly sourceUrl:string;readonly reviewedOn:string;readonly storyboardApprovalNotInferred:true});
export declare function previewSavedStoryboardBudget(input?:SavedStoryboardBudgetInput):SavedStoryboardBudgetResult;
