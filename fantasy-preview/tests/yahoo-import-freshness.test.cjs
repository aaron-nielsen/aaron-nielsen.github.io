'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
require('../yahoo-values.js');
const source=fs.readFileSync(path.join(__dirname,'../scripts/collect-yahoo-values.cjs'),'utf8');
const player={id:'q',name:'Moved quarterback',position:'QB'};
const frame=(date,points,week=8)=>({week,collectedAt:date,players:[{...player,points,state:'projected'}]});
const stale=frame('2026-10-13T00:00:00Z',10),fresh=frame('2026-10-28T00:00:00Z',20);
for(const rows of [[stale,fresh],[fresh,stale]]){
 const input={
  'yahoo-weekly-rosters':{weeks:[8],collectedAt:stale.collectedAt,updatedAt:fresh.collectedAt,coverage:{},teams:{'1':[rows[0]],'2':[rows[1],frame(stale.collectedAt,99,7)]}},
  rosters:{leagueId:'test',teams:[{id:'1',name:'Old owner',players:[]},{id:'2',name:'New owner',players:[player]}]},
  'yahoo-projections':{players:[]}
 };
 const output=new Map();
 const fakeFs={readFileSync:p=>JSON.stringify(input[path.basename(p,'.json')]),writeFileSync:(p,text)=>output.set(path.basename(p),text)};
 vm.runInNewContext(source,{
  __dirname:path.join(__dirname,'../scripts'),global:{YahooValues:global.YahooValues},console:{log(){}},
  require:p=>['fs','node:fs'].includes(p)?fakeFs:['path','node:path'].includes(p)?path:p.endsWith('yahoo-values.js')?{}:p==='./render-yahoo-matrix.cjs'?{render:()=>''}:(()=>{throw Error(p)})()
 });
 const result=JSON.parse(output.get('yahoo-projections.json'));
 assert.equal(result.players[0].weeks.length,1,'Completed weeks do not pollute remaining-season freshness');
 assert.equal(result.players[0].weeks[0].points,20,'Newest projection wins regardless of the owner iteration order');
 assert.equal(result.players[0].collectedAt,fresh.collectedAt);
 assert.equal(result.freshness.oldest,fresh.collectedAt);
}
console.log('Yahoo imports prefer fresh projections after roster changes.');
