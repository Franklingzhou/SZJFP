const http = require('http');
const axios = require('axios');

function httpPost(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request({
      hostname: 'localhost', port: 3000, path, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
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
  const body = { phone: '13000000001', password: '888888' };
  
  // 原生 http
  console.log('=== 原生 http ===');
  const r1 = await httpPost('/api/auth/password-login', body);
  console.log('Status:', r1.status, '| Body:', JSON.stringify(r1.body));
  
  // axios (default headers)
  console.log('\n=== axios (default) ===');
  try {
    const r2 = await axios.post('http://localhost:3000/api/auth/password-login', body, {
      validateStatus: () => true
    });
    console.log('Status:', r2.status, '| Body:', JSON.stringify(r2.data));
    console.log('Req headers used by axios:', JSON.stringify(r2.config.headers));
  } catch(e) {
    console.log('Axios error:', e.message);
  }

  // axios with explicit headers  
  console.log('\n=== axios (explicit headers) ===');
  try {
    const r3 = await axios.post('http://localhost:3000/api/auth/password-login', body, {
      validateStatus: () => true,
      headers: { 'Content-Type': 'application/json' }
    });
    console.log('Status:', r3.status, '| Body:', JSON.stringify(r3.data));
  } catch(e) {
    console.log('Axios error:', e.message);
  }

  // 检查请求体长度
  console.log('\n=== Body info ===');
  console.log('JSON stringify:', JSON.stringify(body));
  console.log('Byte length:', Buffer.byteLength(JSON.stringify(body)));
}

main().catch(e => console.error(e));
