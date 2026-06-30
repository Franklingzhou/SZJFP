const supabaseUrl = 'https://mozamdshnaydbycpbifd.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vemFtZHNobmF5ZGJ5Y3BiaWZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTUyODcyNiwiZXhwIjoyMDk3MTA0NzI2fQ.vzBJcL7282ed11YRR8r1ercwg-gcsrz_Nyn9BrC6J-4';

(async () => {
  // Check settlements + enrollments columns
  for (const t of ['settlements', 'enrollments']) {
    try {
      // Create a test row first to see columns
      const r = await fetch(`${supabaseUrl}/rest/v1/${t}?select=*&limit=1`, {
        headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
      });
      const text = await r.text();
      try {
        const j = JSON.parse(text);
        const data = Array.isArray(j) ? j[0] : j;
        console.log(`${t}: columns=[${Object.keys(data || {}).join(', ')}]`);
      } catch (e) {
        console.log(`${t}: no rows, status=${r.status}`);
      }
    } catch (e) {
      console.log(`${t}: ERROR ${e.message}`);
    }
  }
})();
