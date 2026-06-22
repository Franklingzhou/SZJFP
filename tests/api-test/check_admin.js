const http = require('http');
const d = JSON.stringify({phone:'13000000001',password:'888888'});
const req = http.request({
  hostname:'localhost', port:3000, path:'/api/auth/password-login', method:'POST',
  headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(d)}
}, (res) => {
  let b='';
  res.on('data', c => b+=c);
  res.on('end', () => {
    const r = JSON.parse(b);
    console.log('Admin login:', res.statusCode, r.error || 'OK', r.user ? r.user.id : '');
  });
});
req.write(d); req.end();
