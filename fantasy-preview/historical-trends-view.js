/* Display measured lineup trends separately from transaction projections. */
(function(root){
'use strict';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=x=>x==null?'—':x.toFixed(1);
async function render(league){
 const el=document.getElementById('historicalTrends');if(!el)return;
 const isNeb=league==='nebraska';
 const base=isNeb?'./data/historical/nebraska-week-':'./data/historical/csu-week-';
 const count=isNeb?1:4,first=isNeb?4:1;
 const files=await Promise.all(Array.from({length:count},(_,i)=>fetch(base+(first+i)+'.json',{cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null)));
 const valid=files.filter(Boolean);
 if(!valid.length){el.textContent='No verified historical lineup records available.';return;}
 const teams=root.DaVinciHistorical.analyze(valid);
 const rows=teams.map(t=>'<tr><th scope="row"><details><summary>'+esc(t.teamName)+'</summary><div class="quiet tiny">'+
  t.byWeek.map(w=>'Week '+w.week+': '+fmt(w.actualPoints)+' starter pts'+(w.missedPoints==null?' · lineup coverage incomplete':' · '+fmt(w.missedPoints)+' left on bench')).join(' | ')+
  '</div></details></th><td>'+t.weeks+
  '</td><td>'+fmt(t.actualPoints)+'</td><td>'+t.evaluatedWeeks+'</td><td>'+fmt(t.missedPoints)+'</td></tr>').join('');
 el.innerHTML='<h3>Historical lineup performance</h3><p class="quiet tiny">Actual Yahoo points, Weeks '+valid.map(x=>x.week).join(', ')+
  '. '+(isNeb?'Nebraska league matchups begin Week 5; Week 4 is a pre-league roster baseline, not an official matchup. Weeks 1–3 have no available rosters. ':'')+'Missed points compare starters with the best legal lineup from players on that week’s roster. This is not transaction impact.</p>'+
  '<div style="overflow-x:auto"><table class="table"><thead><tr><th>Team</th><th>Weeks</th><th>Actual starter points</th><th>Evaluated weeks</th><th>Points left on bench</th></tr></thead><tbody>'+rows+'</tbody></table></div>';
}
root.DaVinciHistoricalView={render};
})(window);
