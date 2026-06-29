const https = require('https');
const BASE = 'szjfp-273464-5-1426505363.sh.run.tcloudbase.com';

function req(method, path, token, body) {
  return new Promise((resolve) => {
    const opts = {
      hostname: BASE, port: 443, method, path,
      headers: { 'Content-Type': 'application/json' },
      rejectUnauthorized: false
    };
    if (token) opts.headers['Authorization'] = 'Bearer ' + token;
    const r = https.request(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ code: res.statusCode, body: d }));
    });
    r.on('error', e => resolve({ code: 0, body: 'ERROR: ' + e.message }));
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

async function login(phone) {
  const r = await req('POST', '/api/auth/phone-login', null, { phone, code: '888888' });
  return JSON.parse(r.body);
}

async function main() {
  const adm = await login('13000000001');
  const wk = await login('13800005678');

  // BUG-30: Check resume-reviews data structure
  console.log('=== BUG-30: resume-reviews structure ===');
  let r = await req('GET', '/api/resume-reviews?limit=2', adm.token);
  console.log('Full response:', r.body.substring(0, 600));
  
  // Check for pending with specific ID
  r = await req('GET', '/api/resume-reviews?status=pending&limit=2', adm.token);
  let body = r.body;
  let idMatch = body.match(/"id"\s*:\s*"([^"]+)"/);
  if (idMatch) {
    let rid = idMatch[1];
    console.log('\nFound pending review id:', rid);
    r = await req('POST', `/api/resume-reviews/${rid}/approve`, adm.token, { comment: 'test' });
    console.log('approve result:', r.code, r.body.substring(0, 300));
    
    // Find another pending
    r = await req('GET', '/api/resume-reviews?status=pending&limit=1', adm.token);
    body = r.body;
    let idMatch2 = body.match(/"id"\s*:\s*"([^"]+)"/);
    if (idMatch2) {
      let rid2 = idMatch2[1];
      console.log('\nFound another pending review id:', rid2);
      r = await req('POST', `/api/resume-reviews/${rid2}/reject`, adm.token, { reason: 'test reject reason' });
      console.log('reject result:', r.code, r.body.substring(0, 300));
    }
  }

  // BUG-36: Check orders data leak more carefully
  console.log('\n=== BUG-36: Orders detail ===');
  r = await req('GET', '/api/orders', wk.token);
  let odBody = r.body;
  let count = (odBody.match(/"id":"/g) || []).length;
  console.log('Worker orders:', count, '| has contact_name:', odBody.includes('contact_name'), '| has contact_phone:', odBody.includes('contact_phone'));
  console.log('Sample:', odBody.substring(0, 500));
  
  // BUG-42: Course approve
  console.log('\n=== BUG-42: Course approve ===');
  r = await req('GET', '/api/courses?limit=1', adm.token);
  console.log('Courses response:', r.code, r.body.substring(0, 300));
  let cMatch = r.body.match(/"id"\s*:\s*"([^"]+)"/);
  if (cMatch) {
    let cid = cMatch[1];
    console.log('Course id:', cid);
    r = await req('POST', `/api/courses/${cid}/approve`, adm.token, {});
    console.log('approve:', r.code, r.body.substring(0, 200));
  }

  console.log('\n=== DONE ===');
}
main().catch(e => console.error(e));
