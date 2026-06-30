// check settlements columns by select columns individually
const url='https://mozamdshnaydbycpbifd.supabase.co';
const key='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vemFtZHNobmF5ZGJ5Y3BiaWZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTUyODcyNiwiZXhwIjoyMDk3MTA0NzI2fQ.vzBJcL7282ed11YRR8r1ercwg-gcsrz_Nyn9BrC6J-4';
const h={apikey:key,Authorization:'Bearer '+key};

async function check(tbl,cols) {
  const r=await fetch(`${url}/rest/v1/${tbl}?select=${cols}&limit=0`,{headers:h});
  const t=await r.text();
  if(r.status>=400) console.log(`${tbl}:`,t.substring(0,200));
  else console.log(`${tbl} OK: select ${cols}`);
}
(async()=>{
await check('settlements','id,updated_at,status,settled_at');
await check('settlements','updated_at');
await check('orders','id,customer_id,agent_id,worker_id');
})();
