const h = require('https');
const uid = process.argv[2] || 'u_wk_1781786112421';
const url = process.argv[3] || '/api/notifications';
const BASE = 'szjfp-274552-8-1444411996.sh.run.tcloudbase.com';
const t = Buffer.from(uid + ':' + Date.now()).toString('base64url');

const req = h.get(`https://${BASE}${url}`, {
  headers: { Authorization: 'Bearer ' + t }
}, res => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    console.log(`${url} [${uid}] => ${res.statusCode}  ${d.slice(0, 250)}`);
  });
});
req.on('error', e => console.log('ERR', e.message));
setTimeout(() => {}, 5000);
