const r = require('../reports/report_2026-07-01T12-57-00-820Z.json');
const fails = r.results.filter(t => t.status === 'FAIL');
console.log('=== FAILED: ' + fails.length + ' / ' + r.summary.total + ' ===');
console.log('');
fails.forEach(f => {
  console.log('[' + f.module + '] ' + f.label);
  console.log('  ' + f.method + ' ' + f.url);
  console.log('  expected: ' + f.expectStatus + ' | actual: ' + f.actualStatus);
  console.log('  error: ' + (f.error || 'N/A'));
  console.log('');
});
