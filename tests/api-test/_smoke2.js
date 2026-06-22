const http = require('http');

function test(path, method, body) {
  return new Promise((resolve) => {
    const d = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: '127.0.0.1', port: 3000, path, method,
      headers: { 'Content-Type': 'application/json' },
      timeout: 15000
    };
    if (d) opts.headers['Content-Length'] = Buffer.byteLength(d);
    const req = http.request(opts, (res) => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => {
        const isHtml = b.startsWith('<!DOCTYPE') || b.startsWith('<!doctype');
        console.log(`[${res.statusCode}] ${method} ${path} -> ${isHtml ? 'HTML(' + b.length + 'b)' : b.slice(0, 300)}`);
        resolve();
      });
    });
    req.on('error', e => { console.log(`[ERR] ${method} ${path} -> ${e.code}`); resolve(); });
    req.on('timeout', () => { console.log(`[TIMEOUT] ${method} ${path}`); req.destroy(); resolve(); });
    if (d) req.write(d);
    req.end();
  });
}

(async () => {
  await test('/', 'GET');
  await test('/api/auth/password-login', 'POST', { phone: '13000000001', password: '888888' });
  await test('/api/auth/init-users', 'POST', {});
  await test('/api/settings', 'GET');
})();
