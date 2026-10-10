'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
for(const [league,minPlayers] of [['csu',300],['nebraska',300]]){
 const file=path.join(root,'forecast-archive',league,'2026-w05-2026-10-10.json');
 const data=JSON.parse(fs.readFileSync(file,'utf8'));
 assert.equal(data.season,2026);
 assert.equal(data.week,5);
 assert.ok(Date.parse(data.generatedAt)>=Date.parse(data.sourceGeneratedAt));
 assert.ok(data.records.length>=minPlayers);
 assert.match(data.projectionBasis,/raw future.json/);
 const ids=new Set();
 for(const r of data.records){
  assert.equal(r.week,5);
  assert.ok(r.playerId);
  assert.ok(['QB','RB','WR','TE','K','DEF'].includes(r.position));
  assert.ok(Number.isFinite(r.daVinci));
  assert.equal(r.actual,null);
  assert.equal(r.yahoo,null);
  assert.equal(r.kickoffAt,null);
  assert.ok(r.gameDate>='2026-10-10');
  assert.ok(Date.parse(r.predictedAt)<=Date.parse(data.generatedAt));
  assert.ok(!ids.has(r.playerId),'Duplicate player in frozen archive');
  ids.add(r.playerId);
 }
}
const nebraska=JSON.parse(fs.readFileSync(path.join(root,'data/historical/nebraska-week-4.json'),'utf8'));
assert.equal(nebraska.coverage.leagueStartWeek,5);
assert.equal(nebraska.coverage.officialMatchup,false);
assert.equal(nebraska.coverage.teamsWithPlayers,10);
console.log('Both frozen Week 5 archives and Nebraska pre-league coverage verified');
