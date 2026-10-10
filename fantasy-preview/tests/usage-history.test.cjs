'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const base=path.resolve(__dirname,'..'),read=p=>JSON.parse(fs.readFileSync(path.join(base,p),'utf8'));
const sandbox={};vm.runInNewContext(fs.readFileSync(path.join(base,'playing-time-model.js'),'utf8'),sandbox);
const history=read('data/usage-history.json');
assert.ok(history.players.length>=10,'Missing historical weekly snap data');
const lloydHistory=history.players.find(p=>p.name==='MarShawn Lloyd');
const robinsonHistory=history.players.find(p=>p.name==='Brian Robinson');
assert.equal(lloydHistory.games.length,4);
assert.equal(robinsonHistory.games.length,4);
const snapTrend=sandbox.DaVinciPlayingTime.trend(lloydHistory,'RB');
assert.ok(snapTrend.multiplier>1,'Lloyd Week 4 usage should increase near-term role');
assert.ok(snapTrend.multiplier<1.25,'Shrink week-level usage changes');
for(const folder of ['data/','data/nebraska/']){
 const futureData=read(folder+'future.json'),weekly=read(folder+'weekly.json');
 const before=x=>futureData.players.find(p=>p.name===x).weeks.map(g=>({week:g.week,points:g.points}));
 const originalBrooks=before('Chris Brooks'),originalBrian=before('Brian Robinson');
 const result=sandbox.DaVinciPlayingTime.apply({futureData,weekly,history});
 assert.ok(result.historical>10,'Should adjust multiple players from verified snap logs');
 assert.ok(result.newsApplied>=3,'GB injury redistribution should be included');
 const lloyd=futureData.players.find(p=>p.name==='MarShawn Lloyd').weeks.find(g=>g.week===5);
 const brooks=futureData.players.find(p=>p.name==='Chris Brooks').weeks.find(g=>g.week===5);
 const robinson=futureData.players.find(p=>p.name==='Brian Robinson').weeks.find(g=>g.week===5);
 assert.ok(lloyd.points>robinson.points,'Verified snap/news usage should support Lloyd over Brian Robinson Week 5');
 assert.ok(lloyd.projectedStats.carries>8,'Lloyd carry volume must respond to Brooks absence');
 assert.equal(brooks.points,0,'Confirmed-out Brooks should have zero projection');
 assert.ok(robinson.projectedStats.carries>0,'Other players receive independent usage trends');
 const brooksWeek6=futureData.players.find(p=>p.name==='Chris Brooks').weeks.find(g=>g.week===6);
 assert.ok(brooksWeek6.points>0&&brooksWeek6.playingTime.label==='Recent snap and opportunity history',
  'Week 6 may use normal playing-time trends, but not the Week 5 Brooks injury override');
 assert.ok(futureData.players.find(p=>p.name==='Brian Robinson').weeks.find(g=>g.week===17).playingTime.adjustment<=1.02,
  'Recent-week trend should decay into long-range baseline');
 console.log(folder+' recency-weighted workload model adjusted '+result.historical+' player-weeks, Lloyd Week 5='+lloyd.points+', Brian='+robinson.points);
}
function robustEquals(a,b){return Math.abs(a-b)<.001}
