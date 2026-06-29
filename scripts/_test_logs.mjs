Promise.all([
  fetch('https://szjfp-274552-8-1444411996.sh.run.tcloudbase.com/admin/dashboard?t='+Date.now()),
  fetch('https://szjfp-274552-8-1444411996.sh.run.tcloudbase.com/admin/logs?t='+Date.now()),
]).then(async ([r1,r2]) => {
  const t1=await r1.text(); const t2=await r2.text();
  const bid1=t1.match(/<!--([^-]+)-->/); const bid2=t2.match(/<!--([^-]+)-->/);
  console.log('dashboard status:', r1.status, 'buildId:', bid1?.[1]);
  console.log('logs status:', r2.status, 'buildId:', bid2?.[1]);
});
