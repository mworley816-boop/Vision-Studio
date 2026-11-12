export function listCloudProjects(client:any):Promise<any[]>;
export function createCloudProject(client:any,args:{title:string,kind:string}):Promise<any>;
export function createCloudProduction(client:any,args:{projectId:string,title:string,mode?:string}):Promise<any>;
export function uploadPrivateAsset(client:any,args:{projectId:string,file:File}):Promise<any>;
export function listCloudProductions(client:any,projectId:string):Promise<any[]>;
export function loadCloudProject(client:any,projectId:string):Promise<any>;
export function saveVisualBible(client:any,args:{projectId:string,visualBible:Record<string,unknown>,revision:number}):Promise<{revision:number}>;
export function saveStoryboard(client:any,args:{projectId:string,productionId:string,storyboard:{scenes:unknown[]},revision:number}):Promise<{revision:number}>;
export const STUDIO_BUCKET:string;
export function assertOwnerId(value:unknown):string;
export function validateUpload(args:{ownerId:string,projectId:string,fileName:string,bytes:number,mime:string}):string;
export function requireStudioOwner(client:any):Promise<{id:string}>;
export function validateDocument(value:Record<string,unknown>,kind:'bible'|'storyboard'):Record<string,unknown>;

export type PrivateMediaAsset={id:string,storage_path:string,media_type:string,created_at:string};
export function listPrivateAssets(client:any,projectId:string):Promise<PrivateMediaAsset[]>;
export function getPrivateAssetUrl(client:any,asset:PrivateMediaAsset):Promise<string>;
