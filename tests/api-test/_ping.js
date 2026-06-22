const http = require('http');

function test(path) {
  return new Promise((resolve) => {
    const req = http.request({ hostname: '127.0.0.1', port: 3000, path, method: 'GET', timeout: 10000 }, (res) => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => {
        console.log(`[${res.statusCode}] GET ${path} -> ${b.slice(0, 200)}`);
        resolve();
      });
    });
    req.on('error', e => { console.log(`[ERR] GET ${path} -> ${e.code}`); resolve(); });
    req.end();
  });
}

(async () => {
  await test('/api/ping');
  console.log('---');
  // Try a route without supabase
  await test('/api/auth/password-login');
})();
