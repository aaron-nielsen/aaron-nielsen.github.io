const assert=require('node:assert/strict');require('../trade-needs.js');
const teams=[{id:'a',players:[{id:'r1',position:'RB'},{id:'r2',position:'RB'},{id:'w1',position:'WR'},{id:'w2',position:'WR'}]},{id:'b',players:[{id:'r3',position:'RB'},{id:'r4',position:'RB'},{id:'w3',position:'WR'},{id:'w4',position:'WR'}]}];
const values={r1:20,r2:20,r3:5,r4:5,w1:5,w2:5,w3:20,w4:20};const settings={teamId:'a',week:8,rosters:{teams},future:{endWeek:17,players:Object.entries(values).map(([yahooId,points])=>({yahooId,weeks:[8,9,10,11].map(week=>({week,points}))}))}};
let r=DaVinciTradeNeeds.assess(settings);assert.deepEqual(r.teams[0].offer,['RB']);assert.deepEqual(r.teams[0].target,['WR']);
settings.future.players.find(p=>p.yahooId==='r3').weeks[0].points=null;r=DaVinciTradeNeeds.assess(settings);assert.equal(r.teams[0].edges.RB,null);assert.deepEqual(r.teams[0].offer,[]);
console.log('Complementary positions and missing-projection handling passed');
