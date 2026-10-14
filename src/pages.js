/* ============ SHARED METRICS ============ */
const PG=[
 {id:'overview',n:'Overview',s:'For leadership',c:'var(--ink)'},
 {id:'manufacture',n:'Manufacture',s:'Orders, backlog, delivery',c:'var(--man)'},
 {id:'installed',n:'Sell and installed base',s:'Fleet, usage, wear',c:'var(--ins)'},
 {id:'repair',n:'Repair',s:'Failures, turnaround',c:'var(--rep)'},
 {id:'spares',n:'Spares',s:'Forecast and stock',c:'var(--spa)'},
 {id:'findings',n:'Findings',s:'Insights and next steps',c:'var(--ink)'}];
const scopeText=()=>`${S.region==='All'?'all regions':S.region}${S.rtype==='All'?', all rig types':', '+S.rtype.toLowerCase()+' rigs'}`;
const yM=v=>'$'+(Math.round(v*10)/10)+'M';
const tM=v=>'$'+v.toFixed(1)+'M';
const pc0=v=>Math.round(v*100)+'%';

function kpis(){
  const A=scope(),fc=getFc(NEUTRAL),bt=getBt();
  const wo=(a,b)=>A.wos.filter(w=>w.m>=a&&w.m<=b);
  const tatN=mean(wo(33,44).map(w=>w.tat)),tatP=mean(wo(21,32).map(w=>w.tat));
  const tatS=[];for(let m=11;m<NM;m++){const x=wo(m-2,m);tatS.push(x.length?mean(x.map(w=>w.tat)):(tatS[tatS.length-1]||0));}
  const am=(a,b)=>sum(A.sp,a,b)+sum(A.rep,a,b);
  const amS=[];for(let m=11;m<NM;m++)amS.push(am(m-11,m));
  const in12=sum(A.oin,33,44),out12=sum(A.oout,33,44);
  return {A,fc,bt,tatN,tatP,tatS,amN:am(33,44),amP:am(21,32),amS,
    util3:mean([A.util[42],A.util[43],A.util[44]]),utilP:mean([A.util[30],A.util[31],A.util[32]]),
    fcTot:fc.tot.reduce((a,b)=>a+b,0),spN:sum(A.sp,33,44),spP:sum(A.sp,21,32),b2b:out12?in12/out12:0,
    bl:A.bl[44],blP:A.bl[32],actN:A.act[44],actP:A.act[32]};
}
function bathData(){
  const A=scope(),B=[0,.25,.5,.75,9],res={},tot={f:Array(4).fill(0),h:Array(4).fill(0)};
  FAMS.forEach(f=>res[f.id]={f:Array(4).fill(0),h:Array(4).fill(0)});
  A.units.forEach(u=>{const f=FAM[u.fam],r=res[u.fam];for(let m=0;m<NM;m++){const x=(m===0?u.hs0:u.hs[m-1])/f.ovh;let b=0;while(b<3&&x>=B[b+1])b++;
    r.f[b]+=u.fail[m];r.h[b]+=u.hrs[m];tot.f[b]+=u.fail[m];tot.h[b]+=u.hrs[m];}});
  const idx=r=>{const sf=r.f.reduce((a,b)=>a+b,0),sh=r.h.reduce((a,b)=>a+b,0),avg=sh?sf/sh:0;return r.f.map((v,i)=>(r.h[i]>600&&avg)?(v/r.h[i])/avg:null);};
  const out={all:idx(tot),fam:{}};FAMS.forEach(f=>out.fam[f.id]=idx(res[f.id]));return out;
}
function overflowStats(){
  const A=scope(),w=A.wos.filter(x=>x.m>=21),ov=w.filter(x=>x.overflow),no=w.filter(x=>!x.overflow);
  return {share:w.length?ov.length/w.length:0,extra:ov.length&&no.length?mean(ov.map(x=>x.tat))-mean(no.map(x=>x.tat)):0,n:ov.length};
}
function insights(){
  const K=kpis(),A=K.A,fc=K.fc,bt=K.bt,out=[];
  const pk=fc.tot.indexOf(Math.max(...fc.tot)),tr=fc.tot.indexOf(Math.min(...fc.tot)),kitShare=K.fcTot?fc.kit.reduce((a,b)=>a+b,0)/K.fcTot:0;
  out.push({c:'var(--spa)',go:'spares',h:'Overhaul kits drive the next year of spares demand',
    t:`Kits make up ${pct(kitShare)} of the ${fm(K.fcTot)} forecast. Demand peaks in ${mLab(NOW+1+pk)} at ${fm(fc.tot[pk])}, ${pct(fc.tot[pk]/(fc.tot[tr]||1)-1)} above the lowest month (${mLab(NOW+1+tr)}). Long-lead parts have to be ordered ahead of that peak, not at it.`});
  const near=A.units.filter(u=>u.hs[NOW]/FAM[u.fam].ovh>=.8),byF={},byR={};
  near.forEach(u=>{byF[u.fam]=(byF[u.fam]||0)+1;byR[u.region]=(byR[u.region]||0)+1;});
  const tf=Object.entries(byF).sort((a,b)=>b[1]-a[1])[0],trg=Object.entries(byR).sort((a,b)=>b[1]-a[1])[0];
  out.push({c:'var(--ins)',go:'installed',h:'A large share of the installed base is close to overhaul',
    t:`${num(near.length)} units (${pct(near.length/Math.max(1,A.units.length))}) have used at least 80% of their overhaul interval. ${tf?`${FAM[tf[0]].name} account for the most (${tf[1]}), and ${trg[0]} holds the largest regional share (${trg[1]}).`:''} ${num(fc.next.size)} units are expected to cross their threshold within 12 months.`});
  const bd=bathData().all,lo=bd[0],hi=bd.slice(3).filter(v=>v!=null).pop(),ov=overflowStats();
  out.push({c:'var(--rep)',go:'repair',h:'Failures rise as units run past mid-life, and overflow routing adds days',
    t:`Units in their last quarter of the overhaul interval fail about ${hi&&lo?(hi/lo).toFixed(1):'several'}x as often as freshly overhauled ones. ${pct(ov.share)} of repairs were routed outside the home service centre, adding about ${Math.round(ov.extra)} days each.`});
  const sh12=A.orders.filter(x=>x.act>=33&&x.act<=44),shP=A.orders.filter(x=>x.act>=21&&x.act<=32);
  const ot=x=>x.length?x.filter(o=>o.slip<=1).length/x.length:0;
  out.push({c:'var(--man)',go:'manufacture',h:'Backlog is healthy and delivery reliability is improving',
    t:`Backlog stands at ${fb(K.bl)} (${sgn(K.blP?K.bl/K.blP-1:0)} on a year ago) with a book-to-bill of ${K.b2b.toFixed(2)}. ${pct(ot(sh12))} of shipments landed within a month of schedule, against ${pct(ot(shP))} the year before. Every shipped unit starts consuming wear parts on day one.`});
  out.push({c:'var(--spa)',go:'spares',h:'The hours-driven forecast beats a flat average',
    t:`In a six-month backtest the unit-level model missed by ${pct(bt.wape,1)} (weighted error by family and month), against ${pct(bt.base,1)} for a trailing 12-month average. The gap is widest on drawworks and top drives, where overhauls arrive in vintage waves.`});
  return out;
}

/* ============ CHROME ============ */
function renderChrome(){
  $('#rail').innerHTML=`<div class="brand">Rig lifecycle<small>Installed base and spares intelligence for NOV Rig Technologies</small></div>
  <nav class="track">${PG.map(p=>`<button class="nv" style="--c:${p.c}" data-go="${p.id}" ${S.page===p.id?'aria-current="page"':''}>${p.n}<small>${p.s}</small></button>`).join('')}</nav>
  <div class="railfoot">Illustrative data. Replace the generators with ERP, installed-base and rig-monitoring feeds.</div>`;
  const p=PG.find(x=>x.id===S.page);
  $('#top').innerHTML=`<div class="ttl">${p.n}<small>Actuals Jan 2023 to Sep 2026, forecast to Sep 2027</small></div>
  <div class="flt"><span class="badge">Illustrative data</span>
  <label>Region<select data-f="region">${['All',...REGIONS].map(r=>`<option ${S.region===r?'selected':''}>${r}</option>`).join('')}</select></label>
  <label>Rig type<select data-f="rtype">${['All',...RTYPES].map(r=>`<option ${S.rtype===r?'selected':''}>${r}</option>`).join('')}</select></label></div>`;
}
const pageHead=(i,title,sub,c)=>`<div class="bar-c" style="--c:${c}"></div><div class="ph" style="--c:${c}"><div><div class="idx">Contributor ${i} of 4</div><h1>${title}</h1></div><button class="btn" data-go="overview">Back to overview</button></div><p class="sub">${sub}</p>`;
const stats=(c,items)=>`<div class="stats" style="--c:${c}">${items.map(i=>`<div class="stat"><b>${i[0]}</b><span>${i[1]}</span></div>`).join('')}</div>`;
const sec=(h,p,body,extra='')=>`<section><div class="sh"><h2>${h}</h2>${p?`<p>${p}</p>`:''}</div>${extra}${body}</section>`;
const pcard=(h,cap,body)=>`<div class="pc"><h3>${h}</h3><div class="cap">${cap}</div>${body}</div>`;
const last=(n,arr)=>Array.from(arr).slice(NM-n);
const lab=n=>Array.from({length:n},(_,i)=>mLab(NM-n+i));

/* ============ OVERVIEW ============ */
function fanData(famId,scen){
  const A=scope(),bt=getBt(),F=getFc(scen),F0=getFc(NEUTRAL);
  const hist=famId==='All'?A.sp:A.famSp[famId],f=famId==='All'?F.tot:F.fam[famId],f0=famId==='All'?F0.tot:F0.fam[famId];
  const back=24,x=[],act=[],fore=[],lo=[],hi=[],base=[],tr=[],avg=sum(hist,33,44)/12;
  for(let i=0;i<back+HZ;i++){const m=NOW-back+1+i;x.push(mLab(m));tr.push(avg/1e6);
    if(i<back){act.push(hist[m]/1e6);fore.push(i===back-1?hist[m]/1e6:null);lo.push(null);hi.push(null);base.push(null);}
    else{const h=i-back,v=f[h]/1e6,rel=Math.max(.05,bt.mape)*1.28*(1+.08*h);act.push(null);fore.push(v);lo.push(v*(1-rel));hi.push(v*(1+rel));base.push(f0[h]/1e6);}}
  return {x,act,fore,lo,hi,base,tr,back};
}
function fanChart(w,famId,scen,h=300){
  const d=fanData(famId,scen),on=scen.util||scen.defer||scen.price;
  return legend([{n:'Actual',c:'var(--ink)',ln:1},{n:on?'Scenario forecast':'Forecast',c:'var(--spa)',ln:1},{n:'80% range',c:'var(--spa)'},...(on?[{n:'Base case',c:'var(--ink)',ln:1}]:[]),{n:'Trailing 12-month average',c:'var(--mute)',ln:1}])+
  lineChart({w,h,x:d.x,fi:d.back,ymin:0,yfmt:yM,tfmt:tM,label:'Monthly spares demand, actual and forecast',
    series:[{name:'Trailing 12-month average',color:'var(--mute)',data:d.tr,dash:'2 5',width:1.5},
      ...(on?[{name:'Base case',color:'var(--ink)',data:d.base,dash:'6 4',width:1.5}]:[]),
      {name:'Actual',color:'var(--ink)',data:d.act,width:2.2,area:true},{name:on?'Scenario forecast':'Forecast',color:'var(--spa)',data:d.fore,width:3}],
    band:{lo:d.lo,hi:d.hi,color:'var(--spa)'}});
}
function plate(k){
  return `<div class="plate" role="link" tabindex="0" style="--c:${k.c}" data-go="${k.go}" aria-label="${esc(k.name)}: ${esc(k.val+' '+(k.unit||''))}. Open ${k.tag} drill-down">
  <div class="pl-top"><span>${k.tag}</span><span class="pl-go">Open drill-down</span></div>
  <div class="pl-val">${k.val}<small>${k.unit||''}</small></div><div class="pl-name">${k.name}</div>
  <div class="pl-d ${k.good?'up':'dn'}">${k.delta}</div><div class="pl-sp">${k.sp}</div></div>`;
}
function pageOverview(){
  const K=kpis(),A=K.A,fc=K.fc,bt=K.bt;
  const top=FAMS.map(f=>({f,v:fc.fam[f.id].reduce((a,b)=>a+b,0)})).sort((a,b)=>b.v-a.v)[0],gro=K.spN?K.fcTot/K.spN-1:0;
  const dl=(v,good,txt)=>`<b>${txt}</b>`;
  const arrow=(v)=>v>=0?'▲':'▼';
  const P={
   man:{go:'manufacture',c:'var(--man)',tag:'Manufacture',val:(K.bl/1e9).toFixed(2),unit:'B USD',name:'Capital equipment backlog',good:K.bl>=K.blP,
     delta:`<b>${arrow(K.bl-K.blP)} ${sgn(K.blP?K.bl/K.blP-1:0)}</b> vs Sep 2025, book-to-bill ${K.b2b.toFixed(2)}`,sp:spark(Array.from(A.bl),'var(--man)')},
   act:{go:'installed',c:'var(--ins)',tag:'Installed base',val:num(K.actN),unit:'rigs',name:'Rigs drilling on NOV equipment',good:K.actN>=K.actP,
     delta:`<b>${arrow(K.actN-K.actP)} ${sgn(K.actP?K.actN/K.actP-1:0)}</b> vs Sep 2025, of ${num(A.rigs.length)} installed`,sp:spark(Array.from(A.act),'var(--ins)')},
   utl:{go:'installed',c:'var(--ins)',tag:'Installed base',val:Math.round(K.util3*100),unit:'%',name:'Fleet utilisation, 3-month average',good:K.util3>=K.utilP,
     delta:`<b>${arrow(K.util3-K.utilP)} ${Math.abs((K.util3-K.utilP)*100).toFixed(1)} pts</b> vs a year ago`,sp:spark(Array.from(A.util),'var(--ins)')},
   tat:{go:'repair',c:'var(--rep)',tag:'Repair',val:Math.round(K.tatN),unit:'days',name:'Repair turnaround, 12-month average',good:K.tatN<=K.tatP,
     delta:`<b>${arrow(K.tatP-K.tatN)} ${Math.abs(K.tatN-K.tatP).toFixed(1)} days</b> vs prior 12 months (lower is better)`,sp:spark(K.tatS,'var(--rep)')},
   am:{go:'spares',c:'var(--spa)',tag:'Spares',val:Math.round(K.amN/1e6),unit:'M USD',name:'Aftermarket revenue, last 12 months',good:K.amN>=K.amP,
     delta:`<b>${arrow(K.amN-K.amP)} ${sgn(K.amP?K.amN/K.amP-1:0)}</b> vs prior 12 months, spares plus repair`,sp:spark(K.amS,'var(--spa)')},
   acc:{go:'spares',c:'var(--spa)',tag:'Spares',val:Math.round((1-bt.wape)*100),unit:'%',name:'Spares forecast accuracy',good:bt.wape<=bt.base,
     delta:`<b>${arrow(bt.base-bt.wape)} ${((bt.base-bt.wape)*100).toFixed(1)} pts</b> better than a trailing average`,sp:spark(bt.fc.map((v,i)=>1-Math.abs(v-bt.actual[i])/(bt.actual[i]||1)),'var(--spa)')}};
  const shipped=A.orders.filter(o=>o.act>=21&&o.act<=44).length;
  const stage=(c,name,plates,note)=>`<div class="stage" style="--c:${c}"><div class="sg">${name}</div><p class="snote">${note}</p><div class="plates">${plates.map(plate).join('')}</div></div>`;
  const chain=`<div class="chain">
   ${stage('var(--man)','Manufacture',[P.man],`${shipped} orders shipped in the last 24 months. Each one joins the installed base and starts consuming wear parts on day one.`)}
   ${stage('var(--ins)','Sell and install',[P.act,P.utl],'Hours on the rig decide how fast parts wear and when overhauls fall due, so usage is the main driver of demand.')}
   ${stage('var(--rep)','Repair',[P.tat],'Every repair pulls parts and shows which units are wearing out early. Faster turnaround keeps customers drilling.')}
   ${stage('var(--spa)','Spares',[P.am,P.acc],'The forecast is built per unit: wear parts by operating hours, overhaul kits by remaining life, failure parts by risk.')}</div>`;
  const W=wid(1),split=window.innerWidth<=900?W:Math.floor((W-28)*.63),wr=window.innerWidth<=900?W:W-28-split;
  const famRows=FAMS.map(f=>({f,v:fc.fam[f.id].reduce((a,b)=>a+b,0),p:sum(A.famSp[f.id],33,44)})).sort((a,b)=>b.v-a.v).map(r=>({label:r.f.name,v:r.v,text:fm(r.v),sub2:sgn(r.p?r.v/r.p-1:0)+' on last 12',color:'var(--spa)',attr:`data-act="goFam" data-id="${r.f.id}" title="Open ${r.f.name} in the spares drill-down"`}));
  const ins=insights().slice(0,3).map((i,n)=>`<div class="fi" style="--c:${i.c}"><span class="n">${n+1}</span><div><b class="h">${i.h}</b><p>${i.t}</p></div><button class="lnk" data-go="${i.go}">See the detail</button></div>`).join('');
  return `<section class="hero"><h1>Spares demand is forecast at ${fm(K.fcTot)} over the next 12 months, ${gro>=0?'up':'down'} ${Math.abs(gro*100).toFixed(1)}% on the last 12, led by ${top.f.name.toLowerCase()}.</h1>
  <p class="sub">Based on ${num(A.rigs.length)} rigs and ${num(A.units.length)} equipment units in ${scopeText()}. Each plate below belongs to one stage of the rig lifecycle. Select a plate to open that stage at full detail.</p>${chain}</section>
  <section><div class="sh"><h2>Spares demand, actual and forecast</h2><p>Monthly demand for parts across the installed base, with the 80% range around the forecast. Select a family on the right to open it in the spares drill-down.</p></div>
  <div class="split"><div>${fanChart(split,'All',NEUTRAL,300)}</div><div class="pc"><h3>Next 12 months by equipment family</h3><div class="cap">Forecast spares demand and change against the last 12 months.</div>${barH(famRows,{color:'var(--spa)'})}</div></div></section>
  <section><div class="sh"><h2>Three signals worth a decision</h2><p>Computed from the current filters. The Findings page carries the full set with owners and next steps.</p></div><div class="find">${ins}</div></section>`;
}

/* ============ MANUFACTURE ============ */
function pageMan(){
  const K=kpis(),A=K.A,o=A.orders,c='var(--man)';
  const sh12=o.filter(x=>x.act>=33&&x.act<=44),shP=o.filter(x=>x.act>=21&&x.act<=32),ot=x=>x.length?x.filter(q=>q.slip<=1).length/x.length:0;
  const open=o.filter(x=>!x.delivered),slip=mean(sh12.map(x=>x.slip)),slipP=mean(shP.map(x=>x.slip));
  const W=wid(1),n=36,w2=wid(2),x36=lab(n);
  const stk=GRPS.map((g,i)=>({name:g,color:`var(--s${i+1})`,data:last(n,A.blG[g]).map(v=>v/1e6)}));
  const line=lineChart({w:w2,h:250,x:x36,ymin:0,yfmt:v=>'$'+v+'M',tfmt:tM,label:'Order intake and shipments',
    series:[{name:'Orders booked',color:'var(--man)',width:2.4,data:last(n,A.oin).map((v,i,a)=>mean(a.slice(Math.max(0,i-5),i+1))/1e6)},
            {name:'Shipments',color:'var(--ink)',width:2.4,dash:'6 4',data:last(n,A.oout).map((v,i,a)=>mean(a.slice(Math.max(0,i-5),i+1))/1e6)}]});
  const hm=heat(GRPS,PLANTS,(i,j)=>{const x=o.filter(q=>q.act>=21&&q.act<=44&&q.grp===GRPS[i]&&q.plant===PLANTS[j]);return x.length>=2?mean(x.map(q=>q.slip)):null},'var(--rep)',v=>v.toFixed(1)+' mo',4);
  const filt=()=>S.oFilter==='All'?o:S.oFilter==='Open'?open:o.filter(x=>x.delivered);
  TB.orders=()=>table('orders',[
    {k:'id',l:'Order'},{k:'cust',l:'Customer',f:r=>CUST[r.cust].name,sv:r=>CUST[r.cust].name},
    {k:'prod',l:'Product',f:r=>`${PROD[r.prod].name}<small>${r.type} rigs</small>`,sv:r=>PROD[r.prod].name},{k:'plant',l:'Plant'},{k:'region',l:'Region'},
    {k:'val',l:'Value',al:'r',f:r=>fm(r.val)},{k:'sched',l:'Scheduled',f:r=>mLab(r.sched)},
    {k:'act',l:'Delivery',f:r=>mLab(r.act)+(r.delivered?'':'<small>estimate</small>')},
    {k:'slip',l:'Slip',al:'r',f:r=>(r.slip>0?'+':'')+r.slip+' mo'},{k:'stage',l:'Stage'}],filt(),
    {sk:'val',sd:-1,search:r=>[r.id,CUST[r.cust].name,PROD[r.prod].name,r.plant,r.region].join(' '),
     rowAttr:r=>`data-act="toggle" data-key="order" data-id="${r.id}" data-t="orders"`,rowCls:r=>S.open.order===r.id?'sel':'',
     expand:r=>S.open.order!==r.id?'':orderDetail(r)});
  return pageHead(1,'Manufacture','Capital orders, backlog and delivery reliability. This is where the installed base of the future is built, so shipment dates here set when spares demand starts.',c)+
  `<section>${stats(c,[[fb(K.bl),'Capital backlog'],[K.b2b.toFixed(2),'Book-to-bill, 12 months'],[pc0(ot(sh12)),`On-time shipments (within 1 month); ${pc0(ot(shP))} a year ago`],[(slip>=0?'+':'')+slip.toFixed(1),`Average slip in months; ${slipP.toFixed(1)} a year ago`],[num(open.length),'Open orders']])}</section>
  ${sec('Backlog and order flow','Backlog by product group over the last three years, and how quickly new orders are being converted into shipments.',`<div class="grid2">${pcard('Backlog by product group','Open order value at each month end.',legend(GRPS.map((g,i)=>({n:g,c:`var(--s${i+1})`})))+stackCols({w:w2,h:250,x:x36,stacks:stk,yfmt:v=>'$'+(v/1000).toFixed(1)+'B',tfmt:tM,xevery:5,gap:.8,label:'Backlog by product group'}))}${pcard('Orders booked against shipments','Six-month average, $M per month. Orders above shipments grow the backlog.',legend([{n:'Orders booked',c:'var(--man)',ln:1},{n:'Shipments',c:'var(--ink)',ln:1}])+line)}</div>`)}
  ${sec('Where deliveries slip','Average months late for shipments in the last 24 months. Darker cells mean longer slips, and the cell tooltip gives the exact figure.',pcard('Slip by product group and plant','Cells need at least two shipments to show.',hm))}
  ${sec('Order book at full detail','Every order in scope. Select a row to see its build timeline, and sort or search to find a customer, plant or product.',`<div class="tools"><div class="seg" role="group" aria-label="Order status">${['Open','Delivered','All'].map(v=>`<button aria-pressed="${S.oFilter===v}" data-act="ofilter" data-v="${v}">${v}</button>`).join('')}</div>${tsearch('orders','Search orders, customers, plants')}</div>${tbox('orders')}`)}`;
}
function orderDetail(r){
  const tot=Math.max(1,r.act-r.om),seg=[['Engineering',.2,'var(--s1)'],['Fabrication',.5,'var(--s2)'],['Factory test',.15,'var(--s3)'],['Ship and commission',.15,'var(--s4)']];
  return `<div class="kv"><div><span>Order placed</span><b>${mLab(r.om)}</b></div><div><span>Scheduled delivery</span><b>${mLab(r.sched)}</b></div><div><span>${r.delivered?'Delivered':'Estimated delivery'}</span><b>${mLab(r.act)}</b></div><div><span>Build time</span><b>${tot} months</b></div><div><span>Progress</span><b>${r.delivered?'Complete':pc0(r.pr)}</b></div></div>
  <div class="gantt" role="img" aria-label="Build timeline">${seg.map(s=>`<div style="width:${s[1]*100}%;background:${s[2]};${s[2]==='var(--s4)'?'color:var(--paper)':''}">${s[0]}</div>`).join('')}</div>
  <p class="mute" style="font-size:13px">Once shipped, the units on this order join the installed base and start consuming wear parts. Their first overhaul window falls roughly two to five years later, depending on duty.</p>`;
}

/* ============ INSTALLED BASE ============ */
function custRows(){
  const A=scope(),FC=getFc(NEUTRAL),by={};
  A.rigs.forEach(r=>{(by[r.cust]=by[r.cust]||[]).push(r)});
  return Object.entries(by).map(([id,rigs])=>{const c=CUST[id],units=rigs.flatMap(r=>r.units);
    return {id,c,name:c.name,kind:c.kind,rigs,n:rigs.length,active:rigs.filter(r=>r.act[NOW]).length,
      util:mean(rigs.map(r=>mean(Array.from(r.hrs).slice(39))/730)),
      spend:units.reduce((a,u)=>{for(let m=33;m<=44;m++)a+=u.spC[m]+u.spK[m]+u.spF[m];return a},0),
      near:units.filter(u=>u.hs[NOW]/FAM[u.fam].ovh>=.8).length,exp:units.filter(u=>FC.next.has(u.id)).length};});
}
function healthOf(u){const f=FAM[u.fam];let fl=0;for(let m=33;m<=44;m++)fl+=u.fail[m];return Math.round(Math.max(5,Math.min(100,100-55*Math.min(u.hs[NOW]/f.ovh,1.2)-8*fl)));}
function rigPanel(cr){
  const FC=getFc(NEUTRAL);
  const rows=cr.rigs.map(r=>({id:r.id,r,type:r.type,region:r.region,age:2026-r.comm,act:r.act[NOW],h12:sum(r.hrs,33,44),
    near:r.units.filter(u=>u.hs[NOW]/FAM[u.fam].ovh>=.8).length,sp:r.units.reduce((a,u)=>{for(let m=33;m<=44;m++)a+=u.spC[m]+u.spK[m]+u.spF[m];return a},0)}));
  rows.sort((a,b)=>b.sp-a.sp);
  let h=`<div class="tw"><table class="tbl" style="min-width:560px"><thead><tr><th>Rig</th><th>Type</th><th>Region</th><th class="r">Age</th><th>Status</th><th class="r">Hours, 12 months</th><th class="r">Units near overhaul</th><th class="r">Spares, 12 months</th></tr></thead><tbody>`;
  rows.slice(0,15).forEach(r=>{h+=`<tr data-act="toggle" data-key="rig" data-id="${r.id}" data-t="cust" class="${S.open.rig===r.id?'sel':''}"><td>${r.id}</td><td>${r.type}</td><td>${r.region}</td><td class="r">${r.age} yr</td><td><span class="st ${r.act?'ok':'idle'}">${r.act?'Drilling':'Idle'}</span></td><td class="r">${num(r.h12)}</td><td class="r">${r.near}</td><td class="r">${fk(r.sp)}</td></tr>`;
    if(S.open.rig===r.id)h+=`<tr class="xr"><td colspan="8">${unitPanel(r.r,FC)}</td></tr>`;});
  return h+`</tbody></table></div>${rows.length>15?`<p class="mute" style="font-size:12.5px;margin-top:6px">Showing the 15 rigs with the highest spares spend of ${rows.length}.</p>`:''}`;
}
function unitPanel(r,FC){
  let h=`<div class="tw"><table class="tbl" style="min-width:560px"><thead><tr><th>Serial</th><th>Equipment</th><th class="r">Age</th><th class="r">Hours since overhaul</th><th>Share of interval used</th><th class="r">Health</th><th>Next overhaul</th></tr></thead><tbody>`;
  r.units.forEach(u=>{const f=FAM[u.fam],x=u.hs[NOW]/f.ovh,nx=FC.next.get(u.id),hl=healthOf(u);
    h+=`<tr><td>${u.id}</td><td>${f.name}<small>${u.model}</small></td><td class="r">${2026-u.comm} yr</td><td class="r">${num(u.hs[NOW])}</td>
    <td style="min-width:130px"><div class="bt"><i style="width:${Math.min(100,x*100)}%;background:${x>=.8?'var(--rep)':x>=.5?'var(--spa)':'var(--ins)'}"></i></div><small>${pc0(x)} of ${num(f.ovh)} h</small></td>
    <td class="r"><span class="st ${hl>=65?'ok':hl>=40?'soon':'now'}">${hl}</span></td><td>${nx!=null?mLab(NOW+1+nx):'After Sep 27'}</td></tr>`;});
  return h+`</tbody></table></div>`;
}
function pageIns(){
  const K=kpis(),A=K.A,c='var(--ins)',FC=K.fc,W=wid(1),w2=wid(2);
  const age=A.units.length?mean(A.units.map(u=>2026-u.comm)):0,near=A.units.filter(u=>u.hs[NOW]/FAM[u.fam].ovh>=.8);
  const typeSeries=RTYPES.filter(t=>A.typeUtil[t].n>0).map((t,i)=>({name:t+' rigs',color:['var(--s4)','var(--s2)','var(--s1)'][RTYPES.indexOf(t)],width:2.4,data:Array.from(A.typeUtil[t].u).map(v=>v==null?null:v*100)}));
  const util=lineChart({w:W,h:250,x:Array.from({length:NM},(_,i)=>mLab(i)),ymin:0,ymax:100,yfmt:v=>v+'%',tfmt:v=>v.toFixed(0)+'%',xevery:4,series:typeSeries,label:'Utilisation by rig type'});
  const bands=[['Under 5 years',0,4],['5 to 9 years',5,9],['10 to 14 years',10,14],['15 years and over',15,99]];
  const ageStk=bands.map((b,i)=>({name:b[0],color:`var(--s${i+1})`,data:FAMS.map(f=>A.units.filter(u=>u.fam===f.id&&2026-u.comm>=b[1]&&2026-u.comm<=b[2]).length)}));
  const wins=[['Under 40% used',0,.4,'var(--s3)'],['40 to 80%',.4,.8,'var(--s2)'],['80 to 100%',.8,1,'var(--spa)'],['Past 100%',1,9,'var(--rep)']];
  const winStk=wins.map(b=>({name:b[0],color:b[3],data:FAMS.map(f=>A.units.filter(u=>{const x=u.hs[NOW]/f.ovh;return u.fam===f.id&&x>=b[1]&&x<b[2]}).length)}));
  const rows=custRows(),kc={Offshore:'var(--s1)',Land:'var(--s4)',Mixed:'var(--s2)'};
  const sc=rows.length?scatter({w:W,h:290,xmin:0,ymin:0,xl:'Rigs in scope',xfmt:v=>v,yfmt:v=>v+'%',label:'Customers by fleet size and utilisation',
    pts:rows.map(r=>({x:r.n,y:r.util*100,r:Math.max(6,Math.sqrt(r.spend/1e6)*2.6),color:kc[r.kind],label:r.name.slice(-1),
      tip:`<b>${r.name}</b> (${r.kind.toLowerCase()})<br>${r.n} rigs, ${pc0(r.util)} utilised<br>Spares last 12 months: ${fm(r.spend)}`,attr:`data-act="toggle" data-key="cust" data-id="${r.id}" data-t="cust"`}))}):'';
  TB.cust=()=>table('cust',[
    {k:'name',l:'Customer',f:r=>`${r.name}<small>${r.kind} fleet, home ${r.c.home}</small>`},{k:'n',l:'Rigs',al:'r'},
    {k:'active',l:'Drilling now',al:'r',f:r=>`${r.active} (${pc0(r.active/r.n)})`,sv:r=>r.active/r.n},{k:'util',l:'Utilisation, 6 months',al:'r',f:r=>pc0(r.util)},
    {k:'spend',l:'Spares, 12 months',al:'r',f:r=>fm(r.spend)},{k:'near',l:'Units near overhaul',al:'r'},{k:'exp',l:'Overhauls due in 12 months',al:'r'}],rows,
    {sk:'spend',sd:-1,limit:14,search:r=>r.name+' '+r.kind,rowAttr:r=>`data-act="toggle" data-key="cust" data-id="${r.id}" data-t="cust"`,rowCls:r=>S.open.cust===r.id?'sel':'',
     expand:r=>S.open.cust===r.id?`<p class="mute" style="font-size:13px;margin-bottom:10px">Rigs for ${r.name}. Select a rig to see each piece of equipment on it.</p>${rigPanel(r)}`:''});
  return pageHead(2,'Sell and installed base','Who owns the equipment, how hard it is being worked, and how much life it has left. Usage and remaining life are the two inputs that drive the spares forecast.',c)+
  `<section>${stats(c,[[num(A.rigs.length),'Rigs with NOV equipment'],[num(K.actN),`Drilling now (${pc0(K.actN/Math.max(1,A.rigs.length))})`],[pc0(K.util3),'Utilisation, 3 months'],[age.toFixed(1)+' yr','Average equipment age'],[num(near.length),'Units past 80% of overhaul interval'],[num(FC.next.size),'Overhauls expected in 12 months']])}</section>
  ${sec('How customers use their rigs','Share of each rig type\'s hours that were spent drilling, month by month. Offshore recovery lifts hours, and hours convert directly into parts consumption.',legend(typeSeries.map(s=>({n:s.name,c:s.color,ln:1})))+util)}
  ${sec('Age and remaining life of the installed base','Calendar age says little about wear. The share of each overhaul interval already used says when parts and kits will be needed.',`<div class="grid2">${pcard('Units by age and family','Number of equipment units.',legend(bands.map((b,i)=>({n:b[0],c:`var(--s${i+1})`})))+stackCols({w:w2,h:260,x:FAMS.map(f=>f.name.replace(' & pressure control','').replace('Controls & drives','Controls')),stacks:ageStk,xall:true,gap:.6,yfmt:v=>num(v),tfmt:num,xb:26,label:'Units by age'}))}${pcard('Units by share of overhaul interval used','Units past 80% enter the overhaul window.',legend(wins.map(b=>({n:b[0],c:b[3]})))+stackCols({w:w2,h:260,x:FAMS.map(f=>f.name.replace(' & pressure control','').replace('Controls & drives','Controls')),stacks:winStk,xall:true,gap:.6,yfmt:v=>num(v),tfmt:num,xb:26,label:'Units by life used'}))}</div>`)}
  ${sec('Customers by fleet size and utilisation','Bubble size is spares spend in the last 12 months. Select a bubble to open that customer in the table below.',legend([{n:'Offshore fleet',c:'var(--s1)'},{n:'Land fleet',c:'var(--s4)'},{n:'Mixed fleet',c:'var(--s2)'}])+sc)}
  ${sec('Customer, rig and equipment unit','Three levels of detail. Select a customer to list its rigs, then a rig to list each unit with its life used, health and expected overhaul month.',`<div class="tools">${tsearch('cust','Search customers')}</div>${tbox('cust')}`)}`;
}

/* ============ REPAIR ============ */
function pageRep(){
  const K=kpis(),A=K.A,c='var(--rep)',w2=wid(2),W=wid(1);
  const w12=A.wos.filter(w=>w.m>=33),un=w12.filter(w=>!w.planned),hrs12=sum(A.hrs,33,44),fails12=sum(A.fails,33,44),ov=overflowStats();
  const n=36,x36=lab(n),planned=Array(NM).fill(0),unpl=Array(NM).fill(0);A.wos.forEach(w=>{(w.planned?planned:unpl)[w.m]++});
  const bd=bathData(),bl=['0 to 25%','25 to 50%','50 to 75%','75% and over'];
  const fcol=['var(--s1)','var(--ins)','var(--spa)','var(--mute)','var(--man)','var(--s2)'];
  const bath=lineChart({w:w2,h:260,x:bl,ymin:0,yfmt:v=>v.toFixed(1)+'x',tfmt:v=>v.toFixed(2)+'x',xevery:1,label:'Failure rate by life used',
    series:[...FAMS.map((f,i)=>({name:f.name,color:fcol[i],width:1.4,data:bd.fam[f.id]})),{name:'All families',color:'var(--rep)',width:3.2,data:bd.all}]});
  const modes={};A.wos.filter(w=>!w.planned&&w.m>=21).forEach(w=>{const k=FAM[w.fam].name+': '+w.mode;(modes[k]=modes[k]||{n:0,cost:0});modes[k].n++;modes[k].cost+=w.cost;});
  const ml=Object.entries(modes).sort((a,b)=>b[1].n-a[1].n),mt=ml.reduce((a,b)=>a+b[1].n,0);let cum=0;
  const pareto=barH(ml.slice(0,10).map(([k,v])=>{cum+=v.n;const [f,m]=k.split(': ');return{label:m,sub:f,v:v.n,text:num(v.n),sub2:'cumulative '+pc0(cum/mt),color:'var(--rep)'}}),{color:'var(--rep)'});
  const cen=CENTERS.map(ce=>{const x=w12.filter(w=>w.center===ce);return{ce,n:x.length,tat:mean(x.map(w=>w.tat)),ovf:x.length?x.filter(w=>w.overflow).length/x.length:0}}).filter(r=>r.n>0);
  const cbars=barH(cen.sort((a,b)=>b.tat-a.tat).map(r=>({label:r.ce,sub:`${r.n} work orders`,v:r.tat,text:r.tat.toFixed(1)+' days',sub2:r.ce==='Houston'?pc0(r.ovf)+' overflow from other regions':'home-region work',color:r.ce==='Houston'?'var(--s1)':'var(--rep)'})),{max:Math.max(...cen.map(r=>r.tat),1)});
  TB.wo=()=>table('wo',[{k:'id',l:'Work order'},{k:'m',l:'Month',f:r=>mLab(r.m)},{k:'unit',l:'Unit',f:r=>`${r.unit}<small>${r.model}</small>`},{k:'fam',l:'Family',f:r=>FAM[r.fam].name},
    {k:'cust',l:'Customer',f:r=>CUST[r.cust].name},{k:'mode',l:'Work',f:r=>r.planned?'Planned overhaul':r.mode},{k:'center',l:'Centre',f:r=>r.center+(r.overflow?'<small>overflow</small>':'')},
    {k:'tat',l:'Turnaround',al:'r',f:r=>r.tat+' days'},{k:'cost',l:'Value',al:'r',f:r=>fk(r.cost)}],A.wos.filter(w=>w.m>=21),
    {sk:'m',sd:-1,search:r=>[r.id,r.unit,r.mode,FAM[r.fam].name,CUST[r.cust].name,r.center].join(' '),
     rowAttr:r=>`data-act="toggle" data-key="wo" data-id="${r.id}" data-t="wo"`,rowCls:r=>S.open.wo===r.id?'sel':'',
     expand:r=>S.open.wo!==r.id?'':`<div class="kv"><div><span>Rig</span><b>${r.rig}</b></div><div><span>Region</span><b>${r.region}</b></div><div><span>Parts consumed</span><b>${fk(r.parts)}</b></div><div><span>Labour and services</span><b>${fk(r.labour)}</b></div><div><span>Family average turnaround</span><b>${FAM[r.fam].tat*(r.planned?1.5:.75)|0} days</b></div><div><span>Routing</span><b>${r.overflow?'Outside home centre':'Home centre'}</b></div></div>`});
  return pageHead(3,'Repair','Failures, planned overhauls and how quickly the service network turns equipment around. Repairs are the earliest signal that a unit is wearing out, and each one pulls parts.',c)+
  `<section>${stats(c,[[num(w12.length),'Work orders, last 12 months'],[Math.round(K.tatN)+' days',`Average turnaround; ${Math.round(K.tatP)} a year ago`],[pc0(w12.length?un.length/w12.length:0),'Unplanned share of work'],[(A.units.length?un.length/A.units.length*100:0).toFixed(0),'Unplanned repairs per 100 units, 12 months'],[fm(sum(A.rep,33,44)),'Repair revenue, 12 months']])}</section>
  ${sec('Planned against unplanned work','Monthly work orders over the last three years. A rising unplanned share means customers are running equipment past its service point.',legend([{n:'Planned overhaul',c:'var(--s2)'},{n:'Unplanned repair',c:'var(--rep)'}])+stackCols({w:W,h:230,x:x36,stacks:[{name:'Planned overhaul',color:'var(--s2)',data:last(n,planned)},{name:'Unplanned repair',color:'var(--rep)',data:last(n,unpl)}],gap:.8,xevery:4,yfmt:num,tfmt:num,label:'Work orders by month'}))}
  ${sec('Why equipment fails and where it is fixed','Failure risk climbs as a unit uses up its overhaul interval, which is the case for condition-based overhaul triggers. The Pareto shows which failure modes deserve stocked parts.',`<div class="grid2">${pcard('Failure rate by share of interval used','Each line is indexed to its own family average (1.0x). Above 1.0x means more failures than normal.',legend([...FAMS.map((f,i)=>({n:f.name.replace(' & pressure control',''),c:fcol[i],ln:1})),{n:'All families',c:'var(--rep)',ln:1}])+bath)}${pcard('Most frequent unplanned failure modes','Last 24 months, top ten by count.',pareto)}</div>`)}
  ${sec('Service centre turnaround','Average days to turn a work order in the last 12 months. Work routed away from the home centre takes about '+Math.round(ov.extra)+' days longer on average ('+pc0(ov.share)+' of orders).',cbars)}
  ${sec('Work orders at full detail','Every work order from the last 24 months. Select a row to see the parts and labour split and how it compares to the family norm.',`<div class="tools">${tsearch('wo','Search work orders, units, customers')}</div>${tbox('wo')}`)}`;
}

/* ============ SPARES ============ */
function pageSpa(){
  const c='var(--spa)',sc=S.scen;
  const chips=['All',...FAMS.map(f=>f.id)].map(id=>`<button class="chip" style="--c:var(--spa)" aria-pressed="${S.fam===id}" data-act="fam" data-id="${id}">${id==='All'?'All families':FAM[id].name}</button>`).join('');
  const sl=(k,l,mn,mx,st,sub)=>`<div><label for="s-${k}">${l}: <output id="o-${k}" style="color:var(--spa)">${fmtS(k,sc[k])}</output><small>${sub}</small></label><input id="s-${k}" type="range" min="${mn}" max="${mx}" step="${st}" value="${Math.round(sc[k]*100)}" data-s="${k}"></div>`;
  return pageHead(4,'Spares','The forecast and the stock decisions that follow from it. Demand is built unit by unit from operating hours, remaining life and failure risk, then tested against a flat average.',c)+
  `<section><div class="sh"><h2>Choose a family and test a scenario</h2><p>The forecast, composition and part table below respond to both.</p></div><div class="chips">${chips}</div>
  <div class="scen" style="--c:var(--spa)">${sl('util','Rig utilisation change',-25,25,1,'Shifts operating hours for every unit')}${sl('defer','Overhauls deferred',0,50,5,'Share of due kits customers push out')}${sl('price','Price change',-5,10,1,'Applied to parts and kit prices')}<div style="align-self:end"><button class="btn" data-act="resetScen">Reset scenario</button></div></div></section>
  <div id="spaDyn">${spaDyn()}</div>`;
}
const fmtS=(k,v)=>k==='defer'?Math.round(v*100)+'%':(v>0?'+':v<0?'−':'')+Math.abs(Math.round(v*100))+'%';
function spaDyn(){
  const K=kpis(),A=K.A,sc=S.scen,FC=getFc(sc),F0=getFc(NEUTRAL),bt=K.bt,w2=wid(2),W=wid(1),id=S.fam;
  const hist=id==='All'?A.sp:A.famSp[id],ft=id==='All'?FC.tot:FC.fam[id],f0=id==='All'?F0.tot:F0.fam[id];
  const t12=sum(hist,33,44),f12=ft.reduce((a,b)=>a+b,0),b12=f0.reduce((a,b)=>a+b,0);
  const parts=partRows(id),risk=parts.filter(p=>p.status==='Order now'||p.status==='Reorder soon'),exc=parts.filter(p=>p.status==='Excess');
  const on=sc.util||sc.defer||sc.price;
  const cons=id==='All'?FC.cons:FC.out[id].cons,kit=id==='All'?FC.kit:FC.out[id].kit,fail=id==='All'?FC.fail:FC.out[id].fail;
  const xf=Array.from({length:HZ},(_,h)=>mLab(NOW+1+h));
  const comp=stackCols({w:w2,h:250,x:xf,stacks:[{name:'Overhaul kits',color:'var(--spa)',data:kit.map(v=>v/1e6)},{name:'Wear parts by hours',color:'var(--s1)',data:cons.map(v=>v/1e6)},{name:'Failure repair parts',color:'var(--rep)',data:fail.map(v=>v/1e6)}],gap:.7,xevery:2,yfmt:yM,tfmt:tM,label:'Forecast composition'});
  const fr=FAMS.map(f=>({label:f.name,a:bt.byFam[f.id].wape,b:bt.byFam[f.id].base}));
  const bars=pairBars(fr,'var(--spa)','var(--s3)',Math.max(...fr.map(r=>Math.max(r.a,r.b)),.01));
  TB.parts=()=>table('parts',[{k:'no',l:'Part',f:r=>`${r.no}<small>${r.desc}</small>`,sv:r=>r.no},{k:'fam',l:'Family',f:r=>FAM[r.fam].name},
    {k:'t12',l:'Last 12 months',al:'r',f:r=>fk(r.t12)},{k:'f12',l:'Next 12 months',al:'r',f:r=>fk(r.f12)},{k:'delta',l:'Change',al:'r',f:r=>sgn(r.delta)},
    {k:'fq',l:'Forecast per month',al:'r',f:r=>q1(r.fq)+' units'},{k:'onHand',l:'On hand',al:'r',f:r=>q1(r.onHand)},{k:'rop',l:'Reorder point',al:'r',f:r=>q1(r.rop)},
    {k:'status',l:'Status',f:r=>`<span class="st ${({'Order now':'now','Reorder soon':'soon',Healthy:'ok',Excess:'excess'})[r.status]}">${r.status}</span>`,sv:r=>({'Order now':0,'Reorder soon':1,Healthy:2,Excess:3})[r.status]}],parts,
    {sk:'status',sd:1,limit:12,search:r=>r.no+' '+r.desc+' '+FAM[r.fam].name,rowAttr:r=>`data-act="toggle" data-key="part" data-id="${r.no}" data-t="parts"`,rowCls:r=>S.open.part===r.no?'sel':'',expand:r=>S.open.part===r.no?partDetail(r):''});
  return stats('var(--spa)',[[fm(t12),'Spares demand, last 12 months'],[fm(f12),'Forecast, next 12 months'],[sgn(t12?f12/t12-1:0),on?`Change on last 12; base case ${sgn(t12?b12/t12-1:0)}`:'Change on last 12 months'],[pc0(1-bt.wape),'Backtest accuracy, all families'],[num(risk.length),`Parts to order now or soon (${exc.length} in excess)`]])+
  sec('Forecast with range',on?'The scenario forecast is drawn against the base case so the effect of each lever is visible.':'Monthly demand with the 80% range. Move the sliders above to test a scenario.',fanChart(W,id,sc,300))+
  sec('What the forecast is made of and how well it works','Overhaul kits are the lumpy, long-lead part of demand. The backtest compares the unit-level model with a flat 12-month average over the six months to Sep 2026.',
   `<div class="grid2">${pcard('Forecast composition','Monthly $M by source.',legend([{n:'Overhaul kits',c:'var(--spa)'},{n:'Wear parts by hours',c:'var(--s1)'},{n:'Failure repair parts',c:'var(--rep)'}])+comp)}${pcard('Backtest error by family','Lower is better. Top bar is the unit-level model, lower bar the flat average.',legend([{n:'Unit-level model',c:'var(--spa)'},{n:'Trailing 12-month average',c:'var(--s3)'}])+bars)}</div>`)+
  sec('Parts at full detail','Each part with its demand, forecast and stock position. Select a row to see its history and the suggested order. On-hand stock is illustrative.',`<div class="tools">${tsearch('parts','Search part numbers and names')}</div>${tbox('parts')}`);
}
function partDetail(r){
  const n=24,x=[],act=[],fc=[];for(let i=0;i<n+HZ;i++){const m=NOW-n+1+i;x.push(mLab(m));if(i<n){act.push(r.qHist[m]);fc.push(i===n-1?r.qHist[m]:null);}else{act.push(null);fc.push(r.qF[i-n]);}}
  const w=Math.min(wid(1)-40,760),f=FAM[r.fam],ltM=r.lt/4.345;
  const act2=r.status==='Order now'?`Order about ${q1(r.need)} units now. Lead time is ${r.lt} weeks, so stock on hand covers ${r.cover.toFixed(1)} months against ${ltM.toFixed(1)} months of lead time.`:r.status==='Reorder soon'?`Raise an order within the next planning cycle (about ${q1(r.need)} units). Cover is ${r.cover.toFixed(1)} months against a ${r.lt}-week lead time.`:r.status==='Excess'?`On-hand stock is well above the reorder point. Hold new orders and review the stocking level.`:`Stock covers forecast demand through the lead time. No action needed.`;
  return `<div class="kv"><div><span>Part</span><b>${r.desc}</b></div><div><span>Unit price</span><b>${fk(r.price)}</b></div><div><span>Lead time</span><b>${r.lt} weeks</b></div><div><span>Safety stock</span><b>${q1(r.ss)} units</b></div><div><span>Class</span><b>${r.kind==='kit'?'Overhaul kit':'Wear and failure part'}</b></div></div>
  <div style="margin-top:12px">${lineChart({w,h:190,x,fi:n,ymin:0,yfmt:v=>q1(v),tfmt:v=>q1(v)+' units',xevery:4,label:'Monthly units demanded',series:[{name:'Actual',color:'var(--ink)',data:act,width:2,area:true},{name:'Forecast',color:'var(--spa)',data:fc,width:3}]})}</div>
  <p style="margin-top:8px"><b>Suggested action.</b> ${act2}</p>`;
}

/* ============ FINDINGS ============ */
function pageFind(){
  const K=kpis(),A=K.A,ins=insights(),parts=partRows('All'),now=parts.filter(p=>p.status==='Order now').length,exc=parts.filter(p=>p.status==='Excess').length,ov=overflowStats(),fc=K.fc;
  const nearN=A.units.filter(u=>u.hs[NOW]/FAM[u.fam].ovh>=.8).length;
  const recs=[
   {c:'var(--spa)',go:'spares',t:'Pre-position overhaul kits ahead of the demand peak',own:'Aftermarket supply planning',imp:3,eff:2,
    a:`Release purchase orders for the long-lead kits and parts flagged "Order now" (${now} today) at least one lead time before the forecast peak. Review the ${exc} excess lines for release.`,x:'Fewer stock-outs on kits, lower expedite cost, less cash tied up in slow stock.'},
   {c:'var(--ins)',go:'installed',t:'Offer condition-based overhaul packages to units past 80% of their interval',own:'Aftermarket sales, Rigsentry monitoring team',imp:3,eff:3,
    a:`Approach the owners of the ${num(nearN)} units in the overhaul window with a planned-overhaul proposal tied to condition data, so work is scheduled rather than forced by a failure.`,x:'Converts reactive repairs into planned, higher-margin overhauls and smooths demand for the service network.'},
   {c:'var(--rep)',go:'repair',t:'Cut overflow routing by stocking kits and capacity closer to the customer',own:'Service operations',imp:2,eff:3,
    a:`${pc0(ov.share)} of repairs were routed away from the home centre, adding about ${Math.round(ov.extra)} days. Identify the regions and families behind it and pre-stage kits or repair capacity there.`,x:'Shorter turnaround and less idle rig time for customers.'},
   {c:'var(--man)',go:'manufacture',t:'Attach a spares schedule to every capital order at booking',own:'Rig Technologies commercial, product management',imp:2,eff:1,
    a:'When an order is booked, register the units, expected operating profile and first overhaul window so spares planning sees new demand before the equipment ships.',x:'Earlier visibility of demand from new builds and better first-overhaul attach rates.'},
   {c:'var(--spa)',go:'spares',t:'Move the forecast into a monthly planning routine with scenario sign-off',own:'Business data science, finance, supply planning',imp:3,eff:1,
    a:`Run the unit-level model monthly, publish accuracy against the trailing average (${pct(1-K.bt.wape)} against ${pct(1-K.bt.base)} in the backtest), and agree utilisation and deferral scenarios with commercial teams.`,x:'One shared demand number and a clear trail from rig activity to parts orders.'}];
  const W=wid(2),pts=recs.map((r,i)=>({x:r.eff,y:r.imp,r:15,color:r.c,label:String(i+1),tip:`<b>${i+1}. ${esc(r.t)}</b><br>Impact ${r.imp} of 3, effort ${r.eff} of 3`}));
  const matrix=`<svg viewBox="0 0 ${W} 250" width="${W}" height="250" role="img" aria-label="Impact against effort for each recommendation"><rect x="48" y="10" width="${(W-60)/2}" height="100" class="fcz"/><text class="ax fct" x="56" y="26">Do first</text><text class="ax" x="${W/2+20}" y="238" text-anchor="middle">Effort, low to high</text><text class="ax" transform="translate(12 120) rotate(-90)" text-anchor="middle">Impact</text>
   ${recs.map((r,i)=>{const jx=(i%2?10:-10),jy=(i%3?6:-6),cx=48+(W-72)*((r.eff-.5)/3)+jx,cy=215-(r.imp-.5)*72+jy;return `<circle cx="${cx}" cy="${cy}" r="15" style="fill:${r.c};fill-opacity:.7;stroke:${r.c}" data-tip="${esc(`<b>${i+1}. ${r.t}</b><br>Impact ${r.imp} of 3, effort ${r.eff} of 3`)}"/><text x="${cx}" y="${cy+5}" text-anchor="middle" style="font:700 14px var(--fb);fill:var(--paper)">${i+1}</text>`}).join('')}</svg>`;
  const watch=[[fm(K.fcTot),'Next-12-month spares forecast',K.fcTot/1e6],[pc0(1-K.bt.wape),'Forecast accuracy (target above 90%)'],[Math.round(K.tatN)+' days','Repair turnaround'],[fb(K.bl),'Capital backlog'],[pc0(K.util3),'Fleet utilisation'],[num(nearN),'Units past 80% of interval']];
  return `<section><h1>Findings and next steps</h1><p class="sub">What the data shows for ${scopeText()}, what to do about it, and who should do it. Everything here recalculates when you change the region or rig type filter.</p></section>
  ${sec('Insights','Five findings, each linked to the drill-down that proves it.','<div class="find">'+ins.map((i,n)=>`<div class="fi" style="--c:${i.c}"><span class="n">${n+1}</span><div><b class="h">${i.h}</b><p>${i.t}</p></div><button class="lnk" data-go="${i.go}">Open the evidence</button></div>`).join('')+'</div>')}
  ${sec('Recommendations','Ordered by the sequence we would start them. The matrix shows impact against effort.',`<div class="grid2"><div>${recs.map((r,i)=>`<div class="rec" style="--c:${r.c}"><span class="n">${i+1}</span><div><b>${r.t}</b><p style="margin-top:4px">${r.a}</p><div class="m"><span>Owner: <b>${r.own}</b></span><span>Expected impact: <b>${r.x}</b></span></div><button class="lnk" data-go="${r.go}">Open the evidence</button></div></div>`).join('')}</div>${pcard('Impact against effort','Numbers match the recommendations on the left.',matrix)}</div>`)}
  ${sec('Next steps','A three-stage plan, then the measures to watch.',`<div class="grid3"><div class="phase" style="--c:var(--man)"><h3>First 30 days</h3><ul><li>Confirm data feeds: order and shipment history, installed-base register, operating hours, service orders, parts stock.</li><li>Validate unit overhaul intervals and failure rates with product engineering.</li><li>Agree the utilisation and deferral scenarios with commercial leads.</li></ul></div>
   <div class="phase" style="--c:var(--ins)"><h3>30 to 90 days</h3><ul><li>Replace the illustrative data and re-run the backtest on real history.</li><li>Release orders for parts flagged "Order now" and review excess lines.</li><li>Pilot condition-based overhaul offers with three customers.</li></ul></div>
   <div class="phase" style="--c:var(--spa)"><h3>90 to 180 days</h3><ul><li>Move to a monthly forecast cycle with accuracy tracked by family and region.</li><li>Link new capital orders to a spares schedule at booking.</li><li>Extend the model to repair capacity planning by service centre.</li></ul></div></div>
   <h3 style="margin:30px 0 4px">Measures to watch</h3><div class="watch">${watch.map(w=>`<div><b>${w[0]}</b>${w[1]}</div>`).join('')}</div>`)}
  ${sec('Market context','Public information that frames the base case.',`<div class="call" style="--c:var(--ink)"><p>NOV reported on its fourth-quarter 2025 call that aftermarket parts and services in its drilling equipment business rose almost 10% on the previous quarter but stayed down by the mid-teens against the prior year, and that offshore drilling activity looked to be bottoming. The model's utilisation recovery assumption follows that direction. Source: NOV Q4 2025 earnings call transcript, April 2026.</p><p style="margin-top:8px">NOV's Rigsentry condition monitoring is positioned around usage- and condition-based maintenance for top drives, mud pumps and BOPs, which is the data source that would sharpen the overhaul timing in this forecast. Source: nov.com, Condition Monitoring Services.</p></div>`)}
  <section class="close"><div class="sh"><h2>Closing remarks</h2></div>
   <p>The lifecycle view makes one point plainly: parts demand is not random. It is set by how many rigs are drilling, how many hours they run, and how much life each unit has left. Manufacturing decides when units enter the installed base, usage decides how fast they wear, and repair tells you early which ones are wearing faster than expected.</p>
   <p>A forecast built on those drivers can be ordered against, challenged by scenario, and measured against a simple average. That makes it a planning tool rather than a number to be reconciled afterwards.</p>
   <p><b>Data caveat.</b> All figures in this dashboard are synthetic and exist to show the structure, interactions and method. Model names and failure modes follow NOV's public product descriptions, but quantities, prices, customers and dates are invented. The same layout carries over once the generators are replaced with live feeds.</p></section>`;
}
