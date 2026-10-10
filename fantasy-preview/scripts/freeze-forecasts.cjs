/* Freeze weekly player projections without manufacturing Yahoo or actual scores.
 * Input: current future.json. Output: timestamped, immutable pregame rows.
 * The operator must archive output before kickoff and supply kickoff timestamps.
 */
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const source=process.argv[2],week=Number(process.argv[3]),output=process.argv[4];
const maxAgeHours=Number(process.env.DAVINCI_MAX_FORECAST_AGE_HOURS||72);
if(!source||!Number.isInteger(week)||!output){
 console.error('Usage: node freeze-forecasts.cjs future.json WEEK output.json');
 process.exit(2);
}
if(fs.existsSync(output)){console.error('Refusing to overwrite frozen snapshot: '+output);process.exit(2);}
const data=JSON.parse(fs.readFileSync(source,'utf8'));
const predictedAt=new Date().toISOString();
if(!Number.isInteger(data.season)||!Array.isArray(data.players)||!Number.isFinite(Date.parse(data.generatedAt))){
 throw Error('Invalid source forecast metadata; refusing to freeze');
}
if(Date.parse(data.generatedAt)>Date.parse(predictedAt))throw Error('Source forecast timestamp is in the future');
if(!Number.isFinite(maxAgeHours)||maxAgeHours<=0)throw Error('Invalid maximum forecast age');
if((Date.parse(predictedAt)-Date.parse(data.generatedAt))/3600000>maxAgeHours)
 throw Error('Source forecast too old to freeze as current pregame forecast');
if(week<Number(data.startWeek)||week>Number(data.endWeek))throw Error('Requested week outside forecast coverage');
const records=(data.players||[]).flatMap(p=>{
 const w=(p.weeks||[]).find(x=>Number(x.week)===week);
 if(!w||typeof w.points!=='number'||!Number.isFinite(w.points))return [];
 return [{season:data.season,week,playerId:String(p.yahooId),position:p.position,
  name:p.name,predictedAt,daVinci:w.points,yahoo:null,actual:null,kickoffAt:null,
  forecastState:w.state||null}];
});
if(!records.length)throw Error('No valid forecasts for requested week; refusing empty snapshot');
const weekDates=(data.players||[]).flatMap(p=>(p.weeks||[]).filter(w=>Number(w.week)===week&&w.date).map(w=>w.date));
if(!weekDates.length||!weekDates.some(d=>Date.parse(d+'T23:59:59Z')>Date.parse(predictedAt)))
 throw Error('Requested week has no future games; refusing retrospective freeze');
fs.mkdirSync(path.dirname(output),{recursive:true});
fs.writeFileSync(output,JSON.stringify({generatedAt:predictedAt,sourceGeneratedAt:data.generatedAt,
 modelVersion:data.modelVersion,season:data.season,week,records},null,2)+'\n',{flag:'wx'});
console.log('Frozen '+records.length+' player forecasts to '+output+' (no actuals or Yahoo estimates inferred).');
