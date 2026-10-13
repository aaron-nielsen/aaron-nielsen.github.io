'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {refresh}=require('../scripts/refresh-week.cjs');
const base=fs.mkdtempSync(path.join(os.tmpdir(),'fantasy-refresh-'));
try{
 const write=(n,d)=>fs.writeFileSync(path.join(base,n+'.json'),JSON.stringify(d));
 const read=n=>JSON.parse(fs.readFileSync(path.join(base,n+'.json'),'utf8'));
 write('league',{leagueId:'l',currentWeekAtSnapshot:5});write('week',{week:5});write('rosters',{teams:[]});
 write('weekly',{week:5,generatedAt:'old-model',players:[{yahooId:'p',opponent:'OLD',weeklyProjectedPoints:99}]});
 write('future',{startWeek:5,endWeek:7,generatedAt:'old-model',statsThroughWeek:4,coverage:{},players:[{yahooId:'p',position:'RB',weeks:[{week:5,points:99},{week:6,opponent:'NEW',home:false,activePoints:12,points:12,state:'assumed_active_future'}]}]});
 const roster=id=>({success:true,data:{teamKey:'l.t.'+id,teamName:'Team '+id,snapshot:{type:'current'},players:id==='1'?[{playerId:'p',name:'Player',position:'RB',team:'NFL',selectedPosition:'RB',status:'Q'}]:[]}});
 const raw={league:{success:true,data:{leagueKey:'l',numTeams:2,currentWeek:6,statModifiers:[]}},matchups:{success:true,data:{leagueKey:'l',matchupWeek:6,matchups:[{matchupId:1,home:{teamId:'1',teamName:'One'},away:{teamId:'2',teamName:'Two'}}]}},standings:{success:true,data:{leagueKey:'l',standings:[{teamId:'1',wins:1,losses:4},{teamId:'2',wins:4,losses:1}]}},rosters:[roster('1'),roster('2')]};
 assert.throws(()=>refresh(base,{...raw,rosters:[roster('1')]}),/Incomplete roster/);
 assert.equal(read('week').week,5,'Partial refresh must not advance the dashboard');
 refresh(base,raw,'2026-10-13T20:00:00Z');
 const weekly=read('weekly');assert.equal(weekly.week,6);assert.equal(weekly.players[0].opponent,'NEW');assert.equal(weekly.players[0].activeGamePoints,12);assert.equal(weekly.players[0].weeklyProjectedPoints,null,'Questionable is conditional, not confirmed');
 assert.equal(weekly.generatedAt,'old-model');assert.equal(read('future').statsThroughWeek,4,'Rollover must not claim newly collected stats');
 assert.equal(read('historical/snapshot-week-5').weekly.players[0].weeklyProjectedPoints,99,'Keep the original snapshot for history');
 raw.rosters[0].data.players[0].status=null;
 refresh(base,raw);
 assert.equal(read('weekly').players[0].weeklyProjectedPoints,12,'Cleared roster status must clear stale uncertainty');
 console.log('Week rollover, partial-refresh rejection, dated model provenance and status changes passed');
}finally{fs.rmSync(base,{recursive:true,force:true});}
