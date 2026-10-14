/* ============ UI HELPERS + CHARTS ============ */
const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const fm=v=>'$'+(v/1e6).toFixed(Math.abs(v)>=1e8?0:1)+'M';
const fb=v=>'$'+(v/1e9).toFixed(2)+'B';
const fk=v=>Math.abs(v)>=1e6?'$'+(v/1e6).toFixed(1)+'M':Math.abs(v)>=1e3?'$'+(v/1e3).toFixed(0)+'K':'$'+Math.round(v);
const pct=(v,d=0)=>(v*100).toFixed(d)+'%';
const sgn=(v,d=1)=>(v>=0?'+':'−')+Math.abs(v*100).toFixed(d)+'%';
const num=v=>Math.round(v).toLocaleString('en-US');
const q1=v=>v>=10?num(v):(Math.round(v*10)/10).toString();
const FC_={TD:'var(--s1)'};
function wid(n=1){const m=$('#main'),w=m?m.clientWidth:900;if(window.innerWidth<=900||n===1)return Math.max(280,Math.floor(w));return Math.max(280,Math.floor((w-28*(n-1))/n));}

function ticks(mn,mx,n=4){if(mx<=mn)mx=mn+1;const raw=(mx-mn)/n,p=Math.pow(10,Math.floor(Math.log10(raw))),f=raw/p,st=(f<=1?1:f<=2?2:f<=2.5?2.5:f<=5?5:10)*p;
  const a=Math.floor(mn/st+1e-9)*st,b=Math.ceil(mx/st-1e-9)*st,t=[];for(let v=a;v<=b+st/2;v+=st)t.push(+v.toFixed(10));return t;}

function lineChart(o){
  const w=o.w,h=o.h||260,M={l:o.yw||46,r:10,t:10,b:24},iw=w-M.l-M.r,ih=h-M.t-M.b,n=o.x.length;
  let mx=-1e18,mn=o.ymin!=null?o.ymin:1e18;
  o.series.forEach(s=>s.data.forEach(v=>{if(v!=null){mx=Math.max(mx,v);if(o.ymin==null)mn=Math.min(mn,v);}}));
  if(o.band){o.band.hi.forEach(v=>{if(v!=null)mx=Math.max(mx,v)});if(o.ymin==null)o.band.lo.forEach(v=>{if(v!=null)mn=Math.min(mn,v)});}
  if(o.ymax!=null)mx=o.ymax;
  const T=ticks(mn,mx,4),t0=T[0],t1=T[T.length-1];
  const X=i=>M.l+iw*(n>1?i/(n-1):.5),Y=v=>M.t+ih*(1-(v-t0)/((t1-t0)||1));
  const yf=o.yfmt||(v=>v),tf=o.tfmt||yf;
  let g='';
  T.forEach(t=>g+=`<line class="gl" x1="${M.l}" x2="${w-M.r}" y1="${Y(t)}" y2="${Y(t)}"/><text class="ax" x="${M.l-6}" y="${Y(t)+4}" text-anchor="end">${yf(t)}</text>`);
  const ev=o.xevery||Math.ceil(n/(w<500?4:8));
  o.x.forEach((l,i)=>{if(i%ev===0)g+=`<text class="ax" x="${X(i)}" y="${h-6}" text-anchor="middle">${l}</text>`});
  if(o.fi!=null)g+=`<rect class="fcz" x="${X(o.fi-.5)}" y="${M.t}" width="${w-M.r-X(o.fi-.5)}" height="${ih}"/><text class="ax fct" x="${X(o.fi-.5)+6}" y="${M.t+12}">Forecast</text>`;
  if(o.band){let up='',dn='';for(let i=0;i<n;i++){if(o.band.hi[i]!=null){up+=`${up?'L':'M'}${X(i).toFixed(1)},${Y(o.band.hi[i]).toFixed(1)}`;dn=`L${X(i).toFixed(1)},${Y(o.band.lo[i]).toFixed(1)}`+dn;}}
    g+=`<path d="${up}${dn}Z" style="fill:${o.band.color};opacity:.2"/>`;}
  o.series.forEach(s=>{let d='',first=null,last=null;
    s.data.forEach((v,i)=>{if(v==null)return;d+=`${d&&s.data[i-1]!=null?'L':'M'}${X(i).toFixed(1)},${Y(v).toFixed(1)}`;if(first==null)first=i;last=i;});
    if(s.area&&first!=null)g+=`<path d="${d}L${X(last)},${Y(t0)}L${X(first)},${Y(t0)}Z" style="fill:${s.color};opacity:.13"/>`;
    g+=`<path d="${d}" fill="none" style="stroke:${s.color}" stroke-width="${s.width||2}" ${s.dash?`stroke-dasharray="${s.dash}"`:''} stroke-linejoin="round" stroke-linecap="round"/>`;});
  const bw=iw/Math.max(1,n);
  for(let i=0;i<n;i++){let tip=`<b>${o.x[i]}</b>`;
    o.series.forEach(s=>{if(s.data[i]!=null&&!s.notip)tip+=`<br><span class="dot" style="background:${s.color}"></span>${esc(s.name)}: <b>${tf(s.data[i])}</b>`});
    if(o.band&&o.band.hi[i]!=null)tip+=`<br>80% range: ${tf(o.band.lo[i])} to ${tf(o.band.hi[i])}`;
    g+=`<rect class="hit" x="${(X(i)-bw/2).toFixed(1)}" y="${M.t}" width="${bw.toFixed(1)}" height="${ih}" data-tip="${esc(tip)}"/>`;}
  return `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${esc(o.label||'Line chart')}">${g}</svg>`;
}

function stackCols(o){
  const w=o.w,h=o.h||240,M={l:o.yw||46,r:8,t:8,b:o.xb||24},iw=w-M.l-M.r,ih=h-M.t-M.b,n=o.x.length;
  const tot=o.x.map((_,i)=>o.stacks.reduce((a,s)=>a+(s.data[i]||0),0));
  const T=ticks(0,o.max||Math.max(...tot,1e-9),4),t1=T[T.length-1],Y=v=>M.t+ih*(1-v/t1),bw=iw/n,cw=Math.max(2,bw*(o.gap!=null?o.gap:.74));
  const yf=o.yfmt||(v=>v),tf=o.tfmt||yf;let g='';
  T.forEach(t=>g+=`<line class="gl" x1="${M.l}" x2="${w-M.r}" y1="${Y(t)}" y2="${Y(t)}"/><text class="ax" x="${M.l-6}" y="${Y(t)+4}" text-anchor="end">${yf(t)}</text>`);
  const ev=o.xevery||Math.ceil(n/(w<500?5:10));
  for(let i=0;i<n;i++){const x=M.l+bw*i+(bw-cw)/2;let acc=0,tip=`<b>${o.x[i]}</b>`;
    o.stacks.forEach(s=>{const v=s.data[i]||0;if(v<=0)return;g+=`<rect x="${x.toFixed(1)}" y="${Y(acc+v).toFixed(1)}" width="${cw.toFixed(1)}" height="${Math.max(0,Y(acc)-Y(acc+v)).toFixed(1)}" style="fill:${s.color}"/>`;acc+=v;tip+=`<br><span class="dot" style="background:${s.color}"></span>${esc(s.name)}: <b>${tf(v)}</b>`;});
    if(o.stacks.length>1)tip+=`<br>Total: <b>${tf(acc)}</b>`;
    if(i%ev===0||o.xall)g+=`<text class="ax" x="${M.l+bw*i+bw/2}" y="${h-6}" text-anchor="middle">${o.x[i]}</text>`;
    g+=`<rect class="hit" x="${M.l+bw*i}" y="${M.t}" width="${bw}" height="${ih}" data-tip="${esc(tip)}"/>`;}
  return `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${esc(o.label||'Column chart')}">${g}</svg>`;
}

function barH(rows,o={}){
  const mx=o.max||Math.max(...rows.map(r=>r.v),1e-9);
  return `<div class="bars">`+rows.map(r=>`<div class="br ${o.pair?'pair':''}" ${r.attr||''}><div class="bl">${r.label}${r.sub?`<small>${r.sub}</small>`:''}</div><div class="bt"><i style="width:${Math.max(.6,Math.min(100,r.v/mx*100))}%;background:${r.color||o.color||'var(--ink)'}"></i></div><div class="bv">${r.text}${r.sub2?`<small>${r.sub2}</small>`:''}</div></div>`).join('')+`</div>`;
}
function pairBars(rows,c1,c2,mx){
  return `<div class="bars">`+rows.map(r=>`<div class="br pair"><div class="bl">${r.label}</div><div><div class="bt"><i style="width:${Math.max(.6,r.a/mx*100)}%;background:${c1}"></i></div><div class="bt"><i style="width:${Math.max(.6,r.b/mx*100)}%;background:${c2}"></i></div></div><div class="bv">${pct(r.a)}<small>${pct(r.b)}</small></div></div>`).join('')+`</div>`;
}
function heat(rowsL,colsL,val,color,fmt,mx){
  let h=`<div class="heat" style="grid-template-columns:minmax(110px,1.5fr) repeat(${colsL.length},minmax(0,1fr))"><div class="hh"></div>`+colsL.map(c=>`<div class="hh">${c}</div>`).join('');
  rowsL.forEach((r,i)=>{h+=`<div class="hl">${r}</div>`;colsL.forEach((c,j)=>{const v=val(i,j);
    h+=v==null?`<div style="background:var(--shade);color:var(--mute)">no data</div>`:`<div style="background:color-mix(in srgb,${color} ${Math.round(Math.min(1,Math.max(0,v/mx))*78+6)}%,transparent)" data-tip="${esc(r+' / '+c+': '+fmt(v))}">${fmt(v)}</div>`;});});
  return h+`</div>`;
}
function scatter(o){
  const w=o.w,h=o.h||280,M={l:50,r:14,t:12,b:36},iw=w-M.l-M.r,ih=h-M.t-M.b;
  const xs=o.pts.map(p=>p.x),ys=o.pts.map(p=>p.y);
  const Tx=ticks(o.xmin!=null?o.xmin:Math.min(...xs),Math.max(...xs),5),Ty=ticks(o.ymin!=null?o.ymin:Math.min(...ys),Math.max(...ys),4);
  const X=v=>M.l+iw*(v-Tx[0])/((Tx[Tx.length-1]-Tx[0])||1),Y=v=>M.t+ih*(1-(v-Ty[0])/((Ty[Ty.length-1]-Ty[0])||1));
  let g='';
  Ty.forEach(t=>g+=`<line class="gl" x1="${M.l}" x2="${w-M.r}" y1="${Y(t)}" y2="${Y(t)}"/><text class="ax" x="${M.l-6}" y="${Y(t)+4}" text-anchor="end">${o.yfmt?o.yfmt(t):t}</text>`);
  Tx.forEach(t=>g+=`<text class="ax" x="${X(t)}" y="${h-18}" text-anchor="middle">${o.xfmt?o.xfmt(t):t}</text>`);
  g+=`<text class="ax" x="${M.l+iw/2}" y="${h-3}" text-anchor="middle">${o.xl||''}</text>`;
  o.pts.forEach(p=>{g+=`<circle cx="${X(p.x).toFixed(1)}" cy="${Y(p.y).toFixed(1)}" r="${p.r||6}" style="fill:${p.color};fill-opacity:.62;stroke:${p.color}" stroke-width="1.5" data-tip="${esc(p.tip||'')}" ${p.attr||''}/>`;
    if(p.label)g+=`<text class="ax" x="${X(p.x)+(p.r||6)+3}" y="${Y(p.y)+4}">${p.label}</text>`;});
  return `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${esc(o.label||'Scatter chart')}">${g}</svg>`;
}
function spark(d,color,w=150,h=34){
  const v=d.filter(x=>x!=null);if(v.length<2)return'';const mn=Math.min(...v),mx=Math.max(...v),X=i=>2+(w-4)*i/(d.length-1),Y=x=>h-3-(h-8)*(x-mn)/((mx-mn)||1);
  let p='';d.forEach((x,i)=>{p+=(i?'L':'M')+X(i).toFixed(1)+','+Y(x).toFixed(1)});
  return `<svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" preserveAspectRatio="none" aria-hidden="true"><path d="${p}L${X(d.length-1)},${h}L2,${h}Z" style="fill:${color};opacity:.14"/><path d="${p}" fill="none" style="stroke:${color}" stroke-width="2" vector-effect="non-scaling-stroke"/><circle cx="${X(d.length-1)}" cy="${Y(d[d.length-1])}" r="3" style="fill:${color}"/></svg>`;
}
const legend=items=>`<div class="leg">`+items.map(i=>`<span class="${i.ln?'ln':''}" style="--c:${i.c}">${i.n}</span>`).join('')+`</div>`;

/* table builder: registry-based so only the table refreshes */
const TB={};
function table(id,cols,rows,o={}){
  const so=S.sort[id]||{k:o.sk,d:o.sd||-1};
  if(so.k){const c=cols.find(c=>c.k===so.k);if(c)rows=rows.slice().sort((a,b)=>{const x=c.sv?c.sv(a):a[so.k],y=c.sv?c.sv(b):b[so.k];return(x>y?1:x<y?-1:0)*so.d;});}
  const q=(S.q[id]||'').toLowerCase().trim();
  if(q&&o.search)rows=rows.filter(r=>o.search(r).toLowerCase().includes(q));
  const total=rows.length,lim=S.open['lim_'+id]||o.limit||12;
  let h=`<div class="tw"><table class="tbl"><thead><tr>${cols.map(c=>`<th class="${c.al||''}" data-act="sort" data-t="${id}" data-k="${c.k}" aria-sort="${so.k===c.k?(so.d>0?'ascending':'descending'):'none'}">${c.l}${so.k===c.k?(so.d>0?' ▲':' ▼'):''}</th>`).join('')}</tr></thead><tbody>`;
  rows.slice(0,lim).forEach(r=>{h+=`<tr class="${o.rowCls?o.rowCls(r):''}" ${o.rowAttr?o.rowAttr(r):''}>${cols.map(c=>`<td class="${c.al||''}">${c.f?c.f(r):esc(r[c.k])}</td>`).join('')}</tr>`;
    if(o.expand){const e=o.expand(r);if(e)h+=`<tr class="xr"><td colspan="${cols.length}">${e}</td></tr>`;}});
  if(!total)h+=`<tr><td colspan="${cols.length}" class="mute">No rows match. Clear the search or change the filters above.</td></tr>`;
  h+=`</tbody></table></div>`;
  if(total>lim)h+=`<button class="more" data-act="more" data-t="${id}" data-n="${lim+15}">Show more (${total-lim} remaining)</button>`;
  return h;
}
const tbox=id=>`<div id="tb-${id}">${TB[id]()}</div>`;
const tsearch=(id,ph)=>`<input type="search" placeholder="${ph}" value="${esc(S.q[id]||'')}" data-q="${id}" aria-label="${ph}">`;
