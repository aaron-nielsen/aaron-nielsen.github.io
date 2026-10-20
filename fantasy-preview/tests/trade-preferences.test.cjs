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
vm.runInNewContext(read('yahoo-values.js'),context);
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
vm.runInNewContext(read('trade-preferences.js').replace('root.DaVinciPersonalTrades={init,active,render};','root.DaVinciPersonalTrades={init,active,render,getCandidates,repairRoster,rejectedOffer};'),context);
context.DaVinciPersonalTrades.init({rosters,available,future,teamId:owner,leagueKey:'csu',optimize:context.DaVinciAdvice.lineup});
const rejectedNotes={leagueKey:'csu',rejectedOffers:[{teamId:partner,send:[own[0].name,own[1].name],receive:[other[0].name]}]};
context.DaVinciPersonalTrades.init({rosters,available,future,teamId:owner,leagueKey:'csu',negotiations:rejectedNotes,optimize:context.DaVinciAdvice.lineup});
assert.equal(context.DaVinciPersonalTrades.rejectedOffer(partner,[own[1],own[0]],[other[0]]),true,'Rejected offers match regardless of player order');
assert.equal(context.DaVinciPersonalTrades.rejectedOffer('unrelated',[own[1],own[0]],[other[0]]),false,'Rejections apply only to the specified manager');
assert.equal(context.DaVinciPersonalTrades.rejectedOffer(partner,[own[1]],[other[0]]),false,'Different packages remain eligible');
context.DaVinciPersonalTrades.init({rosters,available,future,teamId:owner,leagueKey:'csu',optimize:context.DaVinciAdvice.lineup});
getElementById('tradePackageFilter').value='all';
const candidates=context.DaVinciPersonalTrades.getCandidates();
assert.ok(candidates.some(c=>c.send.count!==c.receive.count),'Unequal offers enter the screening pipeline');
assert.ok(candidates.every(c=>c.send.count<=3&&c.receive.count<=3),'No four-player packages');
getElementById('tradePackageFilter').value='practical';
const practical=context.DaVinciPersonalTrades.getCandidates();
assert.ok(practical.length>0);
assert.ok(practical.every(c=>['1_for_1','2_for_1','1_for_2','2_for_2','3_for_2','2_for_3'].includes(c.send.count+'_for_'+c.receive.count)),'Practical packages match the preferred trade shapes');
for(const [mode,n] of [['one_each',1],['two_each',2],['three_each',3]]){
 getElementById('tradePackageFilter').value=mode;
 const list=context.DaVinciPersonalTrades.getCandidates();
 assert.ok(list.length>0);
 assert.ok(list.every(c=>c.send.count===n&&c.receive.count===n),'Only selected balanced shape enters the pipeline');
}
for(const shape of ['1_for_3','3_for_2','2_for_1']){
 getElementById('tradePackageFilter').value=shape;
 const list=context.DaVinciPersonalTrades.getCandidates();
 assert.ok(list.length>0);assert.ok(list.every(c=>c.send.count+'_for_'+c.receive.count===shape));
}
const repaired=context.DaVinciPersonalTrades.repairRoster(own.concat(other[9]),own,new Set([other[9].id]),[6,7]);
assert.equal(repaired.players.length,own.length);assert.ok(repaired.players.some(p=>p.id===other[9].id));assert.match(repaired.notes.join(),/Drop/);
assert.equal(context.DaVinciPersonalTrades.repairRoster(own.slice(0,-1),own,new Set(),[6,7]),null,'Missing free agents cannot invent roster repair');

vm.runInNewContext(read('trade-preferences.js').replace('root.DaVinciPersonalTrades={init,active,render};','root.DaVinciPersonalTrades={init,active,render,yahooEvaluation,arbitrageValues,getCandidates,distinctTrades};'),context);
getElementById('tradePackageFilter').value='balanced_all';
const offer={partner:rosters.teams[1],send:{players:[own[9]]},receive:{players:[other[9]]}};
const yourAfter=own.slice(0,-1).concat(other[9]),theirAfter=other.slice(0,-1).concat(own[9]);
context.DaVinciPersonalTrades.init({rosters,available,future,teamId:owner,optimize:context.DaVinciAdvice.lineup});
assert.equal(context.DaVinciPersonalTrades.yahooEvaluation(offer,[6,7],yourAfter,theirAfter),null,'Missing Yahoo projections never borrow Da Vinci values');
const yahooFuture=JSON.parse(JSON.stringify(future));yahooFuture.source='Yahoo test fixture';
context.DaVinciPersonalTrades.init({rosters,available,future,yahooFuture,teamId:owner,optimize:context.DaVinciAdvice.lineup});
const y=context.DaVinciPersonalTrades.yahooEvaluation(offer,[6,7],yourAfter,theirAfter);
assert.equal(y.gainYou,14);assert.equal(y.gainThem,20); // A 26-point WR replaces the 16-point FLEX in two weeks.
const arb=context.DaVinciPersonalTrades.arbitrageValues(offer,rosters.teams[0],[6,7]);
assert.equal(arb.players[0].arbitrage,36,'An outgoing player more useful to the partner is positive arbitrage');
assert.equal(arb.players[1].arbitrage,-6,'An incoming player more useful to its owner is negative arbitrage');
assert.equal(arb.total,30,'Total marginal value sums both transfer spreads');
assert.equal(arb.fullTrade,34,'Full trade impact is independently recomputed rather than summing overlapping player values');
const variant={...offer,send:{players:[own[9],own[7]]},receive:{players:[other[9],other[8]]}};
const alternative={...offer,receive:{players:[other[3]]}};
const distinct=context.DaVinciPersonalTrades.distinctTrades([offer,variant,alternative],rosters.teams[0],[6,7]);
assert.equal(distinct.length,2,'A kicker/defense throw-in must not turn the same target into another trade idea');
assert.equal(distinct[0],offer,'Keep the highest-ranked package for the target');
assert.equal(distinct[1],alternative,'Different targets remain available');

getElementById('tradeGoal').value='arbitrage';
assert.ok(context.DaVinciPersonalTrades.getCandidates().some(c=>c.send.players.some(p=>p.id==='my-trade')&&c.receive.players.some(p=>p.id==='their-target')),'Positive outgoing arbitrage can qualify despite negative incoming arbitrage');
context.DaVinciPersonalTrades.render();
assert.match(getElementById('tradeResults').innerHTML,/trade-personal-card/);
assert.doesNotMatch(getElementById('tradeResults').innerHTML,/Full-trade value|Model assumptions|YahooArbitrage/);
getElementById('tradeGoal').value='';
yahooFuture.players[1].weeks[1].points=null;
context.DaVinciPersonalTrades.init({rosters,available,future,yahooFuture,teamId:owner,optimize:context.DaVinciAdvice.lineup});
assert.equal(context.DaVinciPersonalTrades.yahooEvaluation(offer,[6,7],yourAfter,theirAfter),null,'Incomplete Yahoo coverage stays unknown');
const yahooEvaluations={source:'Yahoo screenshot',evaluations:[{teamId:owner,partnerId:partner,send:[own[9].id],receive:[other[9].id],startWeek:6,endWeek:7,gainYou:42.81,gainThem:-34.69}]};
context.DaVinciPersonalTrades.init({rosters,available,future,yahooFuture,yahooEvaluations,teamId:owner,optimize:context.DaVinciAdvice.lineup});
assert.equal(context.DaVinciPersonalTrades.yahooEvaluation(offer,[6,7],yourAfter,theirAfter),null,'Historical evaluations cannot fill missing refreshed projections');
yahooFuture.players[1].weeks[1].points=future.players[1].weeks[1].points;
context.DaVinciPersonalTrades.init({rosters,available,future,yahooFuture,yahooEvaluations,teamId:owner,optimize:context.DaVinciAdvice.lineup});
assert.equal(context.DaVinciPersonalTrades.yahooEvaluation(offer,[6,7],yourAfter,theirAfter).gainThem,20,'Refreshed projections override the old screenshot result');
context.DaVinciPersonalTrades.init({rosters,available,future,yahooEvaluations,teamId:owner,optimize:context.DaVinciAdvice.lineup});
assert.equal(context.DaVinciPersonalTrades.yahooEvaluation(offer,[6,7],yourAfter,theirAfter).gainThem,-34.69);
assert.equal(context.DaVinciPersonalTrades.yahooEvaluation(offer,[7],yourAfter,theirAfter),null,'A saved Yahoo evaluation cannot be used for a different horizon');

getElementById('tradeGoal').value='edge';
context.DaVinciPersonalTrades.render();
assert.doesNotMatch(getElementById('tradeResults').innerHTML,/trade-personal-card/,'Negative Yahoo partner gain cannot qualify as a Yahoo-fair coup');
assert.match(getElementById('tradeResults').innerHTML,/No matching trades in this period/);

// Yahoo fairness is mandatory even when Da Vinci projects a strong gain.
getElementById('tradeFromWeek').value='6';
getElementById('tradePackageFilter').value='balanced_all';
const fairYahoo={source:'Yahoo exact fixture',evaluations:[{teamId:owner,partnerId:partner,send:[own[9].id],receive:[other[9].id],startWeek:6,endWeek:7,gainYou:-12,gainThem:6}]};
context.DaVinciPersonalTrades.init({rosters,available,future,yahooEvaluations:fairYahoo,teamId:owner,optimize:context.DaVinciAdvice.lineup});
context.DaVinciPersonalTrades.render();
assert.match(getElementById('tradeResults').innerHTML,/Your Da Vinci upside/);
assert.match(getElementById('tradeResults').innerHTML,/Partner’s lineup impact/);
assert.match(getElementById('tradeResults').innerHTML,/-12.00/,'Yahoo own-side loss remains visible instead of being overwritten by Da Vinci');
fairYahoo.evaluations[0].gainThem=-1;
context.DaVinciPersonalTrades.init({rosters,available,future,yahooEvaluations:fairYahoo,teamId:owner,optimize:context.DaVinciAdvice.lineup});
context.DaVinciPersonalTrades.render();
assert.match(getElementById('tradeResults').innerHTML,/No matching trades in this period/,'Negative Yahoo partner impact cannot qualify');
const references=JSON.parse(read('data/yahoo-trade-evaluations.json')).evaluations.filter(e=>e.partnerId==='12');
assert.equal(references.length,2);
for(const e of references){
 assert.equal(Math.round(e.weeklyImpacts.reduce((n,w)=>n+w.you,0)*100)/100,e.gainYou);
 assert.equal(Math.round(e.weeklyImpacts.reduce((n,w)=>n+w.them,0)*100)/100,e.gainThem);
}

// Hall's current injury makes him unavailable to the trade candidate pool.
const hurtHall={...own[9],id:'33991',name:'Breece Hall',position:'RB',status:'O'};
const injuryRosters={teams:[{...rosters.teams[0],players:own.concat(hurtHall)},rosters.teams[1]]};
const injuryFuture={...future,players:future.players.concat({...future.players[9],yahooId:'33991',name:'Breece Hall',position:'RB'})};
vm.runInNewContext(read('trade-preferences.js').replace('root.DaVinciPersonalTrades={init,active,render};','root.DaVinciPersonalTrades={init,active,render,getCandidates};'),context);
context.DaVinciPersonalTrades.init({rosters:injuryRosters,available,future:injuryFuture,teamId:owner,optimize:context.DaVinciAdvice.lineup});
assert.ok(context.DaVinciPersonalTrades.getCandidates().every(c=>![...c.send.players,...c.receive.players].some(p=>p.id==='33991')));
assert.doesNotMatch(getElementById('tradeOutChoices').innerHTML,/Breece Hall/);

// Kicker and defense totals cannot serve as payment for offensive players.
const screened=context.DaVinciPersonalTrades.getCandidates();
for(const c of screened){
 const core=pack=>pack.players.some(p=>!['K','DEF'].includes(p.position));
 assert.equal(core(c.send),core(c.receive),'Special teams are throw-ins, not offensive trade currency');
}

getElementById('tradePackageFilter').value='practical';getElementById('tradePosition').value='all';
const focused={leagueKey:'csu',targetSearch:{partnerId:partner,targetId:'their-target',anchorId:'my-rb2',bonusId:'my-def',companionPositions:['TE','WR']}};
context.DaVinciPersonalTrades.init({rosters,available,future,teamId:owner,leagueKey:'csu',negotiations:focused,optimize:context.DaVinciAdvice.lineup});
const focusedCandidates=context.DaVinciPersonalTrades.getCandidates().filter(c=>c.requestedTarget);
assert.ok(focusedCandidates.some(c=>c.shape==='3-for-1'&&c.send.players.some(p=>p.id==='my-def')),'Explicit requested core plus defense must survive practical-package pruning');
assert.ok(focusedCandidates.every(c=>!c.send.players.some(p=>p.slot==='IR')));
assert.ok(focusedCandidates.every(c=>c.send.players.some(p=>p.id==='my-rb2')&&c.receive.players.some(p=>p.id==='their-target')));
getElementById('tradePackageFilter').value='one_each';
assert.equal(context.DaVinciPersonalTrades.getCandidates().filter(c=>c.requestedTarget).length,0,'Focused offers still honor exact shape filters');
