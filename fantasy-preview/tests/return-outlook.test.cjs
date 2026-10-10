'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const base=path.resolve(__dirname,'..');
const read=p=>JSON.parse(fs.readFileSync(path.join(base,p),'utf8'));
const sandbox={};
vm.runInNewContext(fs.readFileSync(path.join(base,'return-outlook.js'),'utf8'),sandbox);
assert.ok(sandbox.DaVinciReturns,'Return model loaded');
for(const folder of ['data/','data/nebraska/']){
 const futureData=read(folder+'future.json'),weekly=read(folder+'weekly.json');
 const names=['Josh Jacobs','Alec Pierce'];
 const prior=new Map(names.map(name=>{
  const p=futureData.players.find(p=>p.name===name);
  assert.ok(p,folder+name+' missing');
  return [name,new Map(p.weeks.map(f=>[f.week,f.activePoints]))];
 }));
 const {changed}=sandbox.DaVinciReturns.apply({futureData,weekly});
 assert.equal(changed,2,folder+' return scenarios count');
 for(const name of names){
  const p=futureData.players.find(p=>p.name===name);
  const frames=new Map(p.weeks.map(f=>[f.week,f]));
  for(const w of [5,6,7,8,9,10,12,13,17]){
   const f=frames.get(w);
   assert.ok(f,folder+name+' Week '+w+' missing');
   const prob=f.availabilityProbability;
   assert.ok(prob>=0&&prob<=1);
   assert.ok(Math.abs(f.points-Math.round(prior.get(name).get(w)*prob*100)/100)<0.001||
    f.state==='bye',folder+name+' weighted points W'+w);
  }
  assert.equal(frames.get(5).points,0);
 }
 const jacobs=futureData.players.find(p=>p.name==='Josh Jacobs');
 const pierce=futureData.players.find(p=>p.name==='Alec Pierce');
 assert.equal(jacobs.weeks.find(f=>f.week===6).points,0,'Jacobs not arbitrarily active Week 6');
 assert.equal(pierce.weeks.find(f=>f.week===6).points,0,'Pierce is barred Week 6');
 assert.ok(!sandbox.DaVinciReturns.ready(pierce,7),'Only 35% scenario, not in projected starters Week 7');
 assert.ok(sandbox.DaVinciReturns.ready(pierce,8),'Consider Pierce from Week 8 at 55%');
 assert.ok(!sandbox.DaVinciReturns.ready(jacobs,12));
 assert.ok(sandbox.DaVinciReturns.ready(jacobs,13));
 assert.ok(jacobs.weeks.find(f=>f.week===13).activePoints>jacobs.weeks.find(f=>f.week===13).points);
 console.log(folder+' verified projected return windows and conditional versus probability-weighted points');
}
// Check optimizer re-introduces only a specifically reviewed, plausibly available player.
const nodes=new Map();
const element=id=>{
 if(!nodes.has(id))nodes.set(id,{value:id==='lineupWeek'?'5':'next_week',
  innerHTML:'',textContent:'',options:[],addEventListener(){},setAttribute(){}});
 return nodes.get(id);
};
const ctx={document:{getElementById:element}};
vm.runInNewContext(fs.readFileSync(path.join(base,'roster-advice.js'),'utf8'),ctx);
const basePlayers=[
 ['qb','Quarterback','QB','QB',11],['rb1','First Back','RB','RB',11],
 ['rb2','Second Back','RB','RB',11],['wr1','First WR','WR','WR',11],
 ['wr2','Second WR','WR','WR',2],['te','Tight End','TE','TE',11],
 ['flex','Flex','WR','W/R/T',11],['k','Kicker','K','K',7],['def','Defense','DEF','DEF',6]
];
const players=basePlayers.map(([id,name,position,slot,score])=>({id,name,position,slot}));
players.push({id:'34008',name:'Alec Pierce',position:'WR',slot:'IR',status:'IR'});
const future={startWeek:5,endWeek:17,players:basePlayers.map(([id,name,position,slot,score])=>({
 yahooId:id,name,position,ownership:'rostered',weeks:[5,6,7,8,9].map(week=>({week,points:score}))
}))};
future.players.push({yahooId:'34008',name:'Alec Pierce',position:'WR',ownership:'rostered',
 weeks:[5,6,7,8,9].map(week=>({week,points:10,activePoints:10,state:'assumed_active_future'}))});
sandbox.DaVinciReturns.apply({futureData:future,weekly:{week:5,players:[]}});
ctx.DaVinciAdvice.init({rosters:{teams:[{id:'7',players}]},available:{players:[]},future,teamId:'7',week:5});
for(const w of [6,7]){
 const result=ctx.DaVinciAdvice.lineup(players,w);
 assert.ok(result&&!result.selections.some(s=>s.player.id==='34008'),'Pierce should not start Week '+w);
}
const week8=ctx.DaVinciAdvice.lineup(players,8);
assert.ok(week8?.selections.some(s=>s.player.id==='34008'),'Pierce can compete for future starter Week 8');
console.log('Optimizer respects IR now, a conservative return threshold, and probability-weighted points.');
