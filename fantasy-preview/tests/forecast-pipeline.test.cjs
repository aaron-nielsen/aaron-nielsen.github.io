'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'davinci-forecast-'));
const file=(name,data)=>{const p=path.join(tmp,name);fs.writeFileSync(p,JSON.stringify(data));return p;};
const run=(script,args)=>spawnSync(process.execPath,[path.join(root,'scripts',script),...args],{encoding:'utf8'});
try{
 const source=file('future.json',{season:2026,startWeek:5,endWeek:17,generatedAt:'2026-10-09T15:00:00Z',
  modelVersion:'test',players:[{yahooId:'abc',name:'Runner',position:'RB',
   weeks:[{week:5,points:12,state:'assuming_active',date:new Date(Date.now()+86400000).toISOString().slice(0,10)}]}]});
 const frozen=path.join(tmp,'frozen.json');
 let p=run('freeze-forecasts.cjs',[source,'5',frozen]);
 assert.equal(p.status,0,p.stderr);
 assert.equal(JSON.parse(fs.readFileSync(frozen)).records[0].daVinci,12);
 p=run('freeze-forecasts.cjs',[source,'5',frozen]);
 assert.notEqual(p.status,0,'Do not overwrite immutable snapshot');
 const snap=JSON.parse(fs.readFileSync(frozen));
 const predictedAt=snap.records[0].predictedAt;
 const kickoffAt=new Date(Date.parse(predictedAt)+86400000).toISOString();
 const actuals=file('actuals.json',[{season:2026,week:5,playerId:'abc',actual:10,kickoffAt}]);
 const yahoo=file('yahoo.json',[{season:2026,week:5,playerId:'abc',yahoo:11,predictedAt}]);
 const output=path.join(tmp,'observations.json');
 p=run('join-forecast-results.cjs',[frozen,actuals,yahoo,output]);
 assert.equal(p.status,0,p.stderr);
 const observations=JSON.parse(fs.readFileSync(output));
 assert.equal(observations.length,1);
 assert.equal(observations[0].actual,10);
 assert.equal(observations[0].yahoo,11);
 p=run('evaluate-forecasts.cjs',[output]);
 assert.equal(p.status,0,p.stderr);
 const metrics=JSON.parse(p.stdout);
 assert.equal(metrics.n,1);
 assert.equal(metrics.byPosition.all.daVinci.mae,2);
 assert.equal(metrics.byPosition.all.yahoo.mae,1);
 const duplicateYahoo=file('duplicate-yahoo.json',[
  {season:2026,week:5,playerId:'abc',yahoo:11,predictedAt},
  {season:2026,week:5,playerId:'abc',yahoo:9,predictedAt}]);
 p=run('join-forecast-results.cjs',[frozen,actuals,duplicateYahoo,path.join(tmp,'duplicate.json')]);
 assert.notEqual(p.status,0,'Duplicate Yahoo pregame projections must not silently overwrite');
 const badActuals=file('bad-actuals.json',[{season:2026,week:5,playerId:'abc',actual:10,
  kickoffAt:new Date(Date.parse(predictedAt)-3600000).toISOString()}]);
 const invalidOutput=path.join(tmp,'invalid.json');
 p=run('join-forecast-results.cjs',[frozen,badActuals,yahoo,invalidOutput]);
 assert.equal(p.status,0,p.stderr);
 p=run('evaluate-forecasts.cjs',[invalidOutput]);
 assert.equal(p.status,1,'Postgame projections must not yield accuracy metrics');
 console.log('Forecast freeze → join → evaluate integration checks passed.');
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
