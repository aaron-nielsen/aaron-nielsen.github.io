'use strict';
/* Build the dashboard data from reviewed completed-week observation files.
 * Refuse empty, duplicate, or unverified input. The dashboard uses the same
 * validation as the CLI, so no current/future projections can leak in.
 */
const fs=require('node:fs'),path=require('node:path');
const {evaluate}=require('../forecast-accuracy.js');
const [output,...inputs]=process.argv.slice(2);
if(!output||!inputs.length){console.error('Usage: node publish-observations.cjs output.json week1.json [week2.json ...]');process.exit(2);}
const all=[];
for(const input of inputs){
 const rows=JSON.parse(fs.readFileSync(input,'utf8'));
 if(!Array.isArray(rows))throw Error('Expected completed-week observation array: '+input);
 all.push(...rows);
}
const report=evaluate(all);
if(!report.n||report.excluded.invalid||report.excluded.notPregame||report.excluded.duplicate){
 throw Error('Cannot publish unverified observations: '+JSON.stringify({n:report.n,excluded:report.excluded}));
}
const out=path.resolve(output);
fs.mkdirSync(path.dirname(out),{recursive:true});
fs.writeFileSync(out,JSON.stringify(all,null,2)+'\n');
console.log('Published '+report.n+' verified player-weeks; '+report.byPosition.all.paired.n+' paired with Yahoo.');
