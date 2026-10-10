const cats=[
['Cate','Empress Catherine II','2019-11-05','Houston, TX','American Longhair Manx','Calico','Cate the Great, CateCat, The Calico, Kitty, Grandma','#c35531'],
['Josie','Empress Joséphine Bonaparte','2020-06-19','Houston, TX','American Shorthair','Tortoiseshell tabby','Josie Pie','#7068ad'],
['Peach','Princess Peach','2020-06-19','Houston, TX','American Shorthair','Orange tabby','Peach Pie, Peachy','#b58112'],
['Ellie','Eleanor Roosevelt','2021-08-13','Scottsbluff, NE','American Longhair','Tortoiseshell','The Fluff, Ellie Bellie, Fluffhead','#368268'],
['Abbie','Abigail Adams','2022-02-20','Houston, TX','American Longhair','Gray and white','The Fuzz, Grandma’s Baby','#4c83a7'],
['Jackie','Jacqueline Kennedy Onassis','2023-05-02','Houston, TX','American Shorthair','Calico','The Little Calico, Mama','#b9578d'],
['Martha','Martha Washington','2024-03-28','Richmond, KY','American Shorthair','Calico','Martha Baby, Grandpa’s Baby','#987044'],
['Dolley','Dolley Madison','2024-03-28','Richmond, KY','American Shorthair','Calico','Dolley Pie','#748b25'],
['Zelda','Princess Zelda','2025-08-20','Carr, CO','American Longhair','Calico','Zelda','#287e83'],
['Cleo','Cleopatra','2025-08-20','Carr, CO','American Longhair','Calico','Cleo','#9b5571']
].map(([id,formal,born,place,breed,coat,nicknames,color])=>({id,formal,born,place,breed,coat,nicknames,color,name:id==='Jackie'?'Jackie O':id,photo:id==='Josie'?'assets/josie-portrait.jpg':`assets/${id.toLowerCase()}${['Ellie','Abbie','Jackie','Martha','Dolley','Zelda','Cleo'].includes(id)?'-2026':''}.jpg`}));
const $=id=>document.getElementById(id);const date=s=>new Date(s+'T12:00:00Z');const fmt=s=>date(s).toLocaleDateString('en-US',{year:'numeric',month:'short',day:'numeric',timeZone:'UTC'});const months=(a,b)=>(date(a)-date(b))/86400000/30.4375;
function age(born){const b=date(born),n=new Date();let m=(n.getUTCFullYear()-b.getUTCFullYear())*12+n.getUTCMonth()-b.getUTCMonth()-(n.getUTCDate()<b.getUTCDate()?1:0);return `${Math.floor(m/12)}y ${m%12}m`;}
let weights=[],smoothWeights={},dna={},selected=new Set(cats.map(c=>c.id));
function clowderFacts(){
 const birthdays=cats.map(c=>c.born).sort(),oldest=cats.filter(c=>c.born===birthdays[0]),youngest=cats.filter(c=>c.born===birthdays.at(-1));
 const facts=[['10','sassy girls'],[cats.filter(c=>c.coat==='Calico').length,'calicos'],[cats.filter(c=>c.breed.includes('Longhair')).length,'longhaired ladies'],[cats.filter(c=>c.breed.includes('Manx')).length,'Manx · Cate’s bobtail'],[oldest.map(c=>c.name).join(' & '),`Oldest · ${age(oldest[0].born)}`],[youngest.map(c=>c.name).join(' & '),`Youngest · ${age(youngest[0].born)}`]];
 $('clowder-facts').innerHTML=facts.map(([value,label])=>`<span><b>${value}</b>${label}</span>`).join('')+`<span class="origins"><strong>Where they’re from</strong><br>5 Texas · 2 Kentucky · 2 Colorado · 1 Nebraska</span>`;
}
clowderFacts();
function latest(c){return weights.filter(r=>r[c.id]!==undefined).at(-1)}
function cards(){ $('cat-grid').innerHTML=cats.map(c=>{let r=latest(c);return `<button class="cat-card" data-cat="${c.id}" aria-label="Meet ${c.name}"><div class="portrait"><img src="${c.photo}" alt="${c.name}, ${c.coat.toLowerCase()} cat" loading="lazy"><span class="card-plus" aria-hidden="true">+</span></div><h3>${c.name}</h3><p>${c.formal}</p><div class="card-meta"><span>${age(c.born)} old</span><span>${r[c.id].toFixed(1)} lb</span></div></button>`}).join('');document.querySelectorAll('[data-cat]').forEach(b=>b.onclick=()=>profile(b.dataset.cat));}
function profile(id){
 const c=cats.find(c=>c.id===id),r=latest(c);
 $('profile-content').innerHTML=`<div class="profile-shell"><div class="profile-header"><img src="${c.photo}" alt="${c.name}"><div><span class="eyebrow">MEET THE CLOWDER</span><h2 id="profile-title">${c.name}</h2><p>${c.formal}</p></div></div><div class="profile-tabs" role="tablist" aria-label="${c.name}’s profile">${['Bio','Weight','DNA'].map((v,i)=>`<button role="tab" id="profile-tab-${v}" aria-controls="profile-panel" aria-selected="${i===0}" tabindex="${i===0?0:-1}" data-view="${v}">${v}</button>`).join('')}</div><div id="profile-panel" role="tabpanel" tabindex="0"></div></div>`;
 const tabs=[...$('profile-content').querySelectorAll('[data-view]')];
 function show(view){
  tabs.forEach(t=>{t.setAttribute('aria-selected',String(t.dataset.view===view));t.tabIndex=t.dataset.view===view?0:-1});
  $('profile-panel').setAttribute('aria-labelledby','profile-tab-'+view);
  if(view==='Bio')$('profile-panel').innerHTML=`<dl class="profile-facts"><div class="fact-wide"><dt>Also answers to (sometimes)</dt><dd>${c.nicknames}</dd></div><div><dt>Birthday · ${age(c.born)} old</dt><dd>${fmt(c.born)}</dd></div><div><dt>Born in</dt><dd>${c.place}</dd></div><div><dt>Coat & breed</dt><dd>${c.coat} · ${c.breed}</dd></div><div><dt>Latest weigh-in · ${fmt(r.date)}</dt><dd>${r[c.id].toFixed(1)} lb</dd></div></dl>`;
  if(view==='Weight'){
   $('profile-panel').innerHTML=`<div class="chart-toolbar"><div><h3>${c.name}’s growth</h3><p>Latest: ${r[c.id]} lb · ${fmt(r.date)}</p></div><label>Compare by <select id="profile-axis"><option value="age">Age in months</option><option value="date">Calendar date</option></select></label></div><svg class="growth-chart" id="profile-chart" viewBox="0 0 1000 390" role="img" aria-label="${c.name}’s smoothed weight history"></svg><p class="small muted">Dotted line: latest recorded weight. Solid curve: GAM smooth. Dashed line connects the birthday reference at 0 lb to the fitted curve.</p>`;
   const draw=()=>$('profile-chart').innerHTML=growthSVG([c],$('profile-axis').value==='age');draw();$('profile-axis').onchange=draw;
  }
  if(view==='DNA')$('profile-panel').innerHTML=`<h3>${c.name}’s ancestry</h3>${Object.entries(dna.groups).map(([g,v],i)=>`<div class="dna-row"><div><span>${g}</span><strong>${v[id].toFixed(2)}%</strong></div><div class="bar"><span style="width:${v[id]}%;background:${groupColors[i]}"></span></div></div>`).join('')}<details><summary>Individual breed estimates</summary><div class="breed-list">${Object.entries(dna.breeds).filter(([g,v])=>v[id]>0).sort((a,b)=>b[1][id]-a[1][id]).map(([g,v])=>`<div class="breed-item"><span>${g}</span><strong>${v[id].toFixed(2)}%</strong></div>`).join('')}</div></details>`;
 }
 tabs.forEach((t,i)=>{t.onclick=()=>show(t.dataset.view);t.onkeydown=e=>{let j;if(e.key==='ArrowRight')j=(i+1)%tabs.length;if(e.key==='ArrowLeft')j=(i+tabs.length-1)%tabs.length;if(e.key==='Home')j=0;if(e.key==='End')j=tabs.length-1;if(j!==undefined){e.preventDefault();tabs[j].focus();show(tabs[j].dataset.view)}}});
 show('Bio');$('profile').showModal();
}
$('profile').querySelector('.close').onclick=()=>$('profile').close();$('profile').onclick=e=>{if(e.target===$('profile')){let r=$('profile').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$('profile').close()}};
function selectors(){$('selectors').innerHTML=cats.map(c=>`<button class="chip" style="--cat-color:${c.color}" aria-pressed="${selected.has(c.id)}" data-toggle="${c.id}"><i></i>${c.name}</button>`).join('')+`<button class="chip" id="all-cats">${selected.size===10?'Clear selection':'Show all'}</button>`;document.querySelectorAll('[data-toggle]').forEach(b=>b.onclick=()=>{selected.has(b.dataset.toggle)?selected.delete(b.dataset.toggle):selected.add(b.dataset.toggle);selectors();chart()});$('all-cats').onclick=()=>{selected=new Set(selected.size===10?[]:cats.map(c=>c.id));selectors();chart()};}
function growthSVG(cs,byAge){
 const left=53,right=974,top=20,bottom=330;
 const min=byAge?0:Math.min(...cats.map(c=>+date(c.born)));
 const max=byAge?Math.ceil(Math.max(...cats.map(c=>months(latest(c).date,c.born)))/12)*12:+date(weights.at(-1).date);
 const x=v=>left+(v-min)/(max-min)*(right-left),y=v=>bottom-v/20*(bottom-top);
 let svg='';for(let w=0;w<=20;w+=5)svg+=`<line x1="${left}" x2="${right}" y1="${y(w)}" y2="${y(w)}" stroke="#e5e9e3"/><text x="${left-12}" y="${y(w)+5}" text-anchor="end">${w}</text>`;
 svg+='<text x="13" y="15">lb</text>';
 if(byAge){for(let m=0;m<=max;m+=12)svg+=`<text x="${x(m)}" y="359" text-anchor="middle">${m}</text>`}
 else{for(let yr=new Date(min).getUTCFullYear()+1;yr<=new Date(max).getUTCFullYear();yr++)svg+=`<text x="${x(+date(yr+'-01-01'))}" y="359" text-anchor="middle">${yr}</text>`}
 svg+=`<text x="510" y="387" text-anchor="middle">${byAge?'Age in months':'Calendar date'}</text>`;
 for(const c of cs){
  const current=latest(c),currentY=y(current[c.id]);
  svg+=`<line class="current-weight" x1="${left}" x2="${right}" y1="${currentY}" y2="${currentY}" stroke="${c.color}" stroke-width="1.7" stroke-dasharray="1 6" stroke-linecap="round" opacity=".7"><title>${c.name}: latest recorded weight ${current[c.id]} lb · ${fmt(current.date)}</title></line>`;
  if(cs.length===1)svg+=`<text x="${right-6}" y="${currentY-9}" text-anchor="end" style="fill:${c.color};paint-order:stroke;stroke:white;stroke-width:4px;stroke-linejoin:round">Latest: ${current[c.id]} lb</text>`;
  const points=smoothWeights[c.id].map(r=>({x:x(byAge?months(r.date,c.born):+date(r.date)),y:y(r.weight)}));
  const bx=x(byAge?0:+date(c.born));
  svg+=`<line x1="${bx}" y1="${y(0)}" x2="${points[0].x}" y2="${points[0].y}" stroke="${c.color}" stroke-width="2" stroke-dasharray="6 6" opacity=".65"><title>${c.name}: birthday reference, not measured</title></line><circle cx="${bx}" cy="${y(0)}" r="3" fill="${c.color}"><title>${c.name}: 0 lb birthday reference</title></circle><polyline points="${points.map(p=>p.x+','+p.y).join(' ')}" stroke="${c.color}" stroke-width="3" fill="none" stroke-linejoin="round"><title>${c.name}: GAM weight trend</title></polyline>`;
 }
 if(!cs.length)svg+='<text x="510" y="170" text-anchor="middle">Choose a cat above to show her weight history.</text>';
 return svg;
}
function chart(){
 const byAge=$('axis').value==='age',cs=cats.filter(c=>selected.has(c.id));
 $('chart').innerHTML=growthSVG(cs,byAge);
 $('chart').setAttribute('aria-label',`Smoothed weight in pounds by ${byAge?'age in months':'calendar date'} for ${cs.map(c=>c.name).join(', ')||'no selected cats'}. Recorded values are in the measurements table.`);
 $('weight-table').innerHTML=`<table><caption>Recorded weights (lb) · blank measurements shown as —</caption><thead><tr><th scope="col">Date</th>${cs.map(c=>`<th scope="col">${c.name}</th>`).join('')}</tr></thead><tbody>${weights.slice().reverse().filter(r=>cs.some(c=>r[c.id]!==undefined)).map(r=>`<tr><th scope="row">${fmt(r.date)}</th>${cs.map(c=>`<td>${r[c.id]??'—'}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}
const groupColors=['#307564','#bd9638','#9975a4','#d77850','#799caf'];
function ancestryExtremes(values){
 return `<table class="ancestry-table"><thead><tr><th scope="col">Ancestry</th><th scope="col">Highest</th><th scope="col">Lowest</th></tr></thead><tbody>${Object.entries(values).map(([group,shares],i)=>{
  const hi=Math.max(...Object.values(shares)),lo=Math.min(...Object.values(shares));
  const cell=value=>`<strong>${value.toFixed(2)}%</strong><span>${cats.filter(c=>shares[c.id]===value).map(c=>c.name).join(', ')}</span>`;
  return `<tr><th scope="row"><i style="background:${groupColors[i%groupColors.length]}"></i>${group}</th><td>${cell(hi)}</td><td>${cell(lo)}</td></tr>`;
 }).join('')}</tbody></table>`;
}
function drawComparisons(){$('dna-extremes').innerHTML=ancestryExtremes(dna.groups);$('breed-extremes').innerHTML=ancestryExtremes(dna.breeds)}
function drawDNA(){const id=$('dna-cat').value,c=cats.find(c=>c.id===id);$('dna-title').textContent=c.name+'’s ancestry';$('dna-photo').src=c.photo;$('dna-photo').alt=c.name;$('dna-bars').innerHTML=Object.entries(dna.groups).map(([g,v],i)=>`<div class="dna-row"><div><span>${g}</span><strong>${v[id].toFixed(2)}%</strong></div><div class="bar"><span style="width:${v[id]}%;background:${groupColors[i]}"></span></div></div>`).join('');$('breed-list').innerHTML=Object.entries(dna.breeds).filter(([g,v])=>v[id]>0).sort((a,b)=>b[1][id]-a[1][id]).map(([g,v])=>`<div class="breed-item"><span>${g}</span><strong>${v[id].toFixed(2)}%</strong></div>`).join('');$('dna-report').innerHTML=['Cate','Josie','Peach','Ellie','Abbie','Jackie'].includes(id)?`<a href="https://aaron-nielsen.github.io/dna/${id.toLowerCase()}_dna.pdf" target="_blank" rel="noopener">Open ${c.name}’s original DNA report ↗</a>`:'';}
Promise.all([fetch('smooth-weights.json').then(r=>{if(!r.ok)throw Error();return r.json()}),fetch('weights.json').then(r=>{if(!r.ok)throw Error();return r.json()}),fetch('dna.json').then(r=>{if(!r.ok)throw Error();return r.json()})]).then(([smooth,w,d])=>{weights=w;smoothWeights=smooth;dna=d;cards();selectors();chart();$('dna-cat').innerHTML=cats.map(c=>`<option value="${c.id}">${c.name}</option>`).join('');drawDNA();drawComparisons();$('axis').onchange=chart;$('dna-cat').onchange=drawDNA;$('dna-cat').oninput=drawDNA}).catch(()=>{$('cat-grid').innerHTML='<p>The cat data couldn’t load. Please refresh the page, or visit <a href="https://aaron-nielsen.github.io/cats.html">the original album</a>.</p>'});
