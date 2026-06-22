// 冒烟测试 v2 - 详细诊断
const http = require('http');

function check() {
  console.log('Connecting to http://127.0.0.1:5000/api/auth/password-login ...');
  const data = JSON.stringify({ phone: '13000001111', password: '888888' });
  const req = http.request({
    hostname: '127.0.0.1', port: 5000,
    path: '/api/auth/password-login', method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
    timeout: 10000
  }, res => {
    let body = '';
    console.log('Got response! Status:', res.statusCode);
    res.on('data', c => body += c);
    res.on('end', () => {
      console.log('Body:', body.slice(0, 600));
      process.exit(0);
    });
  });
  req.on('error', e => { 
    console.log('Connection error:', e.message); 
    console.log('Code:', e.code);
    process.exit(2); 
  });
  req.on('timeout', () => { 
    console.log('TIMEOUT - server may still be compiling'); 
    req.destroy(); 
    process.exit(3); 
  });
  req.write(data);
  req.end();
}

check();
