/**
 * Server-only, read-only adapter for a future owner-scoped database view.
 * `query` is an injected parameterized SQL executor, not a browser API.
 * Deployment requires a security-invoker view, RLS, and verified owner sessions.
 */
const ID=/^[a-zA-Z0-9][a-zA-Z0-9_:-]{0,127}$/;
const COLUMNS='id, owner_id, project_id, production_id, kind, mode, status, version, spent_cents, reserved_cents, export_asset_id';
export function createProductionFeedStore({query}){
 if(typeof query!=='function')throw Error('Server-side query executor required');
 return {
  async listOwnerWorkflows({ownerId,projectId,status,limit=100}){
   if(typeof ownerId!=='string'||!ID.test(ownerId))throw Error('Invalid owner');
   if(projectId!==undefined&&(typeof projectId!=='string'||!ID.test(projectId)))throw Error('Invalid project');
   if(status!==undefined&&(typeof status!=='string'||!/^[a-z_]{1,64}$/.test(status)))throw Error('Invalid status');
   if(!Number.isSafeInteger(limit)||limit<1||limit>500)throw Error('Invalid limit');
   const params=[ownerId];
   if(projectId!==undefined)params.push(projectId);
   if(status!==undefined)params.push(status);
   params.push(limit);
   const sql=`SELECT ${COLUMNS} FROM studio_production_feed WHERE owner_id = $1 ${projectId===undefined?'':`AND project_id = $${params.indexOf(projectId)+1} `}${status===undefined?'':`AND status = $${params.indexOf(status)+1} `}ORDER BY id LIMIT $${params.length}`;
   const result=await query(sql,params);
   if(!result||!Array.isArray(result.rows)||result.rows.length>limit)throw Error('Invalid database response');
   return result.rows.map(r=>({
    id:r.id,ownerId:r.owner_id,projectId:r.project_id,productionId:r.production_id,
    kind:r.kind,mode:r.mode,status:r.status,version:r.version,
    spentCents:r.spent_cents,reservedCents:r.reserved_cents,exportAssetId:r.export_asset_id
   }));
  }
 };
}
