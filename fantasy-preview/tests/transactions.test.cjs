'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const BASE=path.resolve(__dirname,'..');
const read=p=>JSON.parse(fs.readFileSync(path.join(BASE,p),'utf8'));
const js=p=>fs.readFileSync(path.join(BASE,p),'utf8');
require(path.join(BASE,'special-teams-model.js'));
const special=read('data/special-teams-context.json');
const markup=js('index.html');
assert.ok(markup.includes('data-page="transactions"'),'Missing Transactions nav');
assert.ok(markup.includes('id="transactionCards"'),'Missing transaction cards');
assert.ok(markup.includes('transaction-grades.js'),'Transaction model script not loaded');
for(const {dir,id,label,minimum} of [
 {dir:'data/',id:'7',label:'CSU Stats',minimum:50},
 {dir:'data/nebraska/',id:'6',label:'Nebraska',minimum:10}
]){
 const rosters=read(dir+'rosters.json'),available=read(dir+'available.json'),
  future=read(dir+'future.json'),weekly=read(dir+'weekly.json'),
  league=read(dir+'league.json'),transactions=read(dir+'transactions.json');
 assert.ok(transactions.transactions.length>=minimum);
 const els=new Map();
 const node=id=>{
  if(!els.has(id))els.set(id,{value:id==='waiverHorizon'?'next_week':id==='lineupWeek'?'5':id==='txnSort'?'recent':id==='txnType'?'all':'all',
    innerHTML:'',textContent:'',options:[],addEventListener(event,cb){this['on'+event]=cb;},setAttribute(){}});
  return els.get(id);
 };
 const context={document:{getElementById:node}};
 vm.runInNewContext(js('availability-sanity.js'),context);
 vm.runInNewContext(js('return-outlook.js'),context);
 vm.runInNewContext(js('playing-time-model.js'),context);
 vm.runInNewContext(js('roster-advice.js'),context);
 vm.runInNewContext(js('transaction-grades.js'),context);
 context.DaVinciEligibility.reconcile({available,futureData:future,weekly});
 context.DaVinciReturns.apply({futureData:future,weekly});
 context.DaVinciPlayingTime.apply({futureData:future,weekly});
 const roles=globalThis.DaVinciSpecialTeams.enrich({context:special,league,rosters,available,futureData:future,weekly});
 assert.ok(roles.k&&roles.def);
 context.DaVinciAdvice.init({rosters,available,week:5,future,teamId:id});
 const t0=Date.now();
 context.DaVinciTransactions.init({rosters,future,week:5,teamId:id,transactions,optimize:context.DaVinciAdvice.lineup});
 context.DaVinciTransactions.update();
 const elapsed=Date.now()-t0;
 const html=node('transactionCards').innerHTML;
 assert.equal((html.match(/class="txn-card"/g)||[]).length,transactions.transactions.length);
 assert.match(html,/Actual impact not measured/);
 assert.ok(html.includes('ROS pts')||html.includes('Not rateable'),'Must show forecast impact or explicit unavailable');
 assert.ok(node('txnCoverage').textContent.includes('current model/rosters'),'Not claiming at-time projections');
 assert.ok(elapsed<20000,label+' transaction calculations too slow: '+elapsed+'ms');
 if(label==='CSU Stats')assert.ok(html.includes('Breece Hall')&&html.includes('Drake London'),'Missing completed trade');
 node('txnTeam').value=id;node('txnTeam').onchange();
 assert.ok(!node('transactionCards').innerHTML.includes('No transactions match'),'My team filter should show transactions');
 node('txnTeam').value='all';node('txnTeam').onchange();
 node('txnType').value='trade';node('txnType').onchange();
 if(label==='CSU Stats')assert.equal((node('transactionCards').innerHTML.match(/class="txn-card"/g)||[]).length,1);
 else assert.match(node('transactionCards').innerHTML,/No transactions match/);
 node('txnType').value='all';node('txnType').onchange();
 node('txnSort').value='best';node('txnSort').onchange();
 assert.match(node('transactionCards').innerHTML,/txn-card/);
 console.log(label+': '+transactions.transactions.length+' completed moves, '+node('txnStats').textContent+', impact grader '+elapsed+' ms');
}
console.log('Transaction coverage, attribution, trade sides, labeling and filters passed.');
