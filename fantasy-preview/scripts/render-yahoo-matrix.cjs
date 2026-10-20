#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path');
function render(matrix,rosters){
 const payload=JSON.stringify({matrix,rosters}).replace(/</g,'\\u003c');
 return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="robots" content="noindex, nofollow"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Ten Felines arbitrage</title>
<style>
.page-tabs{display:flex;gap:5px;width:100%;margin-bottom:4px}.page-tabs button{border:1px solid #d8c8b4;border-radius:6px;padding:10px 14px;background:#fffdf8;color:#746451;font:inherit;cursor:pointer}.page-tabs button[aria-selected="true"]{background:#705433;color:white;border-color:#705433}*{box-sizing:border-box}body{margin:0;padding:24px;background:#faf7f1;color:#382d24;font:15px system-ui,sans-serif}a{color:#705433}h1{margin:14px 0 8px;font-size:28px}p{color:#746451;margin:8px 0 16px}nav{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin:20px 0}input,select{font:inherit;padding:9px;border:1px solid #d8c8b4;border-radius:6px;background:white;color:inherit}input{min-width:220px;flex:1;max-width:350px}.scroll{overflow:auto;max-height:75vh;border:1px solid #ded2c2;border-radius:8px;background:#fffdf8}table{border-collapse:separate;border-spacing:0;width:100%;font-size:13px}th,td{padding:11px 12px;border-bottom:1px solid #eee4d8;text-align:right;min-width:120px}th{position:sticky;top:0;z-index:2;background:#eee4d5;white-space:normal;color:#49392b}th:first-child,td:first-child{position:sticky;left:0;text-align:left;min-width:220px;background:#fffdf8;z-index:1}th:first-child{z-index:3;background:#eee4d5}.partner-name{display:block;font-size:11px;color:#8a7968;margin-top:4px}.player small{display:block;color:#8a7968;margin-top:3px}.owner{text-align:left;min-width:170px}.gain{color:#37634a;font-variant-numeric:tabular-nums}.loss{color:#9b4a33;font-variant-numeric:tabular-nums}.mine{background:#f1f5ee}.owned{font-size:11px;color:#927c67}.empty{padding:24px;text-align:left}#count{margin-left:auto;font-size:13px;color:#746451}@media(max-width:600px){body{padding:14px}h1{font-size:23px}nav{gap:7px}input{min-width:100%;max-width:none}}
.matrix-banner{display:block;width:100%;max-width:800px;padding:0;margin:0 auto 14px;border:0;background:transparent;cursor:pointer}.matrix-banner img{display:block;width:100%;height:auto}.matrix-banner:focus-visible{outline:2px solid #705433;outline-offset:4px}#matrixContent[hidden]{display:none!important}
</style>
<button id="matrixBanner" type="button" class="matrix-banner" aria-label="Show dashboard" aria-expanded="false" aria-controls="matrixContent"><img src="./assets/da-vinci-fantasy-lab-approved.webp" width="1000" height="333" alt="Da Vinci Fantasy Lab"></button><div id="matrixContent" hidden>
<a href="./index.html#trades">← Trades</a><h1>Ten Felines arbitrage</h1><p id="context"></p>
<nav><input id="search" type="search" aria-label="Find a player" placeholder="Find a player"><select id="position" aria-label="Position"><option value="all">All positions</option>${['QB','RB','WR','TE','K','DEF'].map(p=>'<option>'+p+'</option>').join('')}</select><div class="page-tabs" role="tablist" aria-label="Player direction"><button id="sendPage" type="button" role="tab" aria-selected="true">Players I can trade</button><button id="acquirePage" type="button" role="tab" aria-selected="false">Players I can acquire</button></div><select id="team" aria-label="Trade partner"><option value="all">All trade partners</option></select><select id="horizon" aria-label="Weeks"><option value="ros">Weeks 6–17</option><option value="four">Weeks 6–9</option><option value="playoffs">Playoffs · 15–17</option></select><span id="count"></span></nav>
<p>Every row involves Felines. Arbitrage = Felines impact + other team impact.</p>
<div class="scroll"><table><thead id="head"></thead><tbody id="rows"></tbody></table></div>
</div>
<script id="matrix-data" type="application/json">${payload}</script><script>
const {matrix,rosters}=JSON.parse(document.getElementById('matrix-data').textContent),mine=String(rosters.userTeamId||'7');
const $=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
$('matrixBanner').addEventListener('click',()=>{const content=$('matrixContent'),open=content.hidden;content.hidden=!open;$('matrixBanner').setAttribute('aria-expanded',String(open));$('matrixBanner').setAttribute('aria-label',open?'Hide dashboard':'Show dashboard');});
let direction='mine';
const teams=matrix.teams.slice().sort((a,b)=>Number(String(b.id)===mine)-Number(String(a.id)===mine)||a.name.localeCompare(b.name));
const values=new Map(teams.map(t=>[String(t.id),new Map(t.impacts.map(p=>[String(p.id),p]))]));
const owners=new Map(rosters.teams.flatMap(t=>t.players.map(p=>[String(p.id),t])));
for(const t of teams)if(String(t.id)!==mine)$('team').insertAdjacentHTML('beforeend','<option value="'+esc(t.id)+'">'+esc(t.name)+'</option>');
const date=d=>d?new Date(d).toLocaleDateString('en-US',{timeZone:'America/Denver',month:'short',day:'numeric'}):'unknown';
$('context').textContent=matrix.coverage.players+' players · '+matrix.coverage.totalTeams+' teams · snapshots '+date(matrix.freshness?.oldest||matrix.collectedAt)+'–'+date(matrix.freshness?.newest||matrix.updatedAt);
function value(team,p,weeks){const row=values.get(String(team.id))?.get(String(p.id));if(!row)return null;const selected=row.weekly?.filter(w=>weeks.includes(Number(w.week)));if(!selected||selected.length!==weeks.length||selected.some(w=>!Number.isFinite(w.value)))return null;return Math.round(selected.reduce((n,w)=>n+w.value,0)*100)/100;}
const fmt=n=>n===null?'Unknown':Number(n).toFixed(2);
function draw(){
 const h=$('horizon').value,weeks=h==='playoffs'?matrix.weeks.filter(w=>w>=15):h==='four'?matrix.weeks.slice(0,4):matrix.weeks;
 const shown=teams.filter(t=>String(t.id)!==mine&&($('team').value==='all'||String(t.id)===$('team').value)),q=$('search').value.toLowerCase().trim(),pos=$('position').value,scope=direction,ownTeam=teams.find(t=>String(t.id)===mine);
 const players=matrix.players.filter(p=>(pos==='all'||p.position===pos)&&(!q||p.name.toLowerCase().includes(q))&&((scope==='mine')===(String(owners.get(String(p.id))?.id)===mine)));
 const rows=[];
 for(const p of players){
  const owner=owners.get(String(p.id));if(!owner)continue;
  const sending=String(owner.id)===mine,loss=value(owner,p,weeks);
  const partners=sending?shown:shown.filter(t=>String(t.id)===String(owner.id));
  const choices=partners.map(partner=>{const gain=value(sending?partner:ownTeam,p,weeks),edge=loss===null||gain===null?null:Math.round((gain-loss)*100)/100;return {p,partner,sending,edge,you:sending?(loss===null?null:-loss):gain,them:sending?gain:(loss===null?null:-loss)};});
  choices.sort((a,b)=>(b.edge??-Infinity)-(a.edge??-Infinity)||a.partner.name.localeCompare(b.partner.name));
  if(choices.length)rows.push(choices[0]);
 }
 rows.sort((a,b)=>(b.edge??-Infinity)-(a.edge??-Infinity)||a.p.name.localeCompare(b.p.name));
 const cell=n=>'<td class="'+(n<0?'loss':'gain')+'">'+(n===null?'Unknown':(n<0?'−':'+')+fmt(Math.abs(n)))+'</td>';
 $('head').innerHTML='<tr><th>Player</th><th>Felines</th><th>Other team</th><th>Arbitrage</th></tr>';
 $('rows').innerHTML=rows.length?rows.map(r=>'<tr><td class="player"><strong>'+esc(r.p.name)+'</strong><small>'+esc(r.p.position)+' · '+(r.sending?'Send':'Receive')+'</small></td>'+cell(r.you)+cell(r.them).replace('</td>','<small class="partner-name">'+esc(r.partner.name)+'</small></td>')+cell(r.edge)+'</tr>').join(''):'<tr><td class="empty" colspan="4">No matching players.</td></tr>';
 $('count').textContent=rows.filter(r=>r.edge>0).length+' positive · '+rows.length+' players';
}
for(const [name,scope] of [['sendPage','mine'],['acquirePage','targets']])$(name).addEventListener('click',()=>{direction=scope;$('sendPage').setAttribute('aria-selected',String(scope==='mine'));$('acquirePage').setAttribute('aria-selected',String(scope==='targets'));draw();});
for(const name of ['position','team','horizon'])$(name).addEventListener('change',draw);$('search').addEventListener('input',draw);draw();
</script></html>`;
}
module.exports={render};
if(require.main===module){const base=path.resolve(__dirname,'..'),read=n=>JSON.parse(fs.readFileSync(path.join(base,'data',n+'.json')));fs.writeFileSync(path.join(base,'yahoo-matrix.html'),render(read('yahoo-team-player-values'),read('rosters')));}
