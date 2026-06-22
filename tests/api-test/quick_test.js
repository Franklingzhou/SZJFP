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
  console.log('=== 测试 admin 登录 (phone=13000000001, password=888888) ===');
  const r = await post('/api/auth/password-login', { phone: '13000000001', password: '888888' });
  console.log('Status:', r.status);
  console.log('Body:', JSON.stringify(r.body, null, 2));

  console.log('\n=== 测试 agent 登录 (phone=13600001234, password=888888) ===');
  const r2 = await post('/api/auth/password-login', { phone: '13600001234', password: '888888' });
  console.log('Status:', r2.status);
  console.log('Body:', JSON.stringify(r2.body, null, 2));
}
main().catch(e => console.error(e));
