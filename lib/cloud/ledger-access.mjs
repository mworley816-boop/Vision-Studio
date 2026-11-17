/** Pure, fail-closed guards shared by the authenticated ledger readiness route. */
export const productionIdIsValid=(value)=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
export function mayInspectProduction({userId,production,requestedProductionId}={}){
 return typeof userId==='string'&&userId.length>0
  &&productionIdIsValid(requestedProductionId)
  &&production!==null&&typeof production==='object'
  &&production.id===requestedProductionId
  &&production.owner_id===userId;
}
