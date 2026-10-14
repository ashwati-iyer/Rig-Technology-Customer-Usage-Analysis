/* ============ DATA + MODEL (synthetic, seeded) ============ */
const MN=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const mLab=m=>MN[((m%12)+12)%12]+' '+String((2023+Math.floor(m/12))%100).padStart(2,'0');
const NM=45, HZ=12, NOW=NM-1;           // Jan 2023 .. Sep 2026 actuals, 12-month forecast
const REGIONS=['North America','Middle East','Latin America','Asia Pacific','Europe & Africa'];
const RTYPES=['Land','Jack-up','Floater'];
const PF={'North America':1,'Middle East':1.06,'Latin America':1.08,'Asia Pacific':1.04,'Europe & Africa':1.10};
const CENTER={'North America':'Houston','Middle East':'Dubai','Latin America':'Macaé','Asia Pacific':'Singapore','Europe & Africa':'Aberdeen'};
const CENTERS=['Houston','Dubai','Macaé','Singapore','Aberdeen'];

function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const R=mulberry32(20261012);
const rnd=(a=0,b=1)=>a+(b-a)*R();
const pick=a=>a[Math.floor(R()*a.length)];
const gauss=()=>{let u=0,v=0;while(!u)u=R();while(!v)v=R();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)};
const poisson=l=>{if(l>30)return Math.max(0,Math.round(l+Math.sqrt(l)*gauss()));const L=Math.exp(-l);let k=0,p=1;do{k++;p*=R()}while(p>L);return k-1};
const hazard=x=>0.6+1.6*Math.pow(Math.min(x,1.2),2);

/* Equipment families: overhaul interval (operating hrs), consumable $/op-hr, overhaul kit $, failures per 1,000 hrs,
   unplanned repair $, repair turnaround (days), duty (share of rig hours the unit runs) */
const FAMS=[
 {id:'TD',name:'Top drives',ovh:9500,spHr:14,kit:125e3,lam:.040,rep:42e3,tat:24,duty:.70,models:['TDX-1250','HPS-1000','TDS-11'],
  modes:['Main shaft bearing wear','Gearbox damage','Pipe handler fault','Drive motor fault','Hydraulic leak'],
  parts:[['TD-1101','Washpipe packing kit',.28,1800,8],['TD-1102','Main shaft bearing set',.22,24500,26],['TD-1103','Gearbox seal kit',.18,3200,10],['TD-1104','IBOP valve actuator',.14,9800,14],['TD-1105','Link-tilt cylinder',.10,6400,12],['TD-1106','Cooling blower motor',.08,2900,9]]},
 {id:'MP',name:'Mud pumps',ovh:6500,spHr:22,kit:90e3,lam:.080,rep:28e3,tat:14,duty:.85,models:['14-P-220','12-P-160','Hex pump'],
  modes:['Fluid-end cracking','Valve & seat washout','Liner / piston wear','Pulsation dampener fault','Gear-end bearing'],
  parts:[['MP-2201','Valve & seat set',.30,950,5],['MP-2202','Liner & piston kit',.26,3100,6],['MP-2203','Fluid end module',.16,38000,30],['MP-2204','Packing set',.14,720,4],['MP-2205','Pulsation dampener bladder',.08,1300,8],['MP-2206','Gear-end bearing',.06,5200,18]]},
 {id:'DW',name:'Drawworks',ovh:14000,spHr:9,kit:170e3,lam:.020,rep:65e3,tat:35,duty:.60,models:['2,000 hp class','3,000 hp class'],
  modes:['Brake band wear','Drum clutch fault','Drive shaft bearing','Lube system failure'],
  parts:[['DW-3301','Brake band set',.30,14800,16],['DW-3302','Drum clutch kit',.24,11200,18],['DW-3303','Drive shaft bearing',.18,18900,28],['DW-3304','Gear lube pump',.14,4600,12],['DW-3305','Brake cooling pump',.08,5800,12],['DW-3306','Encoder assembly',.06,2100,8]]},
 {id:'BOP',name:'BOP & pressure control',ovh:8000,spHr:11,kit:250e3,lam:.015,rep:120e3,tat:45,duty:.80,models:['Subsea stack 18¾″ 15K','Surface stack 13⅝″ 10K','Surface stack 11″ 5K'],
  modes:['Annular element wear','Ram seal leak','Choke & kill valve fault','Pod regulator drift'],
  parts:[['BP-4401','Annular packing element',.28,22500,24],['BP-4402','Ram rubber set',.26,6900,14],['BP-4403','Bonnet seal kit',.18,3400,10],['BP-4404','Choke & kill valve',.12,31000,32],['BP-4405','Pod regulator',.10,12800,22],['BP-4406','Accumulator bladder',.06,2700,9]]},
 {id:'PH',name:'Pipe handling',ovh:8500,spHr:8,kit:62e3,lam:.050,rep:30e3,tat:18,duty:.65,models:['Iron roughneck','Pipe racker','Catwalk'],
  modes:['Gripper wear','Hydraulic cylinder leak','Rotary head bearing','Sensor fault'],
  parts:[['PH-5501','Gripper jaw set',.30,2300,6],['PH-5502','Torque wrench die set',.22,1700,5],['PH-5503','Hydraulic cylinder kit',.20,4100,10],['PH-5504','Rotary head bearing',.12,8800,16],['PH-5505','Hose & fitting kit',.10,950,4],['PH-5506','Sensor package',.06,3600,9]]},
 {id:'CT',name:'Controls & drives',ovh:11000,spHr:4,kit:45e3,lam:.040,rep:22e3,tat:10,duty:.95,models:['NOVOS control system','AC drive (VFD)'],
  modes:['Drive module failure','PLC / I/O fault','Network fault','Cooling fault'],
  parts:[['CT-6601','Drive IGBT module',.30,7800,12],['CT-6602','PLC I/O card',.24,2400,8],['CT-6603','Operator HMI panel',.18,5900,14],['CT-6604','Cooling fan kit',.14,780,4],['CT-6605','Encoder cable set',.08,640,3],['CT-6606','Network switch',.06,1900,6]]}
];
const FAM={};FAMS.forEach(f=>{FAM[f.id]=f;f.kitPart=[f.id+'-K',f.name.replace('& pressure control','')+' major overhaul kit',null,f.kit,Math.round(10+f.kit/25000)]});

/* ---- customers & rigs ---- */
const CUSTS=[];
const fleet=[58,52,46,40,36,32,30,26,24,20,18,16,14,10];
const kinds=['Offshore','Land','Mixed','Offshore','Land','Offshore','Mixed','Land','Offshore','Mixed','Land','Offshore','Land','Mixed'];
const homes=['Middle East','North America','Latin America','Europe & Africa','North America','Asia Pacific','Middle East','North America','Latin America','Asia Pacific','Middle East','Europe & Africa','Latin America','Asia Pacific'];
fleet.forEach((n,i)=>CUSTS.push({id:'C'+(i+1),name:'Contractor '+String.fromCharCode(65+i),kind:kinds[i],home:homes[i],n}));
const CUST={};CUSTS.forEach(c=>CUST[c.id]=c);

const bump=(m,c,w)=>Math.exp(-Math.pow((m-c)/w,2));
const MKT={Land:m=>.80-.06*bump(m,30,7)+.025*Math.sin(m/12*2*Math.PI),
 'Jack-up':m=>.70+.17*Math.pow(Math.max(m,0)/44,.8)-.03*bump(m,26,5),
 Floater:m=>.58+.25*Math.pow(Math.max(m,0)/44,.7)-.04*bump(m,27,5)};

const RIGS=[];let rn=1;
CUSTS.forEach(c=>{for(let i=0;i<c.n;i++){
  const type=c.kind==='Land'?'Land':c.kind==='Offshore'?(R()<.55?'Floater':'Jack-up'):(R()<.5?'Land':(R()<.5?'Jack-up':'Floater'));
  const region=R()<.75?c.home:pick(REGIONS);
  const comm=type==='Land'?Math.round(rnd(2008,2022)):type==='Jack-up'?Math.round(rnd(2000,2019)):Math.round(rnd(2004,2017));
  RIGS.push({id:'RIG-'+String(rn++).padStart(3,'0'),cust:c.id,type,region,comm,hrs:new Float32Array(NM),act:new Uint8Array(NM),units:[]});
}});
RIGS.forEach(r=>{let a=R()<MKT[r.type](0);
  for(let m=0;m<NM;m++){if(R()>.88)a=R()<MKT[r.type](m);r.act[m]=a?1:0;r.hrs[m]=a?730*rnd(.82,.97):0;}});

/* ---- units + monthly simulation ---- */
const UNITS=[],WOS=[];let un=1;
const PRES={Land:{TD:.9,MP:1,DW:.85,BOP:.6,PH:.7,CT:.95},'Jack-up':{TD:1,MP:1,DW:.9,BOP:.9,PH:.85,CT:1},Floater:{TD:1,MP:1,DW:.75,BOP:1,PH:1,CT:1}};
RIGS.forEach(r=>{FAMS.forEach(f=>{
  if(R()>PRES[r.type][f.id])return;
  const tm=f.id==='BOP'?({Land:.35,'Jack-up':.8,Floater:1.6})[r.type]:(r.type==='Floater'?1.15:r.type==='Land'?.9:1);
  const u={id:f.id+'-'+String(un++).padStart(5,'0'),rig:r.id,fam:f.id,model:pick(f.models),comm:Math.min(2024,r.comm+Math.round(rnd(0,4))),
    tm,pf:PF[r.region],cust:r.cust,region:r.region,type:r.type,
    hrs:new Float32Array(NM),spC:new Float32Array(NM),spK:new Float32Array(NM),spF:new Float32Array(NM),rep:new Float32Array(NM),
    fail:new Uint8Array(NM),ovh:new Uint8Array(NM),hs:new Float32Array(NM),hs0:0};
  const cohort=r.comm>=2009&&r.comm<=2016&&R()<.9;
  const rem=rnd(1,12)*f.duty*420;
  let hs=u.hs0=(cohort?Math.max(.03,1-rem/f.ovh):rnd(.02,.97))*f.ovh, thr=f.ovh*rnd(.95,1.08);
  for(let m=0;m<NM;m++){
    const h=r.hrs[m]*f.duty*rnd(.9,1.05); u.hrs[m]=h;
    u.spC[m]=h*f.spHr*tm*u.pf*rnd(.8,1.2);
    const x0=hs/f.ovh; hs+=h;
    const nf=poisson(f.lam*h/1000*hazard(x0)); u.fail[m]=nf;
    for(let k=0;k<nf;k++){
      const cost=f.rep*tm*u.pf*Math.exp(.35*gauss());
      u.spF[m]+=cost*.35;u.rep[m]+=cost*.65;
      WOS.push(mkWO(u,f,m,false,FAMS_mode(f),cost));
    }
    if(hs>=thr){
      const kit=f.kit*tm*u.pf*rnd(.9,1.1), lab=f.kit*.35*tm*u.pf*rnd(.85,1.15);
      u.spK[m]=kit;u.rep[m]+=lab;u.ovh[m]=1;
      WOS.push(mkWO(u,f,m,true,'Planned major overhaul',kit+lab,kit,lab));
      hs=rnd(0,300);thr=f.ovh*rnd(.95,1.08);
    }
    u.hs[m]=hs;
  }
  UNITS.push(u);r.units.push(u);
});});
function FAMS_mode(f){const w=[.38,.26,.18,.12,.06].slice(0,f.modes.length);const s=w.reduce((a,b)=>a+b,0);let x=R()*s;for(let i=0;i<w.length;i++){x-=w[i];if(x<=0)return f.modes[i];}return f.modes[0];}
function mkWO(u,f,m,planned,mode,cost,parts,labour){
  const home=CENTER[u.region], center=R()<.82?home:'Houston', overflow=center!==home;
  let tat=(planned?f.tat*1.5:f.tat*.75)*(1.15-.2*m/44)*Math.exp(.3*gauss());
  if(overflow)tat=tat*1.15+7;
  return {unit:u.id,rig:u.rig,fam:f.id,cust:u.cust,region:u.region,type:u.type,m,planned,mode,tat:Math.round(tat),cost,
    parts:parts!=null?parts:cost*.35,labour:labour!=null?labour:cost*.65,center,overflow,model:u.model};
}
WOS.sort((a,b)=>a.m-b.m);WOS.forEach((w,i)=>w.id='WO-'+String(10001+i));

/* ---- capital orders (manufacturing) ---- */
const PRODS=[
 {id:'PKG-OFF',name:'Offshore drilling package',grp:'Rig packages',lead:26,val:[70,230]},
 {id:'PKG-LND',name:'Land rig package',grp:'Rig packages',lead:14,val:[18,45]},
 {id:'TD',name:'Top drive',grp:'Top drives & drawworks',lead:11,val:[6,14]},
 {id:'DW',name:'Drawworks',grp:'Top drives & drawworks',lead:14,val:[8,20]},
 {id:'MP',name:'Mud pump',grp:'Mud pumps & BOP',lead:9,val:[3,10]},
 {id:'BOP',name:'BOP stack',grp:'Mud pumps & BOP',lead:18,val:[15,60]},
 {id:'PH',name:'Pipe handling system',grp:'Handling & controls',lead:10,val:[4,12]},
 {id:'CT',name:'Controls & drives',grp:'Handling & controls',lead:10,val:[3,9]}];
const PROD={};PRODS.forEach(p=>PROD[p.id]=p);
const GRPS=['Rig packages','Top drives & drawworks','Mud pumps & BOP','Handling & controls'];
const PLANTS=['Houston','Kristiansand','Singapore','Dubai'];
const ORDERS=[];
for(let i=0;i<210;i++){
  const p=R()<.16?PRODS[0]:R()<.12?PRODS[1]:pick(PRODS.slice(2));
  const cs=[];CUSTS.forEach(c=>{for(let k=0;k<Math.ceil(c.n/10);k++)cs.push(c)});const c=pick(cs);
  const type=p.id==='PKG-OFF'?(R()<.5?'Floater':'Jack-up'):p.id==='PKG-LND'?'Land':(c.kind==='Land'?'Land':c.kind==='Offshore'?pick(['Floater','Jack-up']):pick(RTYPES));
  const om=Math.floor(-20+65*Math.pow(R(),.9));
  const lead=Math.round(p.lead*rnd(.85,1.15));
  const sched=om+lead;
  const slip=Math.max(-1,Math.round(2.4-1.7*Math.max(om,0)/44+gauss()*1.1));
  const plant=(type==='Land'&&R()<.6)?'Houston':(p.id==='PKG-OFF'?pick(['Kristiansand','Singapore','Houston']):pick(PLANTS));
  ORDERS.push({id:'PO-'+String(4000+i),cust:c.id,prod:p.id,grp:p.grp,type,region:R()<.8?c.home:pick(REGIONS),plant,
    val:rnd(p.val[0],p.val[1])*1e6,om,sched,act:sched+slip,slip});
}
ORDERS.sort((a,b)=>a.om-b.om);
ORDERS.forEach(o=>{o.delivered=o.act<=NOW;
  const pr=(NOW-o.om)/Math.max(1,(o.act-o.om));
  o.stage=o.delivered?'Delivered':pr<.2?'Engineering':pr<.7?'Fabrication':pr<.85?'Factory test':'Shipping & commissioning';
  o.pr=Math.max(0,Math.min(1,pr));});

/* ---- scope / aggregation ---- */
const S={page:'overview',region:'All',rtype:'All',fam:'All',scen:{util:0,defer:0,price:0},sort:{},q:{},open:{},oFilter:'Open'};
const inScope=o=>(S.region==='All'||o.region===S.region)&&(S.rtype==='All'||o.type===S.rtype);
const CACHE={};
const z=()=>new Float64Array(NM);
function scope(){
  const k=S.region+'|'+S.rtype; if(CACHE[k])return CACHE[k];
  const units=UNITS.filter(inScope),rigs=RIGS.filter(inScope),orders=ORDERS.filter(inScope),wos=WOS.filter(inScope);
  const A={units,rigs,orders,wos,sp:z(),spC:z(),spK:z(),spF:z(),rep:z(),hrs:z(),fails:z(),act:z(),rigHrs:z(),util:z(),
    famSp:{},famC:{},famK:{},famF:{},famRep:{},famHrs:{},famFail:{},typeUtil:{},bl:z(),blG:{},oin:z(),oout:z(),oinN:z()};
  FAMS.forEach(f=>{['famSp','famC','famK','famF','famRep','famHrs','famFail'].forEach(n=>A[n][f.id]=z())});
  units.forEach(u=>{const id=u.fam;for(let m=0;m<NM;m++){
    const c=u.spC[m],k=u.spK[m],f=u.spF[m];
    A.spC[m]+=c;A.spK[m]+=k;A.spF[m]+=f;A.sp[m]+=c+k+f;A.rep[m]+=u.rep[m];A.hrs[m]+=u.hrs[m];A.fails[m]+=u.fail[m];
    A.famSp[id][m]+=c+k+f;A.famC[id][m]+=c;A.famK[id][m]+=k;A.famF[id][m]+=f;A.famRep[id][m]+=u.rep[m];A.famHrs[id][m]+=u.hrs[m];A.famFail[id][m]+=u.fail[m];}});
  RTYPES.forEach(t=>A.typeUtil[t]={n:0,h:z(),u:z()});
  rigs.forEach(r=>{const T=A.typeUtil[r.type];T.n++;for(let m=0;m<NM;m++){A.act[m]+=r.act[m];A.rigHrs[m]+=r.hrs[m];T.h[m]+=r.hrs[m];}});
  for(let m=0;m<NM;m++){A.util[m]=rigs.length?A.rigHrs[m]/(730*rigs.length):0;RTYPES.forEach(t=>{const T=A.typeUtil[t];T.u[m]=T.n?T.h[m]/(730*T.n):null});}
  GRPS.forEach(g=>A.blG[g]=z());
  orders.forEach(o=>{for(let m=0;m<NM;m++){if(o.om<=m&&m<o.act){A.bl[m]+=o.val;A.blG[o.grp][m]+=o.val;}}
    if(o.om>=0&&o.om<NM){A.oin[o.om]+=o.val;} if(o.act>=0&&o.act<NM)A.oout[o.act]+=o.val;});
  return CACHE[k]=A;
}
const sum=(a,i0,i1)=>{let s=0;for(let i=Math.max(0,i0);i<=i1;i++)s+=a[i]||0;return s};
const mean=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:0;

/* ---- forecast engine: unit-level, hours-driven ---- */
const erf=x=>{const t=1/(1+.3275911*Math.abs(x)),y=1-(((((1.061405429*t-1.453152027)*t)+1.421413741)*t-.284496736)*t+.254829592)*t*Math.exp(-x*x);return x>=0?y:-y};
const Phi=x=>.5*(1+erf(x/Math.SQRT2));
function forecast(units,scen,s,Hn){
  const out={};FAMS.forEach(f=>out[f.id]={cons:Array(Hn).fill(0),kit:Array(Hn).fill(0),fail:Array(Hn).fill(0),kitN:Array(Hn).fill(0)});
  const next=new Map(), pr=1+scen.price, ut=1+scen.util;
  for(const u of units){const f=FAM[u.fam],o=out[u.fam];
    let a=0;for(let k=s-5;k<=s;k++)a+=u.hrs[k];const base=a/6, avgH=base*ut;
    const typH=Math.max(avgH,330*f.duty);
    const s0=.045*f.ovh, mu=f.ovh*1.015;
    let hs=u.hs[s], sg0=Math.sqrt(s0*s0+Math.pow(.32*typH,2)), prev=Phi((hs-mu)/(hs>mu?s0:sg0)), nx=false;
    for(let h=0;h<Hn;h++){
      const x0=hs/f.ovh;hs+=avgH;
      o.cons[h]+=avgH*f.spHr*u.tm*u.pf*pr;
      o.fail[h]+=f.lam*avgH/1000*hazard(x0)*f.rep*u.tm*u.pf*.35*1.07*pr;
      const sg=Math.sqrt(s0*s0+Math.pow(.32*typH*Math.sqrt(h+1),2));
      const zz=u.hs[s]+avgH*(h+1)-mu, cum=Phi(zz/(zz>0?s0:sg)), d=Math.max(0,cum-prev);prev=Math.max(prev,cum);
      if(h===0&&cum<0)0;
      o.kit[h]+=f.kit*u.tm*u.pf*pr*(1-scen.defer)*d;o.kitN[h]+=(1-scen.defer)*d;
      if(!nx&&cum>=.5){next.set(u.id,h);nx=true;}
    }}
  return {out,next};
}
function fcTotals(F,Hn){
  const tot=Array(Hn).fill(0),cons=Array(Hn).fill(0),kit=Array(Hn).fill(0),fail=Array(Hn).fill(0),fam={},kitN=Array(Hn).fill(0);
  FAMS.forEach(f=>{const o=F.out[f.id];fam[f.id]=o.cons.map((v,h)=>v+o.kit[h]+o.fail[h]);
    for(let h=0;h<Hn;h++){tot[h]+=fam[f.id][h];cons[h]+=o.cons[h];kit[h]+=o.kit[h];fail[h]+=o.fail[h];kitN[h]+=o.kitN[h];}});
  return {tot,cons,kit,fail,fam,kitN,next:F.next,out:F.out};
}
const NEUTRAL={util:0,defer:0,price:0};
const FCACHE={};
function getFc(scen){
  const k=S.region+'|'+S.rtype+'|'+JSON.stringify(scen||NEUTRAL);
  if(FCACHE[k])return FCACHE[k];
  const A=scope();return FCACHE[k]=fcTotals(forecast(A.units,scen||NEUTRAL,NOW,HZ),HZ);
}
function getBt(){
  const k='bt|'+S.region+'|'+S.rtype;if(FCACHE[k])return FCACHE[k];
  const A=scope(),s=38,Hn=6,F=fcTotals(forecast(A.units,NEUTRAL,s,Hn),Hn);
  let err=0,errB=0,act=0,mp=0,mpn=0;const byFam={};
  FAMS.forEach(f=>{const base=sum(A.famSp[f.id],s-11,s)/12;let e=0,eb=0,a=0;
    for(let h=0;h<Hn;h++){const A_=A.famSp[f.id][s+1+h];e+=Math.abs(F.fam[f.id][h]-A_);eb+=Math.abs(base-A_);a+=A_;}
    byFam[f.id]={wape:a?e/a:0,base:a?eb/a:0};err+=e;errB+=eb;act+=a;});
  const tot=[],fore=[],actual=[];
  for(let h=0;h<Hn;h++){const a=A.sp[s+1+h];if(a>0){mp+=Math.abs(F.tot[h]-a)/a;mpn++;}tot.push(F.tot[h]);actual.push(a);}
  return FCACHE[k]={wape:act?err/act:0,base:act?errB/act:0,mape:mpn?mp/mpn:.06,byFam,fc:tot,actual,s};
}

/* ---- parts ---- */
function hashN(str){let h=2166136261;for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619)}return ((h>>>0)%10000)/10000}
function partRows(famId){
  const A=scope(),FC=getFc(S.scen),fams=famId==='All'?FAMS:[FAM[famId]],rows=[];
  fams.forEach(f=>{
    const cons=A.famC[f.id],fail=A.famF[f.id],kit=A.famK[f.id],o=FC.out[f.id];
    const defs=f.parts.map(p=>({no:p[0],desc:p[1],share:p[2],price:p[3],lt:p[4],kind:'wear'})).concat([{no:f.kitPart[0],desc:f.kitPart[1],share:null,price:f.kitPart[3],lt:f.kitPart[4],kind:'kit'}]);
    defs.forEach(p=>{
      const hist=[],fc=[];
      for(let m=0;m<NM;m++)hist.push(p.kind==='kit'?kit[m]:(cons[m]+fail[m])*p.share);
      for(let h=0;h<HZ;h++)fc.push(p.kind==='kit'?o.kit[h]:(o.cons[h]+o.fail[h])*p.share);
      const t12=sum(hist,33,44),f12=fc.reduce((a,b)=>a+b,0);
      const qHist=hist.map(v=>v/p.price),qF=fc.map(v=>v/p.price);
      const mq=t12/12/p.price, fq=f12/12/p.price;
      const last12=qHist.slice(33,45), sd=Math.sqrt(mean(last12.map(v=>Math.pow(v-mean(last12),2))));
      const ltM=p.lt/4.345, ss=1.65*sd*Math.sqrt(ltM), rop=fq*ltM+ss;
      const onHand=Math.round(mq*(ltM*(.35+3.9*hashN(p.no))+1)*10)/10;
      let status='Healthy';if(rop>0.05){if(onHand<rop*.6)status='Order now';else if(onHand<rop)status='Reorder soon';else if(onHand>rop*3.2)status='Excess';}
      const need=Math.max(0,rop+fq*Math.min(3,Math.max(1,ltM))-onHand);
      rows.push({...p,fam:f.id,hist,fc,qHist,qF,t12,f12,delta:t12?f12/t12-1:0,fq,mq,rop,ss,onHand,cover:fq?onHand/fq:99,status,need});
    });});
  return rows;
}
