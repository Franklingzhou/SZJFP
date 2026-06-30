const suite = require('../tests/api-test/suites/gap-write.test.js');
const fs = require('fs');
suite().then(results => {
  const failed = results.filter(r => !r.pass);
  const lines = [];
  lines.push('=== FAILURES (' + failed.length + '/' + results.length + ') ===');
  failed.forEach(f => lines.push('FAIL ' + f.label + ': expected ' + JSON.stringify(f.expected) + ' got ' + f.actual + (f.message ? ' | ' + f.message : '')));
  lines.push('PASS RATE: ' + ((results.length - failed.length)/results.length*100).toFixed(1) + '%');
  fs.writeFileSync('../tests/gap_result.txt', lines.join('\n'));
  console.log(lines.join('\n'));
  process.exit(failed.length > 0 ? 1 : 0);
}).catch(e => { console.error(e.message); process.exit(1); });
