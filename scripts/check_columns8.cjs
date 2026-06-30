const { getSupabaseClient } = require('../src/storage/database/supabase-client');

async function main() {
  const supabase = getSupabaseClient();
  
  // Check order_signings columns
  console.log('=== order_signings ===');
  const { data: signing } = await supabase.from('order_signings').select('*').limit(1);
  if (signing && signing.length > 0) {
    console.log('Columns:', Object.keys(signing[0]));
  } else {
    // Try manual list
    const cols = ['id','order_id','worker_id','notes','status','created_by','created_at','confirmed_by','confirmed_at'];
    for (const col of cols) {
      try {
        const { error } = await supabase.from('order_signings').select(col).limit(1);
        console.log(`  ${col}: ${error ? '❌ NOT FOUND' : '✅ EXISTS'}`);
      } catch(e) { console.log(`  ${col}: ❌ ERROR`); }
    }
  }
  
  // Check workers 
  console.log('\n=== workers (first 3) ===');
  const { data: workers } = await supabase.from('workers').select('id, name').limit(3);
  console.log(workers);
  
  // Check courses columns
  console.log('\n=== courses ===');
  const { data: course } = await supabase.from('courses').select('*').limit(1);
  if (course && course.length > 0) console.log('Columns:', Object.keys(course[0]));
  else {
    for (const col of ['id','name','description','type','duration','price','status','instructor_id','max_students','created_at','updated_at']) {
      try {
        const { error } = await supabase.from('courses').select(col).limit(1);
        console.log(`  ${col}: ${error ? '❌' : '✅'}`);
      } catch(e) { console.log(`  ${col}: ERROR`); }
    }
  }

  // Check reviews
  console.log('\n=== reviews ===');
  const { data: review } = await supabase.from('reviews').select('*').limit(1);
  if (review && review.length > 0) console.log('Columns:', Object.keys(review[0]));
  
  // Check contracts
  console.log('\n=== contracts ===');
  const { data: contract } = await supabase.from('contracts').select('*').limit(1);
  if (contract && contract.length > 0) console.log('Columns:', Object.keys(contract[0]));
  
  // Check orders
  console.log('\n=== orders (first id) ===');
  const { data: order } = await supabase.from('orders').select('id').limit(1);
  console.log(order);
}

main().catch(console.error);
