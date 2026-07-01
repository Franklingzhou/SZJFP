const fs = require('fs');
const path = require('path');

const reportsDir = path.join(__dirname, '..', 'reports');
const files = fs.readdirSync(reportsDir).filter(f => f.startsWith('report_') && f.endsWith('.json')).sort().reverse();
const report = JSON.parse(fs.readFileSync(path.join(reportsDir, files[0]), 'utf8'));

console.log('=== SUMMARY ===');
console.log(JSON.stringify(report.summary, null, 2));

console.log('\n=== SAMPLE RESULT (first) ===');
console.log(JSON.stringify(report.results[0], null, 2));

// Find any result with passed:false or similar
const bad = report.results.filter(r => r.passed === false || r.status === 'failed' || r.error);
console.log('\n=== BAD RESULTS (' + bad.length + ') ===');
bad.forEach(r => {
  console.log(`  [${r.id || r.name}] expected:${r.expectedStatus} actual:${r.actualStatus || r.statusCode} err:${r.error?.substring(0,100)}`);
});
