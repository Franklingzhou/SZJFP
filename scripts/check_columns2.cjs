const supabaseUrl = 'https://mozamdshnaydbycpbifd.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vemFtZHNobmF5ZGJ5Y3BiaWZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTUyODcyNiwiZXhwIjoyMDk3MTA0NzI2fQ.vzBJcL7282ed11YRR8r1ercwg-gcsrz_Nyn9BrC6J-4';

(async () => {
  // Check settlements table columns via count
  const r = await fetch(`${supabaseUrl}/rest/v1/settlements?limit=0`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  });
  console.log('settlements status:', r.status);
  console.log('settlements body:', await r.text());
})();
