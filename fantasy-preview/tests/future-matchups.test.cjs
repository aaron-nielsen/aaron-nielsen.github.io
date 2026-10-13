'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const ctx={};vm.runInNewContext(fs.readFileSync(path.join(root,'matchup-overview.js'),'utf8'),ctx);
const positions=['QB','RB','RB','WR','WR','TE','TE','K','DEF'];
const players=positions.map((position,i)=>({id:String(i),name:'Player '+i,position,nflTeam:'NFL'}));
const data={week:6,rosters:{teams:[{id:'7',players}]},future:{players:players.map((p,i)=>({yahooId:p.id,weeks:[{week:6,points:i===7?0:10,opponent:i===7?null:'OPP',state:i===7?'bye':'scheduled',home:true}]}))},optimize:()=>({points:80,ids:players.map((p,i)=>({...p,slot:i,points:i===7?0:10}))})};
const forecast=ctx.DaVinciMatchup.projected(data,'7');assert.equal(forecast.rows.length,9);assert.equal(forecast.total,80);assert.equal(forecast.rows[7].label,'BYE');assert.equal(forecast.rows[6].slot,'W/R/T');
assert.equal(ctx.DaVinciMatchup.projected({...data,optimize:()=>null},'7').total,null,'An incomplete lineup cannot invent a team total');
for(const folder of ['data/','data/nebraska/']){
 const schedule=read(folder+'matchup-schedule.json'),rosters=read(folder+'rosters.json');const ids=new Set(rosters.teams.map(t=>String(t.id)));
 for(const round of schedule.weeks){const seen=new Set();for(const m of round.matchups)for(const side of [m.home,m.away]){assert.ok(ids.has(side.id));assert.ok(!seen.has(side.id),'One pairing per team per week');seen.add(side.id);}}
}
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');const recordCode=html.slice(html.indexOf('function getProjectedStandings()'),html.indexOf('function initOverview()'));
const target={innerHTML:''},remaining={innerHTML:''},remainingPoints={innerHTML:''},overallPoints={innerHTML:''},team=id=>({id,name:'Team '+id});
const games=[{home:team('7'),away:team('8')}];
const record={rosters:{teams:[{id:'7'},{id:'8'}]},week:{week:5,matchups:games},matchupSchedule:{weeks:[{week:6,matchups:games},{week:7,matchups:games},{week:8,matchups:games},{week:9,matchups:[]}]},TEAM_ID:'7',$:id=>({'#projectedRemaining':remaining,'#remainingPoints':remainingPoints,'#overallPoints':overallPoints}[id]||target),standing:()=>({wins:1,losses:3,ties:0}),currentTeamForecast:t=>({davinci:t.id==='7'?100:90}),modelTeamLineup:(id,w)=>({points:w===6?(id==='7'?80:90):w===7?(id==='7'?110:90):100})};
vm.runInNewContext(recordCode+'renderProjectedRecord();',record);assert.match(target.innerHTML,/3–4–1/,'Historical record plus two projected wins, one loss and a tie');assert.match(target.title,/Weeks 5–8/,'Unscheduled playoff games are excluded');
record.modelTeamLineup=()=>null;vm.runInNewContext(recordCode+'renderProjectedRecord();',record);assert.match(target.innerHTML,/Projected record/);assert.match(remaining.innerHTML,/3 games pending/);assert.match(target.title,/3 unprojected/,'Missing lineup forecasts remain unknown');
console.log('Future pairing, optimized lineup, bye, projected record and missing-data checks passed.');

assert.match(remaining.innerHTML,/Remaining record/);
assert.doesNotMatch(html,/id="waiverRank"/);

assert.doesNotMatch(html,/id="selectedTeam"/);
const boardCode=html.slice(html.indexOf('function renderLeagueMatchups('),html.indexOf('function initOverview()'));
const board={innerHTML:''};
const boardContext={week:{week:5,matchups:games},TEAM_ID:'7',matchupSchedule:{weeks:[{week:6,matchups:[{home:team('7'),away:team('9')}]}]},$:()=>board,esc:String,scoreLabel:x=>x==null?'—':String(x),currentTeamForecast:()=>({davinci:100,yahoo:90}),modelTeamLineup:id=>id==='7'?{points:110}:null};
vm.runInNewContext(boardCode+'renderLeagueMatchups(6);',boardContext);
assert.match(board.innerHTML,/Team 9/,'Future league round uses its own opponents');assert.doesNotMatch(board.innerHTML,/Team 8|Yahoo/,'Future rounds do not reuse current opponents or Yahoo projections');assert.match(board.innerHTML,/—/,'Missing future forecasts stay unknown');
vm.runInNewContext(boardCode+'renderLeagueMatchups(5);',boardContext);assert.match(board.innerHTML,/Yahoo/);assert.match(board.innerHTML,/Team 8/);
