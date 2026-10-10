'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const base=path.resolve(__dirname,'..');
const load=p=>JSON.parse(fs.readFileSync(path.join(base,p),'utf8'));
const src=p=>fs.readFileSync(path.join(base,p),'utf8');
function setup(){
 const elements=new Map();
 const element=id=>{
  if(!elements.has(id))elements.set(id,{
   value:'all',innerHTML:'',textContent:'',listeners:{},
   addEventListener(type,fn){this.listeners[type]=fn;},
   setAttribute(name,value){this[name]=value;},setAttribute(){}
  });
  return elements.get(id);
 };
 const ctx={document:{getElementById:element}};
 vm.runInNewContext(src('transaction-grades.js'),ctx,{filename:'transaction-grades.js'});
 return {ctx,element};
}
// A chain of two moves must grade the older transaction against the THEN roster,
// not today's roster after the subsequent add/drop.
{
 const {ctx,element}=setup();
 const mk=(id,p=1)=>({id,name:id,position:'RB',slot:'BN',status:null});
 const roster={teams:[{id:'7',name:'History Team',players:[mk('C')]}]};
 const future={startWeek:5,endWeek:8,players:['A','B','C'].map((id,i)=>({
  yahooId:id,name:id,position:'RB',weeks:[5,6,7,8].map(week=>({week,points:(i+1)*10}))
 }))};
 const transaction=t=>({...t,status:'complete',date:'2026-10-02',type:'add',team_ids:['470.l.test.t.7']});
 const tx={transactions:[
  transaction({transaction_id:'470.l.test.tr.2',timestamp:2,
   players_added:[{id:'C',name:'C',position:'RB'}],players_dropped:[{id:'B',name:'B',position:'RB'}]}),
  transaction({transaction_id:'470.l.test.tr.1',timestamp:1,
   players_added:[{id:'B',name:'B',position:'RB'}],players_dropped:[{id:'A',name:'A',position:'RB'}]})
 ]};
 ctx.DaVinciTransactions.init({rosters:roster,future,week:5,teamId:'7',transactions:tx,
  optimize:(players,w)=>({score:Math.max(0,...players.map(p=>future.players.find(f=>f.yahooId===p.id)?.weeks[0].points||0))})});
 ctx.DaVinciTransactions.update();
 const cards=element('transactionCards').innerHTML;
 assert.equal((cards.match(/class="txn-card"/g)||[]).length,2);
 assert.equal((cards.match(/\+10\.0 <small>pts\/wk<\/small>/g)||[]).length,2,
  'Both moves should each raise projected starter value by 10; older move uses B vs A.');
}
// Real data snapshots: every verified transaction remains visible in CSU and Nebraska.
require(path.join(base,'special-teams-model.js'));
const context=load('data/special-teams-context.json');
for(const league of [{folder:'data/',teamId:'7',count:53},{folder:'data/nebraska/',teamId:'6',count:11}]){
 const rosters=load(league.folder+'rosters.json');
 const available=load(league.folder+'available.json');
 const future=load(league.folder+'future.json');
 const weekly=load(league.folder+'weekly.json');
 const settings=load(league.folder+'league.json');
 const transactions=load(league.folder+'transactions.json');
 const d=globalThis.DaVinciSpecialTeams.enrich({
  context,league:settings,rosters,available,futureData:future,weekly
 });
 assert.ok(d.k>0&&d.def>0);
 const {ctx,element}=setup();
 vm.runInNewContext(src('roster-advice.js'),ctx);
 ctx.DaVinciAdvice.init({rosters,available,future,week:5,teamId:league.teamId});
 ctx.DaVinciTransactions.init({rosters,week:5,future,teamId:league.teamId,transactions,optimize:ctx.DaVinciAdvice.lineup});
 assert.equal(element('transactionCards').innerHTML,'','Ratings should be lazily evaluated');
 ctx.DaVinciTransactions.update();
 const html=element('transactionCards').innerHTML;
 assert.equal((html.match(/class="txn-card"/g)||[]).length,league.count,'All Yahoo moves must show, even if ungraded');
 assert.ok(!html.includes('undefined'),'Do not show undefined players or team names');
 if(league.folder==='data/'){
  assert.match(html,/Breece Hall/);
  assert.match(html,/Drake London/);
  assert.match(html,/Alec Pierce/);
 }
 console.log(league.folder+': '+league.count+' verified moves, '+element('txnStats').textContent);
}
console.log('Transaction grading, chained historical reconstruction, and honest missing-data behavior passed.');
