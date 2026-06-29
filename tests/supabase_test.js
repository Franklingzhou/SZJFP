const https = require('https');

async function supabaseRPC(functionName, body) {
  return new Promise((resolve) => {
    const data = JSON.stringify(body);
    const opts = {
      hostname: 'mozamdshnaydbycpbifd.supabase.co',
      port: 443,
      method: 'POST',
      path: '/rest/v1/rpc/' + functionName,
      headers: {
        'Content-Type': 'application/json',
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vemFtZHNobmF5ZGJ5Y3BiaWZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTUyODcyNiwiZXhwIjoyMDk3MTA0NzI2fQ.vzBJcL7282ed11YRR8r1ercwg-gcsrz_Nyn9BrC6J-4',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vemFtZHNobmF5ZGJ5Y3BiaWZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTUyODcyNiwiZXhwIjoyMDk3MTA0NzI2fQ.vzBJcL7282ed11YRR8r1ercwg-gcsrz_Nyn9BrC6J-4',
        'Content-Length': data.length
      },
      rejectUnauthorized: false
    };
    const req = https.request(opts, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ code: res.statusCode, body: d }));
    });
    req.on('error', e => resolve({ code: 0, body: 'ERR:' + e.message }));
    req.write(data);
    req.end();
  });
}

async function main() {
  // Try to insert a record via REST API - Supabase auto-creates tables but might need config
  let res = await supabaseRPC('pg_lead_contracts_init', {});
  console.log('RPC pg_lead_contracts_init:', res.code, res.body.substring(0, 200));

  // Alternative: use Supabase Management API to run SQL
  const { Client } = require('@supabase/supabase-js');
  const supabase = require('@supabase/supabase-js').createClient(
    'https://mozamdshnaydbycpbifd.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vemFtZHNobmF5ZGJ5Y3BiaWZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTUyODcyNiwiZXhwIjoyMDk3MTA0NzI2fQ.vzBJcL7282ed11YRR8r1ercwg-gcsrz_Nyn9BrC6J-4'
  );

  // Try querying lead_contracts
  const { data, error } = await supabase.from('lead_contracts').select('count');
  console.log('lead_contracts query:', error ? '❌ ' + error.message : '✅ count=' + JSON.stringify(data));
}

main().catch(e => console.error(e));
