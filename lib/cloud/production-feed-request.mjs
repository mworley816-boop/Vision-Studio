/** Validate untrusted dashboard query parameters before any database call. */
export function parseProductionFeedRequest(requestUrl) {
 const url=new URL(requestUrl);
 const params=url.searchParams;
 const allowed=new Set(['projectId','status','limit']);
 for(const key of params.keys())if(!allowed.has(key)||params.getAll(key).length!==1)throw Error('Invalid feed query parameter');
 const id=/^[a-zA-Z0-9][a-zA-Z0-9_:-]{0,127}$/;
 const projectId=params.get('projectId')??undefined;
 if(projectId!==undefined&&!id.test(projectId))throw Error('Invalid project');
 const status=params.get('status')??undefined;
 if(status!==undefined&&!/^[a-z_]{1,64}$/.test(status))throw Error('Invalid status');
 const rawLimit=params.get('limit');
 if(rawLimit!==null&&!/^[1-9][0-9]{0,2}$/.test(rawLimit))throw Error('Invalid limit');
 const limit=rawLimit===null?100:Number(rawLimit);
 if(limit>500)throw Error('Invalid limit');
 return {projectId,status,limit};
}

/** The adapter's parameterized query contract is the only authority for filters. */
export async function executeProductionFeedQuery(client,values,sql) {
 if(!Array.isArray(values)||values.length<2||values.length>4)throw Error('Invalid query parameters');
 const ownerId=values[0],limit=values.at(-1);
 const projectIndex=/AND project_id = \$([1-4])/.exec(sql??'');
 const statusIndex=/AND status = \$([1-4])/.exec(sql??'');
 const projectId=projectIndex?values[Number(projectIndex[1])-1]:(sql===undefined&&values.length===3?values[1]:undefined);
 const status=statusIndex?values[Number(statusIndex[1])-1]:undefined;
 if(typeof ownerId!=='string'||!Number.isSafeInteger(limit)||limit<1||limit>500)throw Error('Invalid query parameters');
 if(projectId!==undefined&&typeof projectId!=='string')throw Error('Invalid query parameters');
 if(status!==undefined&&typeof status!=='string')throw Error('Invalid query parameters');
 let query=client.from('studio_production_feed')
  .select('id,owner_id,project_id,production_id,kind,mode,status,version,spent_cents,reserved_cents,export_asset_id')
  .eq('owner_id',ownerId);
 if(projectId!==undefined)query=query.eq('project_id',projectId);
 if(status!==undefined)query=query.eq('status',status);
 const {data,error}=await query.order('id').limit(limit);
 if(error)throw Error('Production feed query unavailable');
 return {rows:data};
}
