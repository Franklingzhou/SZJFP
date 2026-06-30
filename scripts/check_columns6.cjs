// check settlements columns specifically
const url='https://mozamdshnaydbycpbifd.supabase.co';
const key='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vemFtZHNobmF5ZGJ5Y3BiaWZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTUyODcyNiwiZXhwIjoyMDk3MTA0NzI2fQ.vzBJcL7282ed11YRR8r1ercwg-gcsrz_Nyn9BrC6J-4';
const h={apikey:key,Authorization:'Bearer '+key,Prefer:'return=headers-only'};
(async()=>{
const r=await fetch(`${url}/rest/v1/settlements?limit=1`,{headers:h});
const d=await r.json();
console.log('settlements cols:',Object.keys(d[0]||{}));
})();
