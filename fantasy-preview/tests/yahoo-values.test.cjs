'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
require('../yahoo-values.js');
const read=n=>JSON.parse(fs.readFileSync(path.join(__dirname,'../data',n+'.json'),'utf8'));
const data=read('yahoo-projections'),rosters=read('rosters'),model=global.YahooValues.create(data);
const mine=rosters.teams.find(t=>t.id==='7').players;
const historical=read('historical/yahoo-calibration-2026-10-12'),historicalModel=global.YahooValues.create(historical);
const calibrationRosters=read('historical/yahoo-calibration-rosters-2026-10-12');
const calibrationMine=calibrationRosters.teams.find(t=>t.id==='7').players;
for(const e of read('yahoo-trade-evaluations').evaluations.filter(e=>e.reportedAt==='2026-10-12')){
 const partner=calibrationRosters.teams.find(t=>t.id===e.partnerId).players;
 const actual=historicalModel.trade(calibrationMine,partner,calibrationMine.filter(p=>e.send.includes(p.id)),partner.filter(p=>e.receive.includes(p.id)),historical.weeks);
 assert.equal(actual.gainYou,e.gainYou);assert.equal(actual.gainThem,e.gainThem);
 for(const [i,w] of e.weeklyImpacts.entries()){assert.equal(actual.weeklyYou[i].impact,w.you);assert.equal(actual.weeklyThem[i].impact,w.them);}
}
assert.equal(model.score(mine.concat({id:'missing',position:'RB'}),6),null,'Missing data must never become zero or a custom projection');
assert.equal(model.score([{id:'40168'}],6),null,'Missing position metadata must never silently remove a player from the lineup');
for(const p of data.players){const owner=rosters.teams.flatMap(t=>t.players).find(q=>String(q.id)===String(p.yahooId));if(owner)assert.equal(p.position,owner.position,'Imported positions must match the verified roster');}
const matrix=read('yahoo-team-player-values');
const covered=rosters.teams.filter(t=>data.weeks.every(w=>model.score(t.players,w)!==null));
const completePlayers=data.players.filter(p=>data.weeks.every(w=>p.weeks.some(g=>g.week===w&&Number.isFinite(g.points))));
assert.equal(matrix.coverage.knownCells,matrix.teams.reduce((n,t)=>n+t.impacts.filter(p=>p.impact!==null).length,0));assert.equal(matrix.coverage.completeTeams,covered.length);
for(const t of matrix.teams)assert.equal(t.impacts.length,data.players.length);
for(const t of matrix.teams)for(const p of t.impacts){
 assert.equal(p.impact,p.owned?p.lossIfRemoved:p.gainIfAdded);
 assert.equal(p.owned?p.gainIfAdded:p.lossIfRemoved,null,'Only the applicable acquisition/removal direction has a value');
 if(p.impact!==null)assert.equal(Math.round(p.weekly.reduce((n,w)=>n+w.value,0)*100)/100,p.impact);
}
const fixture={players:[['a',20],['b',18],['c',17],['d',25],['e',26]].map(([yahooId,points])=>({yahooId,position:'QB',weeks:[{week:6,points}]}))};
const f=global.YahooValues.create(fixture),q=id=>({id,position:'QB'}),team=[q('a'),q('b'),q('c')];
assert.equal(f.marginal(team,q('a'),[6]).lossIfRemoved,2,'Losing a starter accounts for the next bench player');
assert.equal(f.marginal(team,q('b'),[6]).lossIfRemoved,0,'A redundant bench player can cost nothing to lose');
assert.equal(f.marginal(team,q('d'),[6]).gainIfAdded,5,'Acquisition value measures displacement of the current starter');
assert.equal(f.marginal([q('c')],q('d'),[6]).gainIfAdded,8,'The same acquisition has a different value for a weaker roster');
assert.equal(f.delta(team,team.concat(q('d'),q('e')),[6]).impact,6,'Package impact is not the sum of overlapping individual acquisition gains');
assert.equal(f.marginal(team,q('missing'),[6]).gainIfAdded,null,'Missing projections cannot produce a gain');
const unknownDefense={id:'unknown-defense',position:'DEF'};
assert.equal(f.score(team.concat(unknownDefense),6),null,'An unknown defense keeps the team total unknown');
assert.equal(f.marginal(team.concat(unknownDefense),q('d'),[6]).gainIfAdded,5,'An unchanged unknown defense cancels from a QB-only trade');
assert.equal(f.marginal(team.concat(unknownDefense),unknownDefense,[6]).lossIfRemoved,null,'An unknown forecast still blocks a trade affecting its own position');
const flex=global.YahooValues.create({players:[{yahooId:'rb',position:'RB',weeks:[{week:6,points:10}]}]});
assert.equal(flex.marginal([{id:'unknown-wr',position:'WR'}],{id:'rb',position:'RB'},[6]).gainIfAdded,null,'RB and WR share FLEX, so missing WR projections cannot cancel from an RB acquisition');
// A player's marginal contribution depends on the receiving roster.
const same=data.players.find(p=>p.yahooId==='32705');
assert.notEqual(model.delta(mine,mine.concat({...same,id:same.yahooId}),data.weeks).impact,model.delta([], [{...same,id:same.yahooId}],data.weeks).impact);
console.log('Yahoo historical calibration and current coverage passed');
