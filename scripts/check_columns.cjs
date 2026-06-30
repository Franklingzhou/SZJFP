const supabaseUrl = 'https://mozamdshnaydbycpbifd.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vemFtZHNobmF5ZGJ5Y3BiaWZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTUyODcyNiwiZXhwIjoyMDk3MTA0NzI2fQ.vzBJcL7282ed11YRR8r1ercwg-gcsrz_Nyn9BrC6J-4';

const tables = ['leads', 'order_signings', 'platform_fees', 'settlements'];

async function checkTable(t) {
  try {
    const r = await fetch(`${supabaseUrl}/rest/v1/${t}?limit=1`, {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        Prefer: 'return=headers-only',
      },
    });
    console.log(`${t}: status=${r.status}`);
    const text = await r.text();
    if (text) {
      try {
        const j = JSON.parse(text);
        const data = Array.isArray(j) ? j[0] : j;
        console.log(`  columns: [${Object.keys(data || {}).join(', ')}]`);
      } catch (e) {
        console.log(`  raw: ${text.substring(0, 300)}`);
      }
    } else {
      console.log(`  (empty response)`);
    }
  } catch (e) {
    console.log(`${t}: ERROR ${e.message}`);
  }
}

(async () => {
  for (const t of tables) {
    await checkTable(t);
  }
})();
