/* Run: node fantasy-preview/tests/special-teams.test.cjs
 * Read-only regression checks for nine-starter K/DST forecasts.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const BASE=path.resolve(__dirname,'..');
const json=p=>JSON.parse(fs.readFileSync(path.join(BASE,p),'utf8'));
const html=fs.readFileSync(path.join(BASE,'index.html'),'utf8');
require(path.join(BASE,'special-teams-model.js'));
const modeler=globalThis.DaVinciSpecialTeams;
assert.ok(modeler && typeof modeler.enrich==='function');
const context=json('data/special-teams-context.json');
assert.ok(context.dataThroughWeek>0 && context.dataThroughWeek<json('data/week.json').week,'Team context must exclude the current fantasy week');
assert.ok(context.games.every(g=>g[0]!==2026||g[1]<=context.dataThroughWeek));
assert.ok(context.games.length>=1100);
const starts=html.indexOf('const MODEL_SKILL_SLOTS=');
const ends=html.indexOf('function renderModelMatchup(){',starts);
assert.ok(starts>0 && ends>starts);
const core=html.slice(starts,ends);
const getLineup=new Function('rosters','futureData','weekly','week',
  'const team=id=>rosters.teams.find(t=>String(t.id)===String(id));'+core+
  ';return {modelTeamLineup,MODEL_SKILL_SLOTS};');
const byLeague={};
for(const entry of [{slug:'',user:'7',id:'470.l.258793',n:14},
                    {slug:'nebraska/',user:'6',id:'470.l.1699881',n:10}]){
 const root='data/'+entry.slug;
 const rosters=json(root+'rosters.json'),available=json(root+'available.json');
 const league=json(root+'league.json'),future=json(root+'future.json');
 const weekly=json(root+'weekly.json');
 assert.equal(league.leagueId,entry.id);
 assert.equal(rosters.leagueId,entry.id);
 assert.equal(available.leagueId,entry.id);
 assert.equal(rosters.teams.length,entry.n);
 const result=modeler.enrich({context,league,rosters,available,futureData:future,weekly});
 assert.ok(result.def>=32 && result.k>=32);
 const specials=future.players.filter(p=>['K','DEF'].includes(p.position));
 const typeCounts={K:specials.filter(p=>p.position==='K').length,
                   DEF:specials.filter(p=>p.position==='DEF').length};
 assert.equal(typeCounts.DEF,32);
 assert.ok(typeCounts.K>=32);
 for(const player of specials){
   assert.equal(player.weeks.length,future.endWeek-Math.max(future.startWeek,weekly.week)+1);
   for(const week of player.weeks){
     assert.ok(Number.isFinite(week.points) && week.points>=-10 && week.points<40,
       'Invalid special teams points: '+player.name+' / '+week.week);
     if(week.state==='bye') {
       assert.equal(week.points,0);
       assert.equal(week.opponent,null);
     } else {
       assert.ok(week.opponent);
       const componentSum=week.components.reduce((n,c)=>n+c.points,0);
       assert.ok(Math.abs(componentSum-week.points)<.13,
         'Scoring components mismatch: '+player.name+' W'+week.week);
       if(week.conditions.windMph==null)
         assert.equal(week.conditions.weatherApplied,false,'Missing forecast cannot become weather adjustment');
     }
   }
 }
 const {modelTeamLineup,MODEL_SKILL_SLOTS}=getLineup(rosters,future,weekly,{week:Number(weekly.week)});
 assert.equal(MODEL_SKILL_SLOTS.length,9);
 for(const week of [5,6,7,8,9,13,17].filter(w=>w>=Number(weekly.week))){
  for(const team of rosters.teams){
   const lineup=modelTeamLineup(team.id,week);
   if(!lineup){
    const blocked=p=>p.slot==='IR'||['O','OUT','IR','IR-R','CEL','SUSP','SUS','NA','N/A','PUP','PUP-R','NFI','NFI-R'].includes(p.status);
    assert.ok(Object.entries({QB:1,RB:2,WR:2,TE:1,K:1,DEF:1}).some(([pos,needed])=>team.players.filter(p=>p.position===pos&&!blocked(p)).length<needed),entry.slug+' unexpected missing '+team.name+' / W'+week);
    continue; // An unavailable sole kicker cannot form a complete optimized lineup.
   }
   assert.equal(lineup.ids.length,9);
   assert.equal(new Set(lineup.ids.map(p=>p.id)).size,9);
   assert.ok(lineup.ids.every(p=>MODEL_SKILL_SLOTS[p.slot].includes(p.position)));
   assert.ok(Number.isFinite(lineup.points));
  }
 }
 const mine=modelTeamLineup(entry.user,Number(weekly.week));
 byLeague[entry.slug||'csu']={
  projected:mine.points,def:mine.ids.find(p=>p.position==='DEF').points,
  k:mine.ids.find(p=>p.position==='K').points,
  byId:new Map(specials.map(p=>[p.yahooId,p]))
 };
 console.log((entry.slug||'csu')+': '+rosters.teams.length+' complete nine-starter teams, '+specials.length+' K/DST projections');
}
const id='100020',a=byLeague.csu.byId.get(id),b=byLeague['nebraska/'].byId.get(id);
const comparisonWeek=Math.max(Number(json('data/week.json').week),Number(json('data/nebraska/week.json').week));
assert.ok(a && b && a.weeks.find(w=>w.week===comparisonWeek).points!==b.weeks.find(w=>w.week===comparisonWeek).points,
  'Defensive scoring should change when changing leagues');
const kId='33537',c=byLeague.csu.byId.get(kId),d=byLeague['nebraska/'].byId.get(kId);
assert.ok(c && d && c.weeks.find(w=>w.week===comparisonWeek).points!==d.weeks.find(w=>w.week===comparisonWeek).points,
  'Kicker scoring should change with Yahoo scoring coefficients');
console.log('Both leagues passed: matchup, defense, kicker, scoring and no-leakage checks.');
