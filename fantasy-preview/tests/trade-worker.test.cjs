'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const base=path.resolve(__dirname,'..');
const pos=['QB','RB','RB','WR','WR','TE','WR','K','DEF','WR'];
const yours=pos.map((position,i)=>({id:'a'+i,name:'Mine '+i,position,slot:i===9?'BN':position}));
const theirs=pos.map((position,i)=>({id:'b'+i,name:'Theirs '+i,position:i===9?'RB':position,slot:i===9?'BN':position}));
const scoresA=[12,9,9,32,30,10,29,8,7,26],scoresB=[13,16,15,15,8,10,6,7,6,16];
const rosters={teams:[{id:'a',name:'Mine',players:yours},{id:'b',name:'Theirs',players:theirs}]};
const future={startWeek:5,endWeek:7,players:[...yours,...theirs].map((p,i)=>({yahooId:p.id,position:p.position,weeks:[5,6,7].map(week=>({week,points:i<10?scoresA[i]:scoresB[i-10],state:'assuming_active'}))}))};
const settings={rosters,future,available:{players:[]},week:5,teamId:'a',leagueKey:'csu'};
const messages=[],context=vm.createContext({});context.self=context;
context.importScripts=(...files)=>files.forEach(file=>vm.runInContext(fs.readFileSync(path.join(base,file.split('?')[0]),'utf8'),context));
context.postMessage=result=>messages.push(structuredClone(result));
vm.runInContext(fs.readFileSync(path.join(base,'trade-search-worker.js'),'utf8'),context);
context.onmessage({data:{settings:structuredClone(settings),filters:{tradeFromWeek:'6',tradePartner:'b',tradePosition:'all',tradePackageFilter:'one_each',tradeGoal:'model'},selection:{send:['a9'],receive:['b9']}}});
assert.equal(messages.length,1);assert.equal(messages[0].error,undefined);
const offer=messages[0].options.find(t=>t.send.players.some(p=>p.id==='a9')&&t.receive.players.some(p=>p.id==='b9'));
assert.ok(offer,'The worker computes the requested mutually beneficial swap without a DOM');
assert.equal(offer.gainYou,14);assert.equal(offer.gainThem,20);
context.onmessage({data:{settings:structuredClone(settings),filters:{tradeFromWeek:'6',tradePartner:'b',tradePosition:'all',tradePackageFilter:'one_each',tradeGoal:'arbitrage'},selection:{send:['a9'],receive:['b9']}}});
assert.equal(messages[1].options.length,0,'Missing Yahoo forecasts cannot become model-based arbitrage');
console.log('Background trade search preserves full-lineup scoring and Yahoo coverage requirements.');

// Superseded and cancelled searches must never replace current results.
const elements=new Map(),workers=[];
function element(id){if(!elements.has(id))elements.set(id,{value:({tradeFromWeek:'6',tradePartner:'b',tradePosition:'all',tradePackageFilter:'one_each',tradeGoal:'model'})[id]||'',innerHTML:'',textContent:'',listeners:{},addEventListener(event,fn){this.listeners[event]=fn;},setAttribute(k,v){this[k]=v;}});return elements.get(id);}
class FakeWorker{constructor(){workers.push(this);}postMessage(data){this.data=structuredClone(data);}terminate(){this.terminated=true;}}
const ui=vm.createContext({document:{getElementById:element},Worker:FakeWorker});
for(const file of ['roster-advice.js','yahoo-values.js','trade-preferences.js'])vm.runInContext(fs.readFileSync(path.join(base,file),'utf8'),ui);
ui.DaVinciAdvice.init(settings);ui.DaVinciPersonalTrades.init({...settings,deferSearch:true,optimize:ui.DaVinciAdvice.lineup});
assert.equal(workers.length,0,'Dashboard startup does not launch hidden trade searches');
ui.DaVinciPersonalTrades.render();ui.DaVinciPersonalTrades.render();
assert.equal(workers.length,2);assert.equal(workers[0].terminated,true);
workers[0].onmessage({data:messages[0]});assert.match(element('tradeResults').innerHTML,/Comparing/);
workers[1].onmessage({data:messages[0]});assert.match(element('tradeResults').innerHTML,/Mine 9/);assert.equal(element('tradeResults')['aria-busy'],'false');
ui.DaVinciPersonalTrades.render();assert.equal(workers.length,2,'Repeated filters reuse the completed result');
element('tradePartner').value='all';ui.DaVinciPersonalTrades.render();element('cancelTradeSearch').listeners.click();
assert.equal(workers[2].terminated,true);workers[2].onmessage({data:messages[0]});assert.match(element('tradeResults').innerHTML,/Search cancelled/);
console.log('Cancellation, stale-result protection and repeated-search caching passed.');
