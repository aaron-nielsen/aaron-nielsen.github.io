'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const elements=new Map();
function getElementById(id){
 if(!elements.has(id))elements.set(id,{
   value:id==='tradePackageFilter'?'balanced_all':
     id==='tradePosition'?'all':id==='tradeFromWeek'?'6':
     id==='tradePartner'?'all':id==='lineupWeek'?'5':
     id==='waiverHorizon'?'next_week':'',
   innerHTML:'',textContent:'',listeners:{},
   addEventListener(event,handler){this.listeners[event]=handler;},
   setAttribute(name,value){this[name]=value;}
 });
 return elements.get(id);
}
const context={document:{getElementById}, DaVinciLab:{rankTrades(){getElementById('tradeResults').innerHTML='Legacy suggestions';}}};
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
vm.runInNewContext(read('roster-advice.js'),context);
vm.runInNewContext(read('trade-preferences.js'),context);
const make=(id,name,position,slot,teamId,status=null)=>({id,name,position,slot,status,nflTeam:'TEST',teamId});
const owner='7',partner='3';
const own=[
 make('my-qb','My QB','QB','QB',owner),make('my-rb1','My RB1','RB','RB',owner),
 make('my-rb2','My RB2','RB','RB',owner),make('my-wr1','My WR1','WR','WR',owner),
 make('my-wr2','My WR2','WR','WR',owner),make('my-te','My TE','TE','TE',owner),
 make('my-flex','My Flex','WR','W/R/T',owner),make('my-k','My K','K','K',owner),
 make('my-def','My DEF','DEF','DEF',owner),make('my-trade','Bench Wideout','WR','BN',owner)
];
const other=[
 make('their-qb','Their QB','QB','QB',partner),make('their-rb1','Their RB1','RB','RB',partner),
 make('their-rb2','Their RB2','RB','RB',partner),make('their-wr1','Their WR1','WR','WR',partner),
 make('their-wr2','Their WR2','WR','WR',partner),make('their-te','Their TE','TE','TE',partner),
 make('their-flex','Their Flex','WR','W/R/T',partner),make('their-k','Their K','K','K',partner),
 make('their-def','Their DEF','DEF','DEF',partner),make('their-target','Target Running Back','RB','BN',partner)
];
const pts={
 'my-qb':12,'my-rb1':9,'my-rb2':9,'my-wr1':32,'my-wr2':30,'my-te':10,
 'my-flex':29,'my-k':8,'my-def':7,'my-trade':26,
 'their-qb':13,'their-rb1':16,'their-rb2':15,'their-wr1':15,'their-wr2':8,
 'their-te':10,'their-flex':6,'their-k':7,'their-def':6,'their-target':16
};
const rosters={teams:[{id:owner,name:'My team',players:own},{id:partner,name:'Trade partner',players:other}]};
const future={startWeek:5,endWeek:7,players:[...own,...other].map(p=>({
 yahooId:p.id,name:p.name,position:p.position,
 fantasyTeamId:p.teamId,nflTeam:p.nflTeam,ownership:'rostered',
 weeks:[5,6,7].map(week=>({week,points:pts[p.id],state:'assuming_active'}))
}))};
const available={players:[]};
context.DaVinciAdvice.init({rosters,available,future,week:5,teamId:owner});
context.DaVinciPersonalTrades.init({
 rosters,available,future,week:5,teamId:owner,
 leagueKey:'csu',optimize:context.DaVinciAdvice.lineup
});
assert.equal(context.DaVinciPersonalTrades.active(),false);
assert.match(getElementById('tradePreferenceBuilder').innerHTML,/Players I would trade/);
assert.match(getElementById('tradePreferenceBuilder').innerHTML,/Players I want/);
assert.match(getElementById('tradeResults').innerHTML,/Legacy suggestions/);
function choose(which,player){
 const el=getElementById('trade'+which+'Choices');
 assert.equal(typeof el.listeners.change,'function');
 el.listeners.change({target:{type:'checkbox',checked:true,dataset:{id:player}}});
}
choose('Send','my-trade');
choose('Receive','their-target');
assert.equal(context.DaVinciPersonalTrades.active(),true);
let html=getElementById('tradeResults').innerHTML;
assert.match(html,/Bench Wideout/);
assert.match(html,/Target Running Back/);
assert.match(html,/Lineup ROS <b>292.0 → 306.0/);
assert.match(html,/Lineup ROS <b>212.0 → 232.0/);
assert.match(html,/1-for-1/);
assert.doesNotMatch(html,/Legacy suggestions/);
assert.ok(getElementById('tradeSendSelected').textContent.includes('1 selected'));
getElementById('tradePreferenceClear').listeners.click();
assert.equal(context.DaVinciPersonalTrades.active(),false);
assert.match(getElementById('tradeResults').innerHTML,/Legacy suggestions/);
console.log('Trade preferences passed: selectable outbound/inbound players, personalized 1-for-1, mutually beneficial lineup gains, clear and reset.');
// Expose internal helpers only inside this test's isolated evaluation.
vm.runInNewContext(read('trade-preferences.js').replace('root.DaVinciPersonalTrades={init,active,render};','root.DaVinciPersonalTrades={init,active,render,getCandidates,repairRoster};'),context);
context.DaVinciPersonalTrades.init({rosters,available,future,teamId:owner,leagueKey:'csu',optimize:context.DaVinciAdvice.lineup});
getElementById('tradePackageFilter').value='all';
const candidates=context.DaVinciPersonalTrades.getCandidates();
assert.ok(candidates.some(c=>c.send.count!==c.receive.count),'Unequal offers enter the screening pipeline');
assert.ok(candidates.every(c=>c.send.count<=3&&c.receive.count<=3),'No four-player packages');
for(const shape of ['1_for_3','3_for_2','2_for_1']){
 getElementById('tradePackageFilter').value=shape;
 const list=context.DaVinciPersonalTrades.getCandidates();
 assert.ok(list.length>0);assert.ok(list.every(c=>c.send.count+'_for_'+c.receive.count===shape));
}
const repaired=context.DaVinciPersonalTrades.repairRoster(own.concat(other[9]),own,new Set([other[9].id]),[6,7]);
assert.equal(repaired.players.length,own.length);assert.ok(repaired.players.some(p=>p.id===other[9].id));assert.match(repaired.notes.join(),/Drop/);
assert.equal(context.DaVinciPersonalTrades.repairRoster(own.slice(0,-1),own,new Set(),[6,7]),null,'Missing free agents cannot invent roster repair');

vm.runInNewContext(read('trade-preferences.js').replace('root.DaVinciPersonalTrades={init,active,render};','root.DaVinciPersonalTrades={init,active,render,yahooEvaluation};'),context);
getElementById('tradePackageFilter').value='balanced_all';
const offer={partner:rosters.teams[1],send:{players:[own[9]]},receive:{players:[other[9]]}};
const yourAfter=own.slice(0,-1).concat(other[9]),theirAfter=other.slice(0,-1).concat(own[9]);
context.DaVinciPersonalTrades.init({rosters,available,future,teamId:owner,optimize:context.DaVinciAdvice.lineup});
assert.equal(context.DaVinciPersonalTrades.yahooEvaluation(offer,[6,7],yourAfter,theirAfter),null,'Missing Yahoo projections never borrow Da Vinci values');
const yahooFuture=JSON.parse(JSON.stringify(future));yahooFuture.source='Yahoo test fixture';
context.DaVinciPersonalTrades.init({rosters,available,future,yahooFuture,teamId:owner,optimize:context.DaVinciAdvice.lineup});
const y=context.DaVinciPersonalTrades.yahooEvaluation(offer,[6,7],yourAfter,theirAfter);
assert.equal(y.gainYou,14);assert.equal(y.gainThem,20); // A 26-point WR replaces the 16-point FLEX in two weeks.
yahooFuture.players[0].weeks[1].points=null;
assert.equal(context.DaVinciPersonalTrades.yahooEvaluation(offer,[6,7],yourAfter,theirAfter),null,'Incomplete Yahoo coverage stays unknown');
const yahooEvaluations={source:'Yahoo screenshot',evaluations:[{teamId:owner,partnerId:partner,send:[own[9].id],receive:[other[9].id],startWeek:6,endWeek:7,gainYou:42.81,gainThem:-34.69}]};
context.DaVinciPersonalTrades.init({rosters,available,future,yahooEvaluations,teamId:owner,optimize:context.DaVinciAdvice.lineup});
assert.equal(context.DaVinciPersonalTrades.yahooEvaluation(offer,[6,7],yourAfter,theirAfter).gainThem,-34.69);
assert.equal(context.DaVinciPersonalTrades.yahooEvaluation(offer,[7],yourAfter,theirAfter),null,'A saved Yahoo evaluation cannot be used for a different horizon');

getElementById('tradeGoal').value='edge';
context.DaVinciPersonalTrades.render();
assert.doesNotMatch(getElementById('tradeResults').innerHTML,/trade-personal-card/,'Negative Yahoo partner gain cannot qualify as a Yahoo-fair coup');
assert.match(getElementById('tradeResults').innerHTML,/No Yahoo-verified matches/);
