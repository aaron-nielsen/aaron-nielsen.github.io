(function(root){
'use strict';
const $=id=>document.getElementById(id);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=x=>x==null?'—':Number(x).toFixed(1);
const signed=x=>x==null?'—':(x>=0?'+':'')+fmt(x);
let model,data,values=[],generation=0,planningRows=null;
function dates(){return 'Forecast '+String(data.future.generatedAt||'unknown').slice(0,10)+' · stats through W'+(data.future.statsThroughWeek||'?')+' · rosters '+String(data.rosters.retrievedAt||data.future.rosterSnapshotAt||'unknown').slice(0,10)+' · available players '+String(data.available.retrievedAt||'unknown').slice(0,10);}
function readWeeks(){const mode=$('valueHorizon').value;return mode==='four'?model.range(model.start,Math.min(model.start+3,model.end)):mode==='playoffs'?model.range(Math.max(15,model.start),model.end):model.range();}
function filtered(){
 const pos=$('valuePosition').value,scope=$('valueOwnership').value,q=$('valueSearch').value.trim().toLowerCase(),sort=$('valueSort').value;
 return values.filter(p=>(pos==='all'||p.position===pos)&&(scope==='all'||scope==='mine'&&String(p.fantasyTeamId)===String(data.teamId)||scope==='available'&&!p.fantasyTeamId&&!p.unverified||scope==='rostered'&&p.fantasyTeamId)&&(!q||[p.name,p.nflTeam,p.fantasyTeam].join(' ').toLowerCase().includes(q)))
  .sort((a,b)=>sort==='name'?a.name.localeCompare(b.name):(b[sort]??-Infinity)-(a[sort]??-Infinity)||a.name.localeCompare(b.name));
}
function renderValues(){
 const rows=filtered();const limit=$('valueLimit').value==='all'?rows.length:Number($('valueLimit').value);
 $('valueCount').textContent=rows.length+' matching players · '+values.filter(p=>p.vor!==null).length+'/'+values.length+' with replacement values';
 $('valueRows').innerHTML=rows.length?rows.slice(0,limit).map(p=>'<tr><td><details><summary><strong>'+(root.DaVinciPlayerDetail?.link(p)||esc(p.name))+'</strong><small>'+esc(p.position)+' · '+esc(p.nflTeam||'No NFL club')+'</small></summary><p>'+esc(p.coverage)+(p.status?' · '+esc(p.status):'')+'</p><p>'+esc(p.kind||'Lineup impact pending')+(p.drop?' · '+(p.kind==='Loss if removed'?'Replacement: ':'Drop: ')+esc(p.drop):'')+'</p><p>Replacement baseline: '+fmt(p.reference)+' pts · '+p.replacements.map(x=>'W'+x.week+': '+esc(x.name||'Unknown')+' '+fmt(x.points)).join(' · ')+'</p></details></td><td>'+esc(p.fantasyTeam)+'</td><td class="plan-number">'+fmt(p.next)+'</td><td class="plan-number">'+fmt(p.ros)+'</td><td class="plan-number">'+signed(p.vor)+'</td><td class="plan-number">'+signed(p.impact)+'<small>'+esc(p.kind||'Pending')+'</small></td></tr>').join(''):'<tr><td colspan="6">No players match these filters.</td></tr>';
}
function compute(){
 const job=++generation,weeks=readWeeks();
 const targetId=$('valueTarget').value;
 const valuation=root.DaVinciPlanningModel.create({...data,teamId:targetId});
 const targetName=data.rosters.teams.find(t=>String(t.id)===targetId)?.name||'Selected team';
 $('valueImpactHeading').textContent=targetName+' impact';
 $('valueExport').disabled=true;
 values=valuation.players.map(p=>({...valuation.value(p,weeks),impact:null}));
 $('valueWeekHeading').textContent='W'+weeks[0];
 $('valuePeriod').textContent='Weeks '+weeks[0]+'–'+weeks.at(-1)+' · '+dates();
 renderValues();
 // Keep interaction responsive while complete-lineup counterfactuals run.
 setTimeout(()=>{
  if(job!==generation)return;
  const impact=valuation.impactContext(weeks);let index=0;
  function chunk(){
   if(job!==generation)return;
   const end=Math.min(index+4,values.length);
   for(;index<end;index++)Object.assign(values[index],impact(values[index]));
   $('valueProgress').textContent=index<values.length?'Calculating lineup impacts: '+index+' / '+values.length:
    'Lineup impacts complete for '+targetName+' · their players show loss if removed; others show gain if added. Unknown values stay blank.';
   if(index<values.length)setTimeout(chunk,0);else {renderValues();$('valueExport').disabled=false;}
  }
  chunk();
 },0);
}
function weakness(row){
 if(!row.opponent)return 'Opponent TBD';
 if(row.missingSlots?.length)return row.missingSlots.join(', ')+' unavailable';
 return row.weaknesses.length?row.weaknesses.map(x=>x.pos+' '+signed(x.gap)+' vs median').join(' · '):row.theirs==null?'Projection data missing':'No clear weakness';
}
function scheduleScore(score,complete,missing){return fmt(score)+(score!=null&&complete===false?'<small>Subtotal · '+(9-(missing?.length||0))+'/9 starters</small>':'');}
function renderSchedule(){
 planningRows=planningRows||model.schedule();
 $('scheduleContext').textContent=dates()+' · future lineups assume current rosters';
 $('scheduleRows').innerHTML=planningRows.map(r=>'<tr><td>W'+r.week+'</td><td><strong>'+esc(r.opponent||'Opponent TBD')+'</strong><small>'+esc(r.strengths.length?'Strength: '+r.strengths.map(x=>x.pos+' '+signed(x.gap)).join(' · '):'')+'</small></td><td class="plan-number">'+scheduleScore(r.yours,r.yoursComplete,r.yourMissingSlots)+'</td><td class="plan-number">'+scheduleScore(r.theirs,r.theirsComplete,r.missingSlots)+'</td><td class="plan-number">'+signed(r.margin)+'</td><td>'+esc(weakness(r))+'</td><td>'+esc(r.byes.join(', ')||'None')+'</td></tr>').join('');
 renderNfl();
}
function renderNfl(){
 const from=Number($('scheduleFrom').value||model.start),weeks=model.range(from,Math.min(from+3,model.end));
 $('nflWeekHeader').innerHTML='<th>My roster</th>'+weeks.map(w=>'<th>W'+w+'</th>').join('');
 $('nflWeekRows').innerHTML=(model.own?.players||[]).map(p=>'<tr><td><strong>'+(root.DaVinciPlayerDetail?.link(p)||esc(p.name))+'</strong><small>'+esc(p.position)+' · '+esc(p.nflTeam)+'</small></td>'+weeks.map(w=>{
  const f=model.forecasts.get(String(p.id)),frame=f?.weeks?.find(x=>Number(x.week)===w),game=model.nflGame(p,w);
  if(!game)return '<td>'+(!data.nflSchedule?'Schedule unavailable':'BYE / no scheduled game')+'</td>';
  const consistent=frame&&root.DaVinciPlanningModel.norm(frame.opponent)===root.DaVinciPlanningModel.norm(game.opponent);
  const factor=consistent&&Number.isFinite(frame.factor)?frame.factor:null;
  const note=factor==null?'Matchup rating unavailable':factor>=1.03?'Favorable':factor<=.97?'Difficult':'Neutral';
  return '<td><strong>'+esc((game.home?'vs ':'@ ')+game.opponent)+'</strong><small>'+esc(game.date)+'</small><span class="plan-matchup '+(note==='Favorable'?'favorable':note==='Difficult'?'difficult':'')+'">'+note+'</span><small>'+fmt(consistent?model.point(p,w):null)+' pts'+(factor==null?'':' · '+signed((factor-1)*100)+'% model factor')+'</small></td>';
 }).join('')+'</tr>').join('');
 $('nflScheduleSource').textContent=data.nflSchedule?'NFL schedule checked '+String(data.nflSchedule.retrievedAt).slice(0,10)+' · matchup ratings use the dated model':'NFL schedule unavailable';
}
function exportValues(){
 const rows=filtered(),cell=x=>'"'+String(x??'').replaceAll('"','""')+'"';
 const header=['Player','Position','NFL team','Fantasy team','First week points','Period points','Points above replacement','Your lineup impact','Impact type','Value for','Drop or replacement','Coverage','Forecast date','Period'];
 const csv=[header,...rows.map(p=>[p.name,p.position,p.nflTeam,p.fantasyTeam,p.next,p.ros,p.vor,p.impact,p.kind,$('valueTarget').selectedOptions[0]?.textContent,p.drop,p.coverage,data.future.generatedAt,readWeeks().join(';')])].map(row=>row.map(cell).join(',')).join('\r\n');
 const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download='fantasy-values-'+data.leagueKey+'.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
let started=false;
function show(page){if(!model)return;if(page==='values'&&!started){started=true;compute();}if(page==='schedule')renderSchedule();}
function init(options){
 data=options;model=root.DaVinciPlanningModel.create(data);started=false;planningRows=null;
 $('valueProgress').textContent='Open Player values to calculate locally.';
 for(const control of ['valuePosition','valueOwnership','valueSort','valueLimit','valueSearch'])$(control).addEventListener(control==='valueSearch'?'input':'change',renderValues);
 $('valueTarget').innerHTML=data.rosters.teams.map(t=>'<option value="'+esc(t.id)+'">'+esc(t.name)+'</option>').join('');
 $('valueTarget').value=String(data.teamId);
 $('valueTarget').addEventListener('change',compute);
 $('valueHorizon').addEventListener('change',compute);$('valueExport').addEventListener('click',exportValues);
 $('scheduleFrom').innerHTML=model.range().map(w=>'<option value="'+w+'">From Week '+w+'</option>').join('');
 $('scheduleFrom').addEventListener('change',renderNfl);
 const next=model.start;
 const round=data.schedule?.weeks?.find(w=>Number(w.week)===next);
 const game=round?.matchups?.find(m=>[String(m.home.id),String(m.away.id)].includes(String(data.teamId)));
 const opponent=game?(String(game.home.id)===String(data.teamId)?game.away:game.home):null;
 const roster=data.rosters.teams.find(t=>String(t.id)===String(data.teamId))?.players||[];
 const byes=roster.filter(p=>data.future.players.find(f=>String(f.yahooId)===String(p.id))?.weeks?.find(w=>Number(w.week)===next)?.state==='bye').map(p=>p.name);
 $('planningShortcut').innerHTML='<div><strong>Next · Week '+next+(opponent?' vs '+esc(opponent.name):'')+'</strong>'+(byes.length?'<span>Bye: '+esc(byes.join(', '))+'</span>':'')+'</div><button type="button" data-plan-page="schedule">Full schedule</button>';
 $('planningShortcut').addEventListener('click',e=>{const button=e.target.closest('[data-plan-page]');if(button)root.DaVinciShowPage(button.dataset.planPage);});
 $('targetCalculate').addEventListener('click',()=>{
  $('targetResults').textContent='Testing selected trade packages…';
  setTimeout(()=>{
   try{root.DaVinciPersonalTrades.render();}
   catch(error){$('targetResults').textContent='Could not calculate these packages. Try different choices below.';}
  },0);
 });
 show(location.hash.slice(1));
}
root.DaVinciPlanning={init,show};
})(window);
