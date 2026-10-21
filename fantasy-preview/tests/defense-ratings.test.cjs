'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const {ratings}=require('../scripts/refresh-defense.cjs');
const teams=[],players=[];
for(let week=1;week<=4;week++)for(const [team,opponent] of [['A','B'],['B','A'],['C','D'],['D','C']]){
 const attempts=10,game_id=week+'/'+[team,opponent].sort().join(''),passing_yards=opponent==='B'?400:opponent==='D'?100:250;
 teams.push({season_type:'REG',week,team,opponent_team:opponent,game_id,attempts,carries:0,receiving_yards:0});
 players.push({season_type:'REG',week,team,opponent_team:opponent,game_id,position:'QB',attempts,carries:0,receiving_yards:0,passing_yards});
}
const output=ratings(players,teams,{4:.04},4);
assert.ok(output.find(t=>t.team==='B').positions.QB.factor>1);
assert.ok(output.find(t=>t.team==='D').positions.QB.factor<1);
for(const pos of ['QB','RB','WR','TE']){
 const factors=output.map(t=>t.positions[pos].factor);
 assert.ok(factors.every(f=>f>=.9&&f<=1.1));
 assert.ok(Math.abs(factors.reduce((s,f)=>s+f,0)/factors.length-1)<.0001,'Matchups cannot inflate the league baseline');
}
assert.throws(()=>ratings(players.slice(1),teams,{4:.04},4),/Incomplete player\/team stats/);
const report=JSON.parse(fs.readFileSync(__dirname+'/../data/defense-ratings.json'));
assert.equal(report.teams.length,32);assert.equal(report.throughWeek,JSON.parse(fs.readFileSync(__dirname+'/../data/week.json')).week-1);
const special=require('../special-teams-model.js');
// Model must discard target-week and later team stats for a stale league view.
const source=fs.readFileSync(__dirname+'/../special-teams-model.js','utf8');assert.match(source,/Number\(g\[1\]\)<targetWeek/);
console.log('Position matchup direction, neutral league baseline, caps, complete coverage and future-data exclusion passed');
