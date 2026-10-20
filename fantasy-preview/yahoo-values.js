/* Yahoo-only optimal weekly lineups. No custom forecasts or injury overrides. */
(function(root){
'use strict';
const id=p=>String(p.id||p.yahooId);
const round=n=>Math.round(n*100)/100||0;
function create(data){
 const frames=new Map((data?.players||[]).map(p=>[id(p),p])),cache=new Map(),marginalCache=new Map();
 function score(players,week){
  const key=week+'/'+players.map(p=>id(p)+':'+p.position).sort().join('.');
  if(cache.has(key))return cache.get(key);
  const groups={QB:[],RB:[],WR:[],TE:[],K:[],DEF:[]};
  for(const p of players){
   if(!groups[p.position]){cache.set(key,null);return null;}
   const g=frames.get(id(p))?.weeks?.find(g=>Number(g.week)===Number(week));
   if(g?.points==null||!Number.isFinite(Number(g.points))){cache.set(key,null);return null;}
   groups[p.position].push(Math.max(0,Number(g.points)));
  }
  for(const group of Object.values(groups))group.sort((a,b)=>b-a);
  const sum=(pos,n)=>groups[pos].slice(0,n).reduce((a,b)=>a+b,0);
  // Each option fills RB/RB, WR/WR, TE and one legal flex, allowing empty slots.
  const offense=Math.max(sum('RB',3)+sum('WR',2)+sum('TE',1),sum('RB',2)+sum('WR',3)+sum('TE',1),sum('RB',2)+sum('WR',2)+sum('TE',2));
  const total=round(sum('QB',1)+offense+sum('K',1)+sum('DEF',1));
  cache.set(key,total);return total;
 }
 function delta(before,after,weeks){
  // QB, K, DEF and the RB/WR/TE+FLEX unit optimize independently. Unchanged
  // units cancel exactly, even if their absolute totals are unavailable.
  const group=p=>['RB','WR','TE'].includes(p.position)?'FLEX':['QB','K','DEF'].includes(p.position)?p.position:null;
  const valid=[...before,...after].every(p=>group(p)!==null);
  const signature=(players,g)=>players.filter(p=>group(p)===g).map(p=>id(p)+':'+p.position).sort().join('.');
  const changed=['QB','FLEX','K','DEF'].filter(g=>signature(before,g)!==signature(after,g));
  const subset=players=>players.filter(p=>changed.includes(group(p)));
  const weekly=weeks.map(week=>{
   const a=score(before,week),b=score(after,week),x=valid?score(subset(before),week):null,y=valid?score(subset(after),week):null;
   return {week,before:a,after:b,impact:x==null||y==null?null:round(y-x)};
  });
  return {impact:weekly.some(g=>g.impact==null)?null:round(weekly.reduce((n,g)=>n+g.impact,0)),weekly};
 }
 function trade(mine,partner,send,receive,weeks){
  const outgoing=new Set(send.map(id)),incoming=new Set(receive.map(id));
  const you=delta(mine,mine.filter(p=>!outgoing.has(id(p))).concat(receive),weeks);
  const them=delta(partner,partner.filter(p=>!incoming.has(id(p))).concat(send),weeks);
  return you.impact==null||them.impact==null?null:{gainYou:you.impact,gainThem:them.impact,weeklyYou:you.weekly,weeklyThem:them.weekly,source:data.source};
 }
 function marginal(players,player,weeks){
  const key=players.map(id).sort().join('.')+'/'+id(player)+'/'+weeks.join('.');
  if(marginalCache.has(key))return marginalCache.get(key);
  const owned=players.some(p=>id(p)===id(player));
  const result=delta(players,owned?players.filter(p=>id(p)!==id(player)):players.concat(player),weeks);
  const value=result.impact===null?null:round(owned?-result.impact:result.impact);
  const output={owned,gainIfAdded:owned?null:value,lossIfRemoved:owned?value:null,
   weekly:result.weekly.map(w=>({week:w.week,value:w.impact===null?null:round(owned?-w.impact:w.impact)}))};
  marginalCache.set(key,output);return output;
 }
 return {score,delta,trade,marginal};
}
root.YahooValues={create};
})(typeof window!=='undefined'?window:globalThis);
