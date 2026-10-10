'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const base=path.resolve(__dirname,'..');
for(const [file,weeks] of [['data/historical-lineups-team7.json',4],
 ['data/nebraska/historical-lineups-team6.json',1]]){
 const data=JSON.parse(fs.readFileSync(path.join(base,file),'utf8'));
 assert.equal(data.season,2026);
 assert.equal(data.weeks.length,weeks);
 for(const w of data.weeks){
  assert.ok(w.players.length>0,'No verified historical roster for week '+w.week);
  assert.ok(w.players.every(p=>p.playerId&&p.name&&p.slot),'Incomplete Yahoo roster row');
  assert.ok(w.players.some(p=>Number.isFinite(p.actual)),'Missing actual points');
  assert.ok(w.players.every(p=>p.actual===null||Number.isFinite(p.actual)));
 }
}
console.log('Verified historical Yahoo roster snapshot fixtures passed');
