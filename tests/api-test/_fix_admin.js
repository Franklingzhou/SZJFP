const http = require('http');
// Use the init-users API again, but make sure it includes admin
const d = '{}';
const req = http.request({ hostname: '127.0.0.1', port: 3000, path: '/api/auth/init-users', method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': d.length }, timeout: 15000 }, (res) => {
  let b = '';
  res.on('data', c => b += c);
  res.on('end', () => { 
    const j = JSON.parse(b);
    console.log('Status:', res.statusCode);
    j.results.forEach(r => console.log(r.id, r.success ? 'OK' : 'FAIL: ' + r.error));
  });
});
req.on('error', e => console.log('ERR:', e.code));
req.write(d);
req.end();
