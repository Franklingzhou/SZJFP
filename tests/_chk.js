const r=require('../reports/report_2026-06-28T07-24-14-739Z.json')
const s=r.summary
console.log('total:',s.total,'pass:',s.pass,'fail:',s.fail)
;(r.results||[]).filter(x=>x.status==='FAIL').forEach(b=>{
  console.log('FAIL:',b.label)
  console.log('  error:',b.error||JSON.stringify(b.actual).slice(0,120))
})
