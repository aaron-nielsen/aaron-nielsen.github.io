'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
global.document={getElementById:()=>null};
require('../roster-advice.js');require('../planning-model.js');
const positions=['QB','RB','RB','WR','WR','TE','TE','K','DEF'];
const players=positions.map((position,i)=>({id:String(i),name:'Starter '+i,position,slot:'BN',nflTeam:'LAR'}));
const rival=players.map(p=>({...p,id:'r'+p.id,name:'Rival '+p.id}));
const free=[{id:'fa',name:'Available WR',position:'WR',nflTeam:'LAR'},{id:'bad',name:'Inactive WR',position:'WR',nflTeam:'LAR',status:'IR'},{id:'none',name:'Unmodeled WR',position:'WR',nflTeam:'LAR'}];
const future={startWeek:5,endWeek:7,players:[...players,...rival,...free.slice(0,2)].map(p=>({yahooId:p.id,name:p.name,position:p.position,weeks:[6,7].map(week=>({week,opponent:week===6?'ARI':'LV',points:p.id==='fa'?5:p.id==='bad'?100:p.id==='r3'?2:10,state:'scheduled'}))}))};
const data={week:5,teamId:'a',rosters:{teams:[{id:'a',name:'My team',players},{id:'b',name:'Opponent',players:rival}]},available:{players:free},future,schedule:{weeks:[{week:6,matchups:[{home:{id:'a',name:'My team'},away:{id:'b',name:'Opponent'}}]}]},nflSchedule:{games:[{week:6,home_team:'LA',away_team:'ARI',gameday:'2026-10-18'}]}};
global.DaVinciAdvice.init(data);data.optimize=global.DaVinciAdvice.lineup;
const model=global.DaVinciPlanningModel.create(data),weeks=model.range();
assert.deepEqual(weeks,[6,7]);
const value=model.value(players[3],weeks);assert.equal(value.ros,20);assert.equal(value.reference,10);assert.equal(value.vor,10,'Inactive waiver players cannot inflate the replacement baseline');
assert.equal(model.value(free[0],weeks).vor,0,'The best available player equals the replacement baseline');
assert.equal(model.value(free[2],weeks).vor,null,'Missing projections remain unknown');
assert.equal(model.value(players[0],weeks).vor,null,'No available same-position replacement remains unknown');
const impact=model.impactContext(weeks);assert.equal(impact(model.players.find(p=>p.id==='3')).impact,10);assert.equal(impact(free[0]).impact,0,'A weaker free agent does not improve the full lineup');
assert.equal(impact(free[2]).impact,null);
const schedule=model.schedule();assert.equal(schedule[0].opponent,'Opponent');assert.equal(schedule[0].margin,8);assert.equal(schedule[0].weaknesses[0].pos,'WR');assert.equal(schedule[0].weaknesses[0].gap,-4);
assert.equal(schedule[1].opponent,null);assert.equal(schedule[1].theirs,null);assert.equal(schedule[1].margin,null,'Unknown playoff pairings cannot reuse current opponents');
assert.equal(model.nflGame(players[0],6).opponent,'ARI');assert.equal(model.nflGame(players[0],7),null);
future.players.find(p=>p.yahooId==='3').weeks[0]={week:6,state:'bye',points:0};
assert.equal(model.value(players[3],weeks).vor,0,'Bye zero remains a real zero, with the streaming replacement cost retained');

for(const base of ['data','data/nebraska']){
 const read=n=>JSON.parse(fs.readFileSync(path.join(__dirname,'..',base,n+'.json'),'utf8'));
 const data={rosters:read('rosters'),available:read('available'),future:read('future'),weekly:read('weekly'),week:read('week').week};
 require('../special-teams-model.js');require('../availability-sanity.js');require('../return-outlook.js');require('../playing-time-model.js');
 global.DaVinciEligibility.reconcile({...data,futureData:data.future});global.DaVinciReturns.apply({futureData:data.future,weekly:data.weekly});
 global.DaVinciPlayingTime.apply({futureData:data.future,weekly:data.weekly,history:JSON.parse(fs.readFileSync(path.join(__dirname,'../data/usage-history.json'),'utf8'))});
 global.DaVinciSpecialTeams.enrich({...data,futureData:data.future,league:read('league'),context:JSON.parse(fs.readFileSync(path.join(__dirname,'../data/special-teams-context.json'),'utf8'))});
 data.teamId=read('league').userTeamId;global.DaVinciAdvice.init(data);data.optimize=global.DaVinciAdvice.lineup;data.schedule=read('matchup-schedule');data.nflSchedule=JSON.parse(fs.readFileSync(path.join(__dirname,'../data/nfl-schedule.json'),'utf8'));
 const m=global.DaVinciPlanningModel.create(data);assert.equal(m.players.length,new Set(m.players.map(p=>String(p.id))).size);assert.ok(m.players.length>=500);
 for(const p of m.players){const v=m.value(p,m.range());assert.ok(v.vor===null||Number.isFinite(v.vor));}
 assert.equal(m.schedule().length,data.future.endWeek-data.week);assert.ok(m.schedule().some(r=>r.opponent));
 for(const p of m.forecasts.values())for(const w of p.weeks){const game=m.nflGame(p,w.week);assert.equal(global.DaVinciPlanningModel.norm(game?.opponent),global.DaVinciPlanningModel.norm(w.opponent),p.name+' W'+w.week+' schedule mismatch');}
 console.log(base+': '+m.players.length+' unique player values, future matchup pairings and all NFL opponents verified');
}
console.log('Replacement values, legal lineup impact, unknown forecasts, byes and opponent weaknesses passed.');
