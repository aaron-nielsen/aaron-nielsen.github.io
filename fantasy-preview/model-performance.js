/* Model performance: never fabricate accuracy from current, refreshed forecasts. */
(function(root){
'use strict';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>n==null?'—':n.toFixed(2);
async function render(league){
 const node=document.getElementById('accuracyResults');
 if(!node)return;
 node.textContent='Checking verified pregame records…';
 try{
  const prefix=league==='nebraska'?'./data/nebraska/':'./data/';
  const response=await fetch(prefix+'forecast-observations.json',{cache:'no-store'});
  if(!response.ok)throw Error('No verified results published yet');
  const records=await response.json();
  if(!Array.isArray(records))throw Error('Invalid observation format');
  const result=root.DaVinciAccuracy.evaluate(records);
  if(!result.n)throw Error('No completed player-weeks with verified pregame forecasts');
  const rows=Object.entries(result.byPosition).map(([position,v])=>
   '<tr><th scope="row">'+esc(position==='all'?'All positions':position)+'</th>'+
   '<td>'+v.daVinci.n+'</td><td>'+fmt(v.daVinci.mae)+'</td><td>'+fmt(v.daVinci.bias)+'</td>'+
   '<td>'+v.paired.n+'</td><td>'+fmt(v.paired.daVinci.mae)+'</td><td>'+fmt(v.paired.yahoo.mae)+'</td><td>'+(v.winRate==null?'—':(100*v.winRate).toFixed(1)+'%')+'</td></tr>').join('');
  const pairedN=result.byPosition.all?.paired.n||0;
  const caveat=pairedN<30?'<p class="quiet tiny">Small comparison sample ('+pairedN+' paired player-weeks). Treat differences as preliminary.</p>':'';
  node.innerHTML='<p>'+result.n+' verified player-weeks · '+result.excluded.notPregame+' post-kickoff records excluded</p>'+caveat+
   '<div style="overflow-x:auto"><table class="table"><thead><tr><th>Position</th><th>n</th><th>Da Vinci MAE</th><th>Bias</th><th>Paired n</th><th>Da Vinci paired MAE</th><th>Yahoo paired MAE</th><th>Da Vinci wins</th></tr></thead><tbody>'+rows+'</tbody></table></div>'+
   '<p class="quiet tiny">Lower MAE is better. Positive bias means overprediction. Yahoo comparisons use only matched player-weeks. Wins exclude ties.</p>';
 }catch(e){
  node.innerHTML='<div class="empty-copy"><strong>No verified accuracy results yet.</strong><p>Pregame predictions must be saved before kickoff and matched with actual fantasy points afterward. Current projections cannot be used to backfill historical accuracy.</p></div>';
 }
}
root.DaVinciPerformance={render};
})(window);
