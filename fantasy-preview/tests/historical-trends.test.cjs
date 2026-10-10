'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const base=path.resolve(__dirname,'..'),model=require('../historical-trends.js');
const make=(id,position,actual,slot='BN')=>({playerId:String(id),position,actual,slot});
const players=[
 make(1,'QB',20,'QB'),make(2,'RB',10,'RB'),make(3,'RB',8,'RB'),
 make(4,'WR',9,'WR'),make(5,'WR',7,'WR'),make(6,'TE',6,'TE'),
 make(7,'K',5,'K'),make(8,'DEF',4,'DEF'),make(9,'RB',3,'W/R/T'),
 make(10,'RB',14,'BN')
];
const best=model.optimal(players);
assert.equal(best.players.length,9);
assert.equal(best.points,83);
const result=model.analyze([{week:1,teams:[{teamId:'7',teamName:'Example',players}]}]);
assert.equal(result.length,1);
assert.equal(result[0].actualPoints,72);
assert.equal(result[0].missedPoints,11);
assert.equal(result[0].evaluatedWeeks,1);
assert.equal(model.optimal(players.filter(p=>p.position!=='DEF')),null);
for(const week of [1,2,3,4]){
 const j=JSON.parse(fs.readFileSync(path.join(base,'data/historical/csu-week-'+week+'.json'),'utf8'));
 assert.equal(j.teams.length,14);
 assert.equal(j.coverage.teamsWithPlayers,14);
 assert.ok(model.analyze([j]).length===14);
}
const neb=JSON.parse(fs.readFileSync(path.join(base,'data/historical/nebraska-week-4.json'),'utf8'));
assert.equal(neb.teams.length,10);
assert.equal(neb.coverage.teamsWithPlayers,10);
assert.equal(model.analyze([neb]).length,10);
console.log('Historical lineup actual-points, best lineup, CSU and Nebraska coverage checks passed');
