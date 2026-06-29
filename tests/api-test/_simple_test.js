const http = require('https');
console.log('Testing v035...');

function get(path, cb) {
  http.get('https://szjfp-274552-8-1444411996.sh.run.tcloudbase.com' + path, (res) => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => cb(null, res.statusCode, d.substring(0, 300)));
  }).on('error', e => cb(e));
}

get('/', (err, code, body) => {
  if (err) { console.log('ERR', err.code); process.exit(1); }
  console.log('GET /', code);
  console.log('Body:', body);
  process.exit(0);
});
