'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const base=path.resolve(__dirname,'..');
const ctx={};
vm.runInNewContext(fs.readFileSync(path.join(base,'availability-sanity.js'),'utf8'),ctx);
const reconcile=ctx.DaVinciEligibility.reconcile;
const read=p=>JSON.parse(fs.readFileSync(path.join(base,p),'utf8'));
for(const folder of ['data/','data/nebraska/']){
 const available=read(folder+'available.json');
 const futureData=read(folder+'future.json');
 const weekly=read(folder+'weekly.json');
 const joe=available.players.find(p=>p.name==='Joe Mixon');
 assert.equal(joe?.status,'NA',folder+' Yahoo correctly reports Joe Mixon as inactive');
 const before=futureData.players.find(p=>p.yahooId===joe.id);
 assert.ok(before?.weeks?.some(w=>w.points>10),folder+' reproduces the stale historical projection');
 const beforeValid=futureData.players.find(p=>p.ownership==='available'&&available.players.some(x=>x.id===p.yahooId&&x.status==null));
 const previous=beforeValid&&JSON.stringify(beforeValid.weeks);
 const {excluded}=reconcile({available,futureData,weekly});
 assert.ok(excluded>0,folder+' reconciled inactive available players');
 const after=futureData.players.find(p=>p.yahooId===joe.id);
 assert.equal(after.injuryStatus,'NA',folder+' has current availability');
 assert.ok(after.weeks.every(w=>w.points===0&&w.state==='unavailable_reported'),folder+' cannot assign games to a released NFL player');
 const weeklyJoe=weekly.players.find(p=>p.yahooId===joe.id);
 if(weeklyJoe)assert.equal(weeklyJoe.weeklyProjectedPoints,0,folder+' weekly readout must be zero');
 if(beforeValid)assert.equal(JSON.stringify(beforeValid.weeks),previous,'Active free-agent projections remain unchanged');
 console.log(folder+' Joe Mixon + '+excluded+' inactive-player forecasts corrected');
}

// Current injury reports win over healthy historical forecasts, including after enrichment.
{
 const available={players:[{id:'40118',name:"De'Von Achane",status:'IR'},{id:'conner',status:'IR-R'}]};
 const futureData={startWeek:5,players:[{yahooId:'40118',name:"De'Von Achane",weeks:[{week:5,points:20},{week:6,points:20}]},{yahooId:'conner',name:'James Conner',weeks:[{week:5,points:15},{week:6,points:15}]}]};
 const weekly={week:5,players:[{yahooId:'40118',weeklyProjectedPoints:20},{yahooId:'conner',weeklyProjectedPoints:15}]};
 reconcile({available,futureData,weekly});
 assert.ok(futureData.players[0].weeks.every(w=>w.points===0),'Season-ending injury has no remaining games');
 assert.equal(futureData.players[1].weeks[0].points,0,'IR player has no current-week projection');
 assert.equal(futureData.players[1].weeks[1].points,15,'Healthy future scenario is retained without inventing a return date');
 assert.ok(weekly.players.every(p=>p.weeklyProjectedPoints===0));
 futureData.players[1].weeks[0].points=19;
 reconcile({available,futureData,weekly});
 assert.equal(futureData.players[1].weeks[0].points,0,'Final reconciliation blocks healthy enrichment leaking into current week');
}
