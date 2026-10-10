'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const base=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(base,'index.html'),'utf8');
const names=['id="myLineup"','id="lineupWeek"','id="lineupRecommendations"','id="waiverRecommendations"','id="offenseOutlook"','id="leagueBoard"'];
for(const token of names)assert.equal(html.split(token).length-1,1,'Duplicated/missing '+token);
assert.ok(html.indexOf('id="myLineup"')<html.indexOf('id="lineupRecommendations"'),'Full roster must appear before roster advice');
assert.ok(html.indexOf('id="myLineup"')<html.indexOf('id="offenseOutlook"'),'Bench must be visible above future forecasts');
assert.ok(html.includes('overview-roster.js'),'Module loaded from the homepage');
for(const match of html.matchAll(/<script(?:\\s+[^>]*?)?>([\\s\\S]*?)<\\/script>/g)){
 if(match[1].trim())new Function(match[1]);
}
const script=fs.readFileSync(path.join(base,'overview-roster.js'),'utf8');
const root={innerHTML:''};
const context={document:{getElementById(id){return id==='myLineup'?root:null;}}};
vm.runInNewContext(script,context,{filename:'overview-roster.js'});
const read=p=>JSON.parse(fs.readFileSync(path.join(base,p),'utf8'));
const slots=['QB','RB','RB','WR','WR','TE','W/R/T','K','DEF'];
for(const entry of [{folder:'data/',id:'7',label:'CSU Stats'},{folder:'data/nebraska/',id:'6',label:'Nebraska'}]){
 const rosters=read(entry.folder+'rosters.json'),weekly=read(entry.folder+'weekly.json'),future=read(entry.folder+'future.json');
 const team=rosters.teams.find(t=>String(t.id)===entry.id);
 assert.ok(team);
 const roster=team.players,bench=roster.filter(p=>p.slot==='BN'),IR=roster.filter(p=>p.slot==='IR');
 const starters=roster.filter(p=>p.slot!=='BN'&&p.slot!=='IR');
 const pending=starters.slice(),ids=[];
 for(let slot=0;slot<slots.length;slot++){
  const i=pending.findIndex(p=>p.slot===slots[slot]);
  if(i>=0)ids.push({id:pending.splice(i,1)[0].id,slot});
 }
 assert.equal(ids.length,9,entry.label+' expected 9 starter slots');
 const switchPlayer=bench.find(p=>['WR','RB','TE'].includes(p.position));
 const target=ids.find(x=>slots[x.slot]===switchPlayer?.position);
 const newIds=ids.map(x=>x===target?{...x,id:switchPlayer.id}:x);
 const optimizer=()=>({ids:newIds});
 context.DaVinciRosterOverview.init({rosters,weekly,future,teamId:entry.id,snapshotWeek:5,optimize:optimizer});
 const current=root.innerHTML;
 assert.match(current,/Starters/);assert.match(current,/Bench/);assert.match(current,/Injured reserve/);
 assert.match(current,/Yahoo lineup/);
 for(const p of bench)assert.ok(current.includes(p.name.replaceAll('&','&amp;')),entry.label+' hides benched '+p.name);
 for(const p of IR)assert.ok(current.includes(p.name.replaceAll('&','&amp;')),entry.label+' hides IR '+p.name);
 assert.ok(!current.includes('No eligible backup'),'No empty backup placeholders');
 assert.equal((current.match(/class="roster-board-row/g)||[]).length,roster.length,entry.label+' should render every Yahoo roster player once');
 context.DaVinciRosterOverview.render(6);
 const upcoming=root.innerHTML;
 assert.match(upcoming,/Optimized lineup/);
 assert.ok(upcoming.includes(switchPlayer.name.replaceAll('&','&amp;')),entry.label+' future optimized starter visible');
 assert.equal((upcoming.match(/class="roster-board-row/g)||[]).length,roster.length,entry.label+' week selector lost a player');
 console.log(entry.label+': '+starters.length+' starters, '+bench.length+' bench, '+IR.length+' IR, future-week selection correct');
}
console.log('Homepage structural markup and inline JavaScript syntax verified');
