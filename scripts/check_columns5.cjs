// 查 settlements 和 lead_follow_ups 列
const supabaseUrl='https://mozamdshnaydbycpbifd.supabase.co';
const serviceKey='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vemFtZHNobmF5ZGJ5Y3BiaWZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTUyODcyNiwiZXhwIjoyMDk3MTA0NzI2fQ.vzBJcL7282ed11YRR8r1ercwg-gcsrz_Nyn9BrC6J-4';
const headers={apikey:serviceKey,Authorization:'Bearer '+serviceKey,Prefer:'return=headers-only'};

async function check(tbl) {
  const r=await fetch(`${supabaseUrl}/rest/v1/${tbl}?limit=1`,{headers});
  console.log(`${tbl} status:`,r.status);
  try{const d=await r.json();if(d.length)console.log('columns:',Object.keys(d[0]))}catch(e){console.log('raw:',(await r.text()).substring(0,300))}
}
(async()=>{await check('settlements');await check('lead_follow_ups')})();
