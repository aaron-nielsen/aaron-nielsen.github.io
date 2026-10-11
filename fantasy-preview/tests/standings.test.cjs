const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(__dirname+'/../index.html','utf8');
const code=html.slice(html.indexOf('function renderStandings()'),html.indexOf('function renderLeagueMatchups('));
const nodes={'#standingsView':{value:'current'},'#standingsRows':{},'#standingsLegend':{}};
const ctx={$:id=>nodes[id],leagueSettings:{playoffTeams:1},TEAM_ID:'2',esc:String,rosters:{teams:[{id:'1',name:'Current leader'},{id:'2',name:'Future leader'}]},standing:id=>({rank:id,wins:id==='1'?3:1,losses:1,ties:0,pointsFor:100}),getProjectedStandings:()=>[{id:'1',complete:true,pointsComplete:true,overallWins:4,overallLosses:10,overallTies:0,overallPoints:100},{id:'2',complete:true,pointsComplete:true,overallWins:10,overallLosses:4,overallTies:0,overallPoints:200}]};
vm.runInNewContext(code+'renderStandings();',ctx);assert.match(nodes['#standingsRows'].innerHTML,/playoff-position [^"]*"><td>1<\/td><td>Current leader/);
nodes['#standingsView'].value='projected';vm.runInNewContext('renderStandings();',ctx);assert.match(nodes['#standingsRows'].innerHTML,/playoff-position your-team"><td>1<\/td><td>Future leader/);assert.match(nodes['#standingsRows'].innerHTML,/10–4/);
ctx.leagueSettings={};vm.runInNewContext('renderStandings();',ctx);assert.doesNotMatch(nodes['#standingsRows'].innerHTML,/playoff-position/);assert.match(nodes['#standingsLegend'].textContent,/unavailable/);
