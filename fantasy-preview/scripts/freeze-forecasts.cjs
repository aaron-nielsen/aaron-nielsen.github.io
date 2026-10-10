/* Freeze weekly player projections without manufacturing Yahoo or actual scores.
 * Input: current future.json. Output: timestamped, immutable pregame rows.
 * The operator must archive output before kickoff and supply kickoff timestamps.
 */
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const source=process.argv[2],week=Number(process.argv[3]),output=process.argv[4];
if(!source||!Number.isInteger(week)||!output){
 console.error('Usage: node freeze-forecasts.cjs future.json WEEK output.json');
 process.exit(2);
}
if(fs.existsSync(output)){console.error('Refusing to overwrite frozen snapshot: '+output);process.exit(2);}
const data=JSON.parse(fs.readFileSync(source,'utf8'));
const predictedAt=new Date().toISOString();
const records=(data.players||[]).flatMap(p=>{
 const w=(p.weeks||[]).find(x=>Number(x.week)===week);
 if(!w||typeof w.points!=='number'||!Number.isFinite(w.points))return [];
 return [{season:data.season,week,playerId:String(p.yahooId),position:p.position,
  name:p.name,predictedAt,daVinci:w.points,yahoo:null,actual:null,kickoffAt:null,
  forecastState:w.state||null}];
});
fs.mkdirSync(path.dirname(output),{recursive:true});
fs.writeFileSync(output,JSON.stringify({generatedAt:predictedAt,sourceGeneratedAt:data.generatedAt,
 modelVersion:data.modelVersion,season:data.season,week,records},null,2)+'\n',{flag:'wx'});
console.log('Frozen '+records.length+' player forecasts to '+output+' (no actuals or Yahoo estimates inferred).');
