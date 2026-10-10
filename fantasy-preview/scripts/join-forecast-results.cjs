#!/usr/bin/env node
'use strict';
/* Attach independently sourced actuals and Yahoo pregame estimates to a frozen
 * snapshot. Never substitute current model forecasts for the frozen values.
 * The Yahoo file must contain pregame estimates with their own timestamps.
 */
const fs=require('node:fs');
const [snapshotFile,actualFile,yahooFile,outputFile]=process.argv.slice(2);
if(!snapshotFile||!actualFile||!yahooFile||!outputFile){
 console.error('Usage: node join-forecast-results.cjs frozen.json actuals.json yahoo-pregame.json observations.json');
 process.exit(2);
}
if(fs.existsSync(outputFile)){console.error('Refusing to overwrite observations');process.exit(2);}
const load=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const frozen=load(snapshotFile),actuals=load(actualFile),yahoo=load(yahooFile);
if(!Array.isArray(frozen.records)||!Array.isArray(actuals)||!Array.isArray(yahoo)){
 throw Error('Expected frozen.records, actuals array, and Yahoo array');
}
const id=x=>[x.season,x.week,String(x.playerId)].join(':');
const byActual=new Map(actuals.map(x=>[id(x),x]));
const byYahoo=new Map(yahoo.map(x=>[id(x),x]));
const records=frozen.records.flatMap(x=>{
 const a=byActual.get(id(x));if(!a||typeof a.actual!=='number'||!Number.isFinite(a.actual))return [];
 const y=byYahoo.get(id(x));
 const yahooValid=y&&typeof y.yahoo==='number'&&Number.isFinite(y.yahoo)&&
  Number.isFinite(Date.parse(y.predictedAt))&&Date.parse(y.predictedAt)<Date.parse(a.kickoffAt);
 return [{...x,kickoffAt:a.kickoffAt,actual:a.actual,
  yahoo:yahooValid?y.yahoo:null}];
});
fs.mkdirSync(require('node:path').dirname(outputFile),{recursive:true});
fs.writeFileSync(outputFile,JSON.stringify(records,null,2)+'\n',{flag:'wx'});
console.log('Matched '+records.length+' completed player-weeks, '+records.filter(x=>x.yahoo!=null).length+' with verified pregame Yahoo forecasts.');
