const axios = require('axios');
const BASE = 'http://localhost:3000';

async function loginAs(role) {
  const phones = {
    admin:'13000000001', agent:'13600001234', recruiter:'13500003456',
    instructor:'13700007890', training_supervisor:'13100001111',
    customer:'13800008888', worker:'13900009999', worker_operator:'13200002222'
  };
  const r = await axios.post(BASE+'/api/auth/password-login', {phone:phones[role],password:'888888'});
  return r.data.token;
}

async function go() {
  // 1) training-contracts
  const supToken = await loginAs('training_supervisor');
  const adminToken = await loginAs('admin');
  
  console.log('=== 1. training_contracts ===');
  try {
    const r = await axios.get(BASE+'/api/training-contracts', {headers:{Authorization:'Bearer '+supToken}});
    const data = r.data?.data || r.data || [];
    console.log('GET status:', r.status, 'count:', Array.isArray(data)?data.length:'?');
    if (Array.isArray(data) && data.length > 0) {
      console.log('Sample record:', JSON.stringify(data[0]).substring(0,500));
    }
  } catch(e) { console.log('GET error:', e.response?.status, JSON.stringify(e.response?.data)); }

  // 2) Try updating training contract
  console.log('\n=== 2. training_contracts PUT ===');
  try {
    // First get a contract
    const q = await axios.get(BASE+'/api/training-contracts', {headers:{Authorization:'Bearer '+supToken}});
    const items = q.data?.data || [];
    if (items.length > 0) {
      const tc = items[0];
      console.log('Trying to update contract:', tc.id);
      const r = await axios.put(BASE+'/api/training-contracts', 
        { id: tc.id, status: 'signed' },
        {headers:{Authorization:'Bearer '+supToken}}
      );
      console.log('PUT status:', r.status, JSON.stringify(r.data).substring(0,300));
    } else {
      console.log('No training contracts found');
    }
  } catch(e) { console.log('PUT error:', e.response?.status, JSON.stringify(e.response?.data)); }

  // 3) course_package_items
  console.log('\n=== 3. course_package_items ===');
  try {
    const r = await axios.get(BASE+'/api/course-package-items', {headers:{Authorization:'Bearer '+adminToken}});
    console.log('GET status:', r.status, JSON.stringify(r.data).substring(0,400));
  } catch(e) { console.log('GET error:', e.response?.status, JSON.stringify(e.response?.data)); }

  // 4) enrollments grade
  console.log('\n=== 4. enrollments grade ===');
  try {
    // Get an enrollment first
    const eq = await axios.get(BASE+'/api/enrollments', {headers:{Authorization:'Bearer '+adminToken}});
    const enrollments = eq.data?.data || [];
    console.log('Found enrollments:', enrollments.length);
    if (enrollments.length > 0) {
      const en = enrollments[0];
      console.log('Trying to grade enrollment:', en.id);
      const insToken = await loginAs('instructor');
      const r = await axios.post(BASE+'/api/enrollments/'+en.id+'/grade', 
        { score: 85, comment: 'test grade' },
        {headers:{Authorization:'Bearer '+insToken}}
      );
      console.log('POST status:', r.status, JSON.stringify(r.data).substring(0,300));
    }
  } catch(e) { console.log('POST error:', e.response?.status, JSON.stringify(e.response?.data)); }

  // 5) Run update & delete suites to find exact remaining failures
  console.log('\n=== 5. Run update suite ===');
}

go().catch(e => console.error('FATAL:', e.message));
