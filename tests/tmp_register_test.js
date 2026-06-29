const https = require('https');

async function post(path, body) {
  const d = JSON.stringify(body);
  return new Promise((resolve, reject) => {
    const r = https.request('https://szjfp-274552-8-1444411996.sh.run.tcloudbase.com' + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(d) },
    }, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => resolve({ status: res.statusCode, body: b }));
    });
    r.on('error', reject);
    r.write(d);
    r.end();
  });
}

(async () => {
  // Test 1: register with existing phone (should return 409)
  const r1 = await post('/api/auth/phone-register', { phone: '13800000001', role: 'worker', name: 'test' });
  console.log('Test 1 (existing phone 13800000001):', r1.status, r1.body);

  // Test 2: register with non-existing phone
  const r2 = await post('/api/auth/phone-register', { phone: '13999999999', role: 'worker', name: 'test2' });
  console.log('Test 2 (new phone 13999999999):', r2.status, r2.body);

  // Test 3: admin/logs
  const r3 = await new Promise((resolve, reject) => {
    https.get('https://szjfp-274552-8-1444411996.sh.run.tcloudbase.com/admin/logs', res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => resolve({ status: res.statusCode, body: b.substring(0, 200) }));
    }).on('error', reject);
  });
  console.log('Test 3 (/admin/logs):', r3.status, r3.body);
})();
