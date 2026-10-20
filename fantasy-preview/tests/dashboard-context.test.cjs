const assert=require('node:assert/strict');require('../dashboard-context.js');
const api=global.DaVinciDashboardContext,m={status:'in_progress',home:{id:'7',points:98.94,winProbability:0},away:{id:'3',points:135.66,winProbability:1}},week={week:6,matchups:[m]};
assert.equal(api.planningWeek(week,'7'),7);assert.equal(api.result(m,'7'),-1);
m.home.points=0;m.away.points=0;assert.equal(api.planningWeek(week,'7'),6,'Pregame probabilities must not advance the planning week');
m.home.points=20;m.home.winProbability=.6;m.away.winProbability=.4;assert.equal(api.planningWeek(week,'7'),6,'An ongoing competitive matchup retains current-week advice');
m.status='final';assert.equal(api.planningWeek(week,'7'),7);assert.equal(api.result(m,'7'),1);
assert.equal(api.planningWeek({...week,week:17},'7'),17);
