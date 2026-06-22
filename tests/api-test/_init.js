const http = require('http');
const d = '{}';
const req = http.request({ hostname: '127.0.0.1', port: 3000, path: '/api/auth/init-users', method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': d.length }, timeout: 15000 }, (res) => {
  let b = '';
  res.on('data', c => b += c);
  res.on('end', () => { console.log(`[${res.statusCode}] ${b.slice(0, 500)}`); });
});
req.on('error', e => { console.log('ERR:', e.code); });
req.write(d);
req.end();
