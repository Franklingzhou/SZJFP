const http = require('http');

function get(path, token) {
  return new Promise((resolve, reject) => {
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const req = http.request({
      hostname: 'localhost', port: 3000, path, method: 'GET', headers
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(d) }); }
        catch { resolve({ status: res.statusCode, body: d }); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

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
  // Login as agent first (which works) to query users
  const loginRes = await post('/api/auth/password-login', { phone: '13600001234', password: '888888' });
  const token = loginRes.body?.token;
  
  console.log('=== Get users with phone 13000000001 ===');
  const r = await get('/api/users?phone=13000000001', token);
  console.log('Status:', r.status);
  console.log('Body:', JSON.stringify(r.body, null, 2));
  
  // Also get admin by id
  console.log('\n=== Get all users ===');
  const r2 = await get('/api/users', token);
  if (r2.body?.users) {
    const match = r2.body.users.filter(u => u.phone === '13000000001');
    console.log('Users with phone 13000000001:');
    match.forEach(u => {
      console.log(`  id=${u.id} name=${u.name} role=${u.role} password_hash=${u.password_hash ? u.password_hash.slice(0,20) : 'NULL'}`);
    });
  }
  
  // Now try updating admin specifically
  console.log('\n=== Update admin001 password directly ===');
  const r3 = await post('/api/users', {
    id: 'admin001',
    password_hash: '888888'
  });
  console.log('PUT status:', r3.status);
  
  // Test admin login again
  console.log('\n=== Admin login after direct update ===');
  const r4 = await post('/api/auth/password-login', { phone: '13000000001', password: '888888' });
  console.log('Status:', r4.status, JSON.stringify(r4.body).slice(0, 200));
}

main().catch(e => console.error(e));
