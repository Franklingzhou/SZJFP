const https = require('https');
const BASE = 'szjfp-273464-5-1426505363.sh.run.tcloudbase.com';

function req(method, path, token, body) {
  return new Promise(function(resolve) {
    var opts = {
      hostname: BASE,
      port: 443,
      method: method,
      path: path,
      headers: { 'Content-Type': 'application/json' },
      rejectUnauthorized: false
    };
    if (token) opts.headers['Authorization'] = 'Bearer ' + token;
    var r = https.request(opts, function(res2) {
      var d = '';
      res2.on('data', function(c) { d += c; });
      res2.on('end', function() { resolve({ code: res2.statusCode, body: d }); });
    });
    r.on('error', function(e) { resolve({ code: 0, body: 'ERR:' + e.message }); });
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

async function main() {
  var loginRes = await req('POST', '/api/auth/phone-login', null, { phone: '13000000001', code: '888888' });
  var adm = JSON.parse(loginRes.body);
  
  var res = await req('POST', '/api/admin/db-migrate', adm.token);
  console.log('migrate:', res.code, res.body.substring(0, 300));

  res = await req('GET', '/api/lead-contracts', adm.token);
  console.log('lead_contracts:', res.code, res.body.substring(0, 300));

  res = await req('POST', '/api/users/a001/approve', adm.token);
  console.log('user_approve:', res.code, res.body.substring(0, 300));
}
main();
