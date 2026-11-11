/** Fail-closed validation for an explicitly disposable PostgreSQL test target. */
export function validateDisposableTarget(env=process.env){
  if(env.VISION_DISPOSABLE_DATABASE!=='YES') throw Error('VISION_DISPOSABLE_DATABASE acknowledgement required');
  const raw=env.VISION_TEST_DATABASE_URL;
  if(!raw) throw Error('Test database URL required');
  let u;try{u=new URL(raw)}catch{throw Error('Invalid PostgreSQL URL')}
  if(!['postgres:','postgresql:'].includes(u.protocol))throw Error('PostgreSQL protocol required');
  if(!u.hostname||!u.pathname||u.pathname==='/')throw Error('Explicit database name required');
  const name=decodeURIComponent(u.pathname.slice(1)).toLowerCase();
  if(['postgres','template0','template1','production','prod'].includes(name))throw Error('Refusing PostgreSQL system database');
  if(!/^[a-z0-9_\-]+$/.test(name)||!/(test|disposable|scratch|ci)/.test(name))throw Error('Database name must explicitly indicate test/disposable/scratch/ci');
  if(['postgres','template0','template1','production','prod'].includes(name))throw Error('Protected database name');
  if(u.searchParams.has('options')||u.hash)throw Error('Unexpected connection options');
  if(!env.VISION_TEST_DATABASE_HOST||u.hostname.toLowerCase()!==env.VISION_TEST_DATABASE_HOST.toLowerCase())throw Error('Exact test hostname acknowledgement required');
  if(!env.VISION_TEST_DATABASE_NAME||name!==env.VISION_TEST_DATABASE_NAME.toLowerCase())throw Error('Exact test database name acknowledgement required');
  return raw;
}
