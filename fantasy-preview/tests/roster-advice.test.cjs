'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');

const script=fs.readFileSync(path.join(__dirname,'../roster-advice.js'),'utf8');
const elements=new Map();
function element(id){
 if(!elements.has(id))elements.set(id,{
  value:id==='waiverHorizon'?'next_week':id==='lineupWeek'?'5':'',
  innerHTML:'',textContent:'',ariaLabel:'',
  addEventListener(){},setAttribute(name,value){this[name]=value;}
 });
 return elements.get(id);
}
const context={document:{getElementById:element}};
vm.runInNewContext(script,context,{filename:'roster-advice.js'});
assert.ok(context.DaVinciAdvice,'Advisor installed');

const player=(id,name,position,slot,status=null)=>({id,name,position,slot,status});
const starters=[
 player('qb','Starting QB','QB','QB'),
 player('rb1','RB One','RB','RB'),
 player('rb2','RB Two','RB','RB'),
 player('wr1','WR One','WR','WR'),
 player('wr2','WR Two','WR','WR'),
 player('te','Starting TE','TE','TE'),
 player('flex','Flex Receiver','WR','W/R/T'),
 player('k','Current Kicker','K','K'),
 player('def','Current Defense','DEF','DEF')
];
const reserves=[
 player('backwr','Backup Wideout','WR','BN'),
 player('backrb','Backup Running Back','RB','BN')
];
const values={qb:[12,12],rb1:[15,15],rb2:[11,11],wr1:[18,18],wr2:[9,9],
 te:[10,10],flex:[8,8],k:[4,4],def:[5,5],backwr:[16,16],backrb:[2,2],
 faqb:[18,18],farb:[13,13],fawr:[24,24],fate:[12,12],fak:[10,10],fadef:[12,12]};
const free=[
 player('faqb','Available QB','QB','BN'),
 player('farb','Available RB','RB','BN'),
 player('fawr','Available WR','WR','BN'),
 player('fate','Available TE','TE','BN'),
 player('fak','Available Kicker','K','BN'),
 player('fadef','Available Defense','DEF','BN')
];
const future=[...starters,...reserves,...free].map(p=>({
 yahooId:p.id,name:p.name,position:p.position,nflTeam:'KC',
 ownership:free.includes(p)?'available':'rostered',
 fantasyTeamId:free.includes(p)?null:'7',
 weeks:[5,6].map((w,i)=>({week:w,points:values[p.id][i],state:'assuming_active'}))
}));
context.DaVinciAdvice.init({
 rosters:{teams:[{id:'7',name:'Test Club',players:[...starters,...reserves]}]},
 available:{players:free},
 future:{players:future,startWeek:5,endWeek:6},
 week:5,teamId:'7'
});

const selection=context.DaVinciAdvice.lineup([...starters,...reserves],5);
assert.ok(selection,'A complete nine-slot lineup exists');
assert.equal(selection.selections.length,9);
assert.equal(new Set(selection.selections.map(x=>x.player.id)).size,9,'each player can fill only one slot');
assert.deepEqual(Array.from(selection.selections.map(x=>x.slot).sort((a,b)=>a-b)),[0,1,2,3,4,5,6,7,8]);
assert.ok(selection.selections.some(x=>x.player.id==='k'),'K included');
assert.ok(selection.selections.some(x=>x.player.id==='def'),'DEF included');
assert.ok(selection.selections.some(x=>x.player.id==='backwr'),'best bench player starts');
assert.match(element('lineupRecommendations').innerHTML,/Start Backup Wideout/,'actionable start');
assert.match(element('lineupRecommendations').innerHTML,/decision-position">SIT<\/span>.*Flex Receiver/,'actionable sit');
// When the existing starters are optimal, there is no actionable change.
const originalBackupPoints=values.backwr.slice();
values.backwr[0]=6;
future.find(p=>p.yahooId==='backwr').weeks[0].points=6;
context.DaVinciAdvice.renderRecommendations();
const noChanges=element('lineupRecommendations').innerHTML;
assert.match(noChanges,/No changes recommended/);
assert.doesNotMatch(noChanges,/decision-position">KEEP</);
assert.doesNotMatch(noChanges,/\+\d+\.\d+ pts/,'No fictional gain when the lineup is already optimal');
values.backwr.splice(0,values.backwr.length,...originalBackupPoints);
future.find(p=>p.yahooId==='backwr').weeks[0].points=16;
context.DaVinciAdvice.renderRecommendations();
const waivers=element('waiverRecommendations').innerHTML;
for(const id of ['Available QB','Available RB','Available WR','Available TE','Available Kicker','Available Defense']){
 assert.ok(waivers.includes(id),'Missing available '+id);
}
assert.doesNotMatch(waivers,/Drop Current Kicker/,'Do not recommend a speculative healthy-kicker stream');
const kickerWeek5=future.find(p=>p.yahooId==='k').weeks.find(w=>w.week===5);
kickerWeek5.state='bye';
kickerWeek5.points=0;
context.DaVinciAdvice.renderWaivers();
assert.match(element('waiverRecommendations').innerHTML,/Drop Current Kicker/,'Cover a kicker bye when a full legal lineup gain is available');
kickerWeek5.state='assuming_active';
kickerWeek5.points=4;
context.DaVinciAdvice.renderWaivers();
assert.match(waivers,/Drop Current Defense/,'DEF upgrade has a precise replacement');
assert.ok(!waivers.includes('rankings are not generated'),'No dead-end message');
const disabled=context.DaVinciAdvice.lineup(starters.map(p=>p.id==='qb'?{...p,status:'IR'}:p),5);
assert.equal(disabled,null,'Injured-only quarterback cannot fill lineup');
element('lineupWeek').value='6';
context.DaVinciAdvice.renderRecommendations();
assert.equal(element('lineupChangeWeek').textContent,'WEEK 6');
element('waiverHorizon').value='four_weeks';
context.DaVinciAdvice.renderWaivers();
assert.ok(element('waiverRecommendations').innerHTML.includes('Available Defense'));
console.log('Roster-advice checks passed: nine slots, legal backups, injury exclusion, six-position availability, K bye coverage without speculative streaming, defense drops, week switching.');


/* Integration check with both actual league snapshots and K/DEF enrichment. */
const BASE=path.resolve(__dirname,'..');
const read=p=>JSON.parse(fs.readFileSync(path.join(BASE,p),'utf8'));
require(path.join(BASE,'special-teams-model.js'));
const teamContext=read('data/special-teams-context.json');
for(const league of [
 {folder:'data/',myId:'7',name:'CSU Stats'},
 {folder:'data/nebraska/',myId:'6',name:'Nebraska'}
]){
 const rosters=read(league.folder+'rosters.json');
 const available=read(league.folder+'available.json');
 const future=read(league.folder+'future.json');
 const weekly=read(league.folder+'weekly.json');
 const settings=read(league.folder+'league.json');
 const count=globalThis.DaVinciSpecialTeams.enrich({
  context:teamContext,league:settings,rosters,available,futureData:future,weekly
 });
 assert.ok(count.k>0 && count.def>0);
 elements.clear();element('lineupWeek').value='5';element('waiverHorizon').value='next_week';
 context.DaVinciAdvice.init({rosters,available,future,week:5,teamId:league.myId});
 const team=rosters.teams.find(t=>t.id===league.myId);
 assert.ok(team);
 for(const week of [5,6,7,8]){
  const lineup=context.DaVinciAdvice.lineup(team.players,week);
  assert.ok(lineup,league.name+' Week '+week+' incomplete lineup');
  assert.equal(lineup.selections.length,9);
  assert.ok(lineup.selections.some(x=>x.player.position==='K'));
  assert.ok(lineup.selections.some(x=>x.player.position==='DEF'));
 }
 const html=element('waiverRecommendations').innerHTML;
 for(const group of html.split('class="available-position"').slice(1)){
  assert.equal((group.match(/class="decision-row pickup-watch"/g)||[]).length,3,league.name+' requires three at every position');
 }
 assert.equal((html.match(/ROS total/g)||[]).length,6);
 assert.equal((html.match(/Next game<\/span>/g)||[]).length,6);
 const originalHTML=html;
 element('waiverHorizon').value='rest_of_season';context.DaVinciAdvice.renderWaivers();
 assert.equal((element('waiverRecommendations').innerHTML.match(/class="decision-row pickup-watch"/g)||[]).length,18,'ROS ranking retains three per position');
 element('waiverHorizon').value='next_week';context.DaVinciAdvice.renderWaivers();
 assert.equal(element('waiverRecommendations').innerHTML,originalHTML,'Horizon switching is repeatable');
 assert.ok(html.includes('class="available-position-grid"'),league.name+' missing shortlist');
 assert.ok(!html.includes('Joe Mixon'),league.name+' recommends a Yahoo NA inactive running back');
 for(const name of ['RB','WR','TE','QB','K','DEF']){
  assert.ok(html.includes('decision-position">'+name+'</span>'),league.name+' missing '+name+' free agents');
 }
 assert.ok(!html.includes('not generated for this league'),league.name+' still shows placeholder');
 console.log(league.name+': live snapshot generated a nine-position lineup and complete pickup ranking');
}

// A bye is skipped for next-game points; ROS is a sum, never a weekly average.
elements.clear();
const byeForecast={yahooId:'byeQB',name:'Bye Quarterback',position:'QB',ownership:'available',weeks:[{week:5,state:'bye',points:0},{week:6,state:'assuming_active',points:20},{week:7,state:'assuming_active',points:15}]};
context.DaVinciAdvice.init({rosters:{teams:[{id:'7',players:[]}]},available:{players:[{id:'byeQB'}]},future:{startWeek:5,endWeek:7,players:[byeForecast]},week:5,teamId:'7'});
const byeHTML=element('waiverRecommendations').innerHTML;
assert.match(byeHTML,/W6/);assert.match(byeHTML,/<b>20.0<\/b><b>35.0<\/b>/);
byeForecast.weeks[2].points=null;context.DaVinciAdvice.renderWaivers();
assert.match(element('waiverRecommendations').innerHTML,/<b>20.0<\/b><b>—<\/b>/,'Incomplete ROS must be unavailable, not a partial sum');
