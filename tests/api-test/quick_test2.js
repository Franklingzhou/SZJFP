const http = require('http');

function post(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request({
      hostname: 'localhost', port: 3000, path, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': data.length }
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(d) }); }
        catch { resolve({ status: res.statusCode, body: d }); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  // Step 1: Call init-users to reset all passwords to 888888
  console.log('=== Step 1: init-users ===');
  const r0 = await post('/api/auth/init-users', {});
  console.log('Status:', r0.status, JSON.stringify(r0.body).slice(0, 200));
  
  // Step 2: Immediately test admin login
  console.log('\n=== Step 2: admin login ===');
  const r1 = await post('/api/auth/password-login', { phone: '13000000001', password: '888888' });
  console.log('Status:', r1.status, JSON.stringify(r1.body).slice(0, 300));
  
  // Step 3: Test agent login too
  console.log('\n=== Step 3: agent login ===');
  const r2 = await post('/api/auth/password-login', { phone: '13600001234', password: '888888' });
  console.log('Status:', r2.status, JSON.stringify(r2.body).slice(0, 300));
}

main().catch(e => console.error(e));
