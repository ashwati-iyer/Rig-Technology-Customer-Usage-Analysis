/* ============ ROUTER + INTERACTIONS ============ */
const PAGES={overview:pageOverview,manufacture:pageMan,installed:pageIns,repair:pageRep,spares:pageSpa,findings:pageFind};
const emptyState=()=>`<section><h1>No rigs match this selection</h1><p class="sub">There are no NOV-equipped rigs for ${scopeText()}. Choose another region or rig type above.</p></section>`;
let lastPage=null;
function render(){
  const id=(location.hash||'#overview').slice(1);S.page=PAGES[id]?id:'overview';
  renderChrome();
  const A=scope();
  $('#main').innerHTML=A.rigs.length?PAGES[S.page]():emptyState();
  if(lastPage!==S.page){window.scrollTo(0,0);lastPage=S.page;}
}
function refreshTable(id){const el=$('#tb-'+id);if(el&&TB[id])el.innerHTML=TB[id]();}
const ACT={
  sort(d,t){const cur=S.sort[d.t]||{};S.sort[d.t]={k:d.k,d:cur.k===d.k?-cur.d:(t.classList.contains('r')?-1:1)};refreshTable(d.t);},
  more(d){S.open['lim_'+d.t]=+d.n;refreshTable(d.t);},
  toggle(d){const k=d.key;S.open[k]=S.open[k]===d.id?null:d.id;if(k==='cust')S.open.rig=null;
    if(d.t==='cust'&&k==='cust'&&S.open.cust){} refreshTable(d.t);},
  ofilter(d){S.oFilter=d.v;S.open.order=null;render();},
  fam(d){S.fam=d.id;render();},
  goFam(d){S.fam=d.id;location.hash='spares';},
  resetScen(){S.scen={util:0,defer:0,price:0};render();}
};
document.addEventListener('click',e=>{
  const g=e.target.closest('[data-go]');if(g){if(location.hash==='#'+g.dataset.go)render();else location.hash=g.dataset.go;return;}
  const a=e.target.closest('[data-act]');if(a&&ACT[a.dataset.act])ACT[a.dataset.act](a.dataset,a);
});
document.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches&&e.target.matches('.plate')){e.preventDefault();location.hash=e.target.dataset.go;}});
document.addEventListener('change',e=>{const f=e.target.dataset&&e.target.dataset.f;if(f){S[f]=e.target.value;S.open={};render();}});
document.addEventListener('input',e=>{
  const t=e.target;
  if(t.dataset&&t.dataset.q){S.q[t.dataset.q]=t.value;S.open['lim_'+t.dataset.q]=null;refreshTable(t.dataset.q);}
  if(t.dataset&&t.dataset.s){const k=t.dataset.s;S.scen[k]=+t.value/100;const o=$('#o-'+k);if(o)o.textContent=fmtS(k,S.scen[k]);
    clearTimeout(ACT._t);ACT._t=setTimeout(()=>{const d=$('#spaDyn');if(d)d.innerHTML=spaDyn();},30);}
});
/* tooltip */
const tipEl=$('#tip');
function moveTip(e){const t=e.target.closest&&e.target.closest('[data-tip]');
  if(!t){tipEl.classList.remove('on');return;}
  tipEl.innerHTML=t.getAttribute('data-tip');tipEl.classList.add('on');
  const r=tipEl.getBoundingClientRect(),x=Math.min(window.innerWidth-r.width-8,e.clientX+14),y=e.clientY+16+r.height>window.innerHeight?e.clientY-r.height-12:e.clientY+16;
  tipEl.style.left=Math.max(6,x)+'px';tipEl.style.top=Math.max(6,y)+'px';}
document.addEventListener('pointermove',moveTip);document.addEventListener('pointerdown',moveTip);
document.addEventListener('pointerleave',()=>tipEl.classList.remove('on'));
document.addEventListener('scroll',()=>tipEl.classList.remove('on'),{passive:true});
window.addEventListener('hashchange',render);
let rz;window.addEventListener('resize',()=>{clearTimeout(rz);rz=setTimeout(render,180);});
render();
