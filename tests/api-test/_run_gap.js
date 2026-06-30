// Quick run of gap-write suite, show failures
const suite = require('./suites/gap-write.test.js');
suite().then(results => {
  const failed = results.filter(r => !r.pass);
  console.log('=== FAILURES (' + failed.length + '/' + results.length + ') ===');
  failed.forEach(f => console.log('FAIL ' + f.label + ': expected ' + JSON.stringify(f.expected) + ' got ' + f.actual + (f.message ? ' | ' + f.message : '')));
  console.log('PASS RATE: ' + ((results.length - failed.length)/results.length*100).toFixed(1) + '%');
  process.exit(failed.length > 0 ? 1 : 0);
});
