'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const base=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(base,'playing-time-model.js'),'utf8');
const context={};vm.runInNewContext(source,context);
const apply=context.DaVinciPlayingTime?.apply;
assert.equal(typeof apply,'function');
const read=p=>JSON.parse(fs.readFileSync(path.join(base,p),'utf8'));
for(const prefix of ['data/','data/nebraska/']){
 const futureData=read(prefix+'future.json'),weekly=read(prefix+'weekly.json');
 const get=name=>futureData.players.find(p=>p.name===name);
 const lloyd=get('MarShawn Lloyd'),brooks=get('Chris Brooks'),johnson=get('Kaleb Johnson'),robinson=get('Brian Robinson');
 for(const x of [lloyd,brooks,johnson,robinson])assert.ok(x,prefix+' missing an RB sample');
 const frame=(p,w)=>p.weeks.find(g=>Number(g.week)===w);
 const originalLloyd=frame(lloyd,5).points,oldWeek6=frame(lloyd,6).points,baselineRobinson=frame(robinson,5).points;
 const result=apply({futureData,weekly});
 assert.equal(result.adjusted,3,prefix+' expected only Packers RB workload adjustment');
 assert.equal(frame(brooks,5).points,0,'Ruled-out teammate cannot get points');
 assert.ok(frame(lloyd,5).points>baselineRobinson,prefix+' Lloyd should outrank Robinson after role shift');
 assert.ok(frame(lloyd,5).points>originalLloyd,prefix+' carries and targets should rise');
 assert.ok(frame(lloyd,5).projectedStats.carries>lloyd.baselineStats.carries);
 assert.ok(frame(lloyd,5).projectedStats.targets>lloyd.baselineStats.targets);
 assert.equal(frame(lloyd,6).points,oldWeek6,'Week 5 news must not affect Week 6');
 assert.equal(frame(robinson,5).points,baselineRobinson,'Unrelated players unchanged');
 assert.ok(frame(lloyd,5).playingTime.projectedSnapShare>.5);
 assert.ok(frame(johnson,5).playingTime.projectedSnapShare>.23);
 const weeklyLloyd=weekly.players.find(x=>x.name==='MarShawn Lloyd');
 assert.equal(weeklyLloyd.weeklyProjectedPoints,frame(lloyd,5).points);
 console.log(prefix+' Week 5 Lloyd '+originalLloyd+' -> '+frame(lloyd,5).points+
  ', Brian '+baselineRobinson+', Brooks unavailable; Week 6 unchanged');
}
console.log('Snap-based playing-time model and injury opportunity redistribution passed.');

{
 const player={yahooId:'40971',name:'Example',position:'RB',nflTeam:'GB',baselineStats:{carries:10},
  weeks:[{week:7,points:10,activePoints:10,state:'unavailable_reported'},
   {week:8,points:10,activePoints:10,state:'assuming_active'}]};
 const futureData={startWeek:7,players:[player]};
 const history={players:[{id:'40971',games:[
  {week:4,snapShare:.2,carries:5},{week:5,snapShare:.4,carries:10}]}]};
 apply({futureData,history,context:{scenarios:[]}});
 assert.equal(player.weeks[0].points,10,'Do not modify ruled-out player');
 assert.equal(player.weeks[0].state,'unavailable_reported','Never revive a ruled-out player');
 assert.ok(player.weeks[1].playingTime,'Use dynamic start week for future projections');
}
console.log('Dynamic start week and unavailable-player safeguards passed.');

{
 const history={games:[{week:4,snapShare:.2,carries:5},{week:5,snapShare:.4,carries:10},{week:9,snapShare:.9,carries:30}]};
 const early=context.DaVinciPlayingTime.trend(history,'RB',7);
 const reference=context.DaVinciPlayingTime.trend({games:history.games.slice(0,2)},'RB');
 assert.equal(early.multiplier,reference.multiplier,'Week 9 observations must not leak into Week 7');
 assert.equal(early.games,2);
}
console.log('Pregame usage-history cutoff checks passed.');
