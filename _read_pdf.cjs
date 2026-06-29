const fs = require('fs');
const pdf = require('pdf-parse');
const buf = fs.readFileSync('docs/家政共创平台功能测试报告_v2.7_v010.pdf');
pdf(buf).then(r => console.log(r.text)).catch(e => console.error(e));
