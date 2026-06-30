try {
  const s = require('./suites/gap-orders.test');
  console.log('loaded:', typeof s);
} catch(e) {
  console.log('ERROR:', e.message);
}
