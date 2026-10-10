'use strict';
const assert=require('node:assert/strict');
const {evaluate,summarize}=require('../forecast-accuracy.js');
const row=(id,position,actual,daVinci,yahoo)=>({
 season:2026,week:5,playerId:id,position,actual,daVinci,yahoo,
 predictedAt:'2026-10-09T15:00:00Z',kickoffAt:'2026-10-11T17:00:00Z'
});
const records=[
 row('a','RB',10,12,15),
 row('b','RB',20,16,18),
 row('c','WR',8,10,null),
 {...row('d','WR',10,10,10),predictedAt:'2026-10-12T00:00:00Z'},
 row('a','RB',10,99,99),
 {...row('e','WR',5,7,7),actual:null}
];
const result=evaluate(records);
assert.equal(result.n,3);
assert.deepEqual(result.excluded,{invalid:1,notPregame:1,duplicate:1});
assert.equal(result.byPosition.all.daVinci.n,3);
assert.equal(result.byPosition.all.daVinci.mae,8/3);
assert.equal(result.byPosition.all.daVinci.bias,0);
assert.equal(result.byPosition.all.yahoo.n,2);
assert.equal(result.byPosition.all.paired.n,2);
assert.equal(result.byPosition.all.wins,1);
assert.equal(result.byPosition.all.ties,0);
assert.equal(result.byPosition.all.winRate,0.5);
assert.equal(result.byPosition.all.paired.daVinci.mae,3);
assert.equal(result.byPosition.all.paired.yahoo.mae,3.5);
assert.equal(result.byPosition.RB.daVinci.rmse,Math.sqrt(10));
assert.equal(result.byPosition.WR.yahoo.n,0);
assert.equal(summarize([],'daVinci').mae,null);
console.log('Forecast accuracy checks passed: pregame cutoff, duplicates, missing actuals, position metrics and fair paired Yahoo comparison.');
