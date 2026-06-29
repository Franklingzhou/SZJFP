const axios = require('axios');

async function test() {
  // Test admin login
  const login = await axios.post('http://localhost:3000/api/auth/password-login', {
    phone: '13000000001',
    password: '888888',
  }, { validateStatus: () => true });
  console.log('login status:', login.status);
  console.log('login data keys:', Object.keys(login.data));
  console.log('user role:', login.data.user?.role);
  
  const token = login.data.token;
  if (!token) { console.log('No token!'); return; }

  // Test resume-reviews
  const rr = await axios.get('http://localhost:3000/api/resume-reviews', {
    headers: { Authorization: 'Bearer ' + token },
    params: { page: 1, pageSize: 5 },
    validateStatus: () => true,
  });
  console.log('rr status:', rr.status);
  if (rr.status === 200) {
    const d = rr.data;
    console.log('rr type:', typeof d);
    const list = d.data || d.list || [];
    console.log('list class:', Array.isArray(list), 'len:', Array.isArray(list) ? list.length : 'N/A');
    if (Array.isArray(list) && list.length > 0) {
      console.log('id[0]:', list[0].id);
      console.log('id[1]:', list[1]?.id);
    }
    console.log('raw preview:', JSON.stringify(d).substring(0, 300));
  } else {
    console.log('rr error:', JSON.stringify(rr.data));
  }
}

test().catch(e => console.log('error:', e.message, e.response?.data));
