'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync(__dirname+'/../index.html','utf8');
const code=html.slice(html.indexOf('function getProjectedStandings()'),html.indexOf('function renderProjectedRecord()'));
const pair={home:{id:'7'},away:{id:'12'}};
const ctx={rosters:{teams:[{id:'7'},{id:'12'}]},week:{week:5,matchups:[pair]},matchupSchedule:{weeks:[{week:6,matchups:[pair]}]},standing:()=>({wins:0,losses:4,ties:0,pointsFor:300}),currentTeamForecast:t=>({davinci:t.id==='7'?100:null}),modelTeamLineup:id=>({points:id==='7'?110:90})};
vm.runInNewContext(code+'result=getProjectedStandings();',ctx);
const mine=ctx.result.find(t=>t.id==='7');
assert.equal(mine.missing,1);assert.equal(mine.complete,false);
assert.equal(mine.points,210,'Opponent uncertainty must not discard known own points');
assert.equal(mine.pointsComplete,true);assert.equal(mine.overallPoints,510);
const other=ctx.result.find(t=>t.id==='12');assert.equal(other.pointsComplete,false);
assert.doesNotMatch(html,/<summary>Compare starters<\/summary>/);assert.match(html,/<div class="matchup-lineup-details"><div id="matchupLineups"/);assert.match(html,/overview-disclosure/);
console.log('Overview points remain available when an opponent forecast is missing');

ctx.week.week=6;ctx.currentTeamForecast=t=>({davinci:t.id==='7'?100:90});ctx.matchupSchedule.weeks=[{week:5,matchups:[pair]},{week:6,matchups:[pair]},{week:7,matchups:[pair]}];
vm.runInNewContext(code+'result=getProjectedStandings();',ctx);
assert.equal(ctx.result.find(t=>t.id==='7').points,210,'Completed and duplicate current rounds must not count in remaining projections');
assert.equal(ctx.result.find(t=>t.id==='7').wins,2);
