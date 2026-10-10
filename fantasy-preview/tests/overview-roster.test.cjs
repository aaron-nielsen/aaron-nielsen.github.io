'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const base=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(base,'index.html'),'utf8');
const names=['id="myLineup"','id="lineupWeek"','id="lineupRecommendations"','id="waiverRecommendations"','id="offenseOutlook"','id="leagueBoard"'];
for(const token of names)assert.equal(html.split(token).length-1,1,'Duplicated/missing '+token);
assert.ok(html.indexOf('id="myLineup"')>html.indexOf('id="page-rosters"'),'Full roster belongs on Rosters');
assert.ok(html.includes('overview-roster.js'),'Module loaded from the homepage');
const inlineStart=html.lastIndexOf('<script>');
const inlineEnd=html.indexOf('</script>',inlineStart);
assert.ok(inlineStart>=0&&inlineEnd>inlineStart,'Inline dashboard script exists');
new Function(html.slice(inlineStart+'<script>'.length,inlineEnd));
const script=fs.readFileSync(path.join(base,'overview-roster.js'),'utf8');
const root={innerHTML:''};
const context={document:{getElementById(id){return id==='myLineup'?root:null;}}};
vm.runInNewContext(script,context,{filename:'overview-roster.js'});
const read=p=>JSON.parse(fs.readFileSync(path.join(base,p),'utf8'));
const slots=['QB','RB','RB','WR','WR','TE','W/R/T','K','DEF'];
const order={QB:0,RB:1,WR:2,TE:3,K:4,DEF:5};
const encodedName=p=>p.name.replaceAll('&','&amp;').replaceAll("'",'&#39;').replaceAll('"','&quot;');
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
 const benchSection=current.split('<strong>Bench</strong>')[1]?.split('roster-ir-heading')[0]||'';
 const listed=[...benchSection.matchAll(/class="roster-board-position">([A-Z]+)/g)].map(m=>m[1]);
 assert.equal(listed.length,bench.length,entry.label+' bench positions all shown');
 assert.deepEqual(listed,listed.slice().sort((a,b)=>order[a]-order[b]),entry.label+' bench should sort QB RB WR TE K DEF');
 assert.match(current,/carries|targets|pass att/,entry.label+' opportunity estimates missing');
 for(const p of bench)assert.ok(current.includes(encodedName(p)),entry.label+' hides benched '+p.name);
 for(const p of IR)assert.ok(current.includes(encodedName(p)),entry.label+' hides IR '+p.name);
 assert.ok(!current.includes('No eligible backup'),'No empty backup placeholders');
 assert.equal((current.match(/class="roster-board-row/g)||[]).length,roster.length,entry.label+' should render every Yahoo roster player once');
 context.DaVinciRosterOverview.render(6);
 const upcoming=root.innerHTML;
 assert.match(upcoming,/Optimized lineup/);
 assert.ok(upcoming.includes(encodedName(switchPlayer)),entry.label+' future optimized starter visible');
 assert.equal((upcoming.match(/class="roster-board-row/g)||[]).length,roster.length,entry.label+' week selector lost a player');
 console.log(entry.label+': '+starters.length+' starters, '+bench.length+' bench, '+IR.length+' IR, future-week selection correct');
}
console.log('Homepage structural markup and inline JavaScript syntax verified');

require(path.join(base,'matchup-overview.js'));
assert.ok(html.includes('./matchup-overview.js'),'Submitted-lineup module loaded');
assert.ok(!html.includes('Model breakdown'),'Overview model strip removed');
for(const entry of [{folder:'data/',id:'7'},{folder:'data/nebraska/',id:'6'}]){
 const data={rosters:read(entry.folder+'rosters.json'),weekly:read(entry.folder+'weekly.json'),future:read(entry.folder+'future.json'),week:5};
 const actual=globalThis.DaVinciMatchup.submitted(data,entry.id);
 assert.equal(actual.rows.length,9);
 const roster=data.rosters.teams.find(t=>t.id===entry.id).players;
 assert.deepEqual(actual.rows.map(r=>r.player.id).sort(),roster.filter(p=>!['BN','IR'].includes(p.slot)).map(p=>p.id).sort(),'Compare submitted starters, never optimized bench substitutions');
 if(actual.total!=null)assert.equal(actual.total,actual.rows.reduce((s,r)=>s+r.points,0));
 const qb=actual.rows[0].player;
 data.weekly.players=data.weekly.players.filter(p=>String(p.yahooId)!==String(qb.id));
 data.future.players=data.future.players.filter(p=>String(p.yahooId)!==String(qb.id));
 assert.equal(globalThis.DaVinciMatchup.submitted(data,entry.id).total,null,'Missing projection must not silently become zero');
 qb.status='OUT';
 const out=globalThis.DaVinciMatchup.submitted(data,entry.id).rows[0];
 assert.equal(out.points,0);assert.equal(out.label,'OUT');
 qb.status=null;qb.slot='BN';
 const empty=globalThis.DaVinciMatchup.submitted(data,entry.id);
 assert.equal(empty.rows[0].player,null);assert.equal(empty.total,null);
}
console.log('Both leagues compare submitted starters with explicit missing, OUT and empty-slot behavior.');

assert.match(html,/clean-dashboard\.css\?v=/,"Changed stylesheet must bypass stale browser caches");
assert.match(html,/matchup-overview\.js\?v=/,"Changed matchup code must be versioned with the stylesheet");
assert.doesNotMatch(html,/Yahoo standings unavailable|Same submitted lineup/,"Overview should not display placeholder prose");
