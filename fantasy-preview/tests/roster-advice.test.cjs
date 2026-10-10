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
assert.match(element('lineupRecommendations').innerHTML,/Sit Flex Receiver/,'actionable sit');
const waivers=element('waiverRecommendations').innerHTML;
for(const id of ['Available QB','Available RB','Available WR','Available TE','Available Kicker','Available Defense']){
 assert.ok(waivers.includes(id),'Missing available '+id);
}
assert.match(waivers,/Drop Current Kicker/,'K upgrade has a precise replacement');
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
console.log('Roster-advice checks passed: nine slots, legal backups, injury exclusion, six-position availability, concrete K/DEF add-drop, week switching.');
