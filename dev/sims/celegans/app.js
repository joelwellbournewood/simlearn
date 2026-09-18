import { WormBrain, TUNE } from './brain.js';
import { WormBody, Environment, BTUNE, widthAt } from './body.js';
import { SOC, socialStep } from './social.js';

const el=id=>document.getElementById(id);
// set the dashboard class before anything measures the stage: the docked
// column widths (and therefore the dish's shape) depend on it
if (window.innerWidth>=1100) document.body.classList.add('dash');
// The dish is a rectangle of fixed AREA (40 mm^2-ish in model units) whose
// aspect ratio is chosen from the shape of the column it has to live in, so a
// tall narrow stage gets a tall narrow dish instead of a letterboxed strip.
// Preset geometry is authored in the canonical 8x5 frame and mapped (mx/my/mr).
let W=8, H=5;
const DISH_AREA=40, KW=8, KH=5;
function pickDish(){
  const st=el('stage'); if(!st) return;
  const w=st.clientWidth, h=st.clientHeight; if(!w||!h) return;
  const a=Math.min(2.2,Math.max(0.60,w/h));
  W=Math.sqrt(DISH_AREA*a); H=Math.sqrt(DISH_AREA/a);
}
pickDish();
// x and y stretch with the dish; radii use the AREA-preserving mean so a food
// patch is the same size of meal whatever shape the dish is
const mx=x=>x/KW*W, my=y=>y/KH*H, mr=r=>r*Math.sqrt((W/KW)*(H/KH));
const AF=(x,y,r,a)=>env.addFood(mx(x),my(y),mr(r),a);
const AW=(x1,y1,x2,y2)=>env.addWall(mx(x1),my(y1),mx(x2),my(y2));
const AO=(x,y,r)=>env.addObstacle(mx(x),my(y),mr(r));
const data=await fetch('./celegans-connectome.json').then(r=>r.json());
// ---- the animals -------------------------------------------------------
// Up to MAXW independent worms share the dish: each one owns a full brain, a
// full body and its own trail. Everything downstream (readouts, poses,
// captions) reads the SELECTED worm through the `brain`/`body` aliases.
const MAXW=8;
let nextId=0;
class Worm{
  constructor(x,y,ang){
    this.id=++nextId;
    this.brain=new WormBrain(data);
    this.body=new WormBody(x,y,ang);
    this.trail=[]; this.pokePulse=null; this.eaten=0; this.soc={};
  }
}
let worms=[new Worm(W*0.35,H*0.5,0.3)];
let sel=0;
let brain=worms[0].brain, body=worms[0].body;
let env=new Environment(W,H);
function selectWorm(k){
  if(k<0||k>=worms.length||k===sel) { syncWormChips(); return; }
  sel=k; brain=worms[k].brain; body=worms[k].body; selectedNeuron=-1;
  syncWormChips(); if(typeof sizeViz==='function') sizeViz();
}

const cv=el('c'), ctx=cv.getContext('2d');
let scale=1, ox=0, oy=0, paused=false, eaten=0, tool='food';
let ripples=[], dragA=null, dragB=null;
// the dish is fitted into the space BETWEEN the floating panels, never under them
function safeRect(w,h){
  let L=14,R=w-14,T=14,B=h-46;
  const overlayMode=window.innerWidth<=820||document.body.classList.contains('clean');
  if(!overlayMode){
    // Panel rectangles are in VIEWPORT coordinates and the dish rect is in
    // STAGE coordinates. Above 1100px the stage is a real grid column that
    // starts where the left panel ends, so the two frames differ and the
    // panels do not overlap the stage at all - converting first makes the
    // squeeze fall out to zero there instead of double-counting the columns.
    const sr=el('stage').getBoundingClientRect();
    const pe=el('panel'), ve=el('vizpanel');
    if(pe&&getComputedStyle(pe).display!=='none'){const r=pe.getBoundingClientRect(); if(r.width>0&&r.right-sr.left>0&&r.left-sr.left<w) L=Math.max(L,r.right-sr.left+14);}
    if(ve&&getComputedStyle(ve).display!=='none'){const r=ve.getBoundingClientRect(); if(r.width>0&&r.left-sr.left<w&&r.right-sr.left>0) R=Math.min(R,r.left-sr.left-14);}
  }
  // never fully hand the dish rect back to full-bleed here: that would put
  // the dish UNDER the panels, which is the one thing this function exists
  // to prevent. If the squeeze is severe, shrink the dish instead of
  // deleting the margins (an unusably narrow dish beats an overlapping one).
  const minDish=120;
  if(R-L<minDish){ R=Math.min(w-14,L+minDish); if(R-L<minDish) L=Math.max(14,R-minDish); }
  if(B-T<140){T=14;B=h-14;}
  return {L,R,T,B};
}
function resize(){
  const st=el('stage'), w=st.clientWidth, h=st.clientHeight;
  let dpr=Math.min(window.devicePixelRatio||1, Math.sqrt(3.2e6/(w*h)));
  cv.width=Math.round(w*dpr); cv.height=Math.round(h*dpr);
  cv.style.width=w+'px'; cv.style.height=h+'px';
  ctx.setTransform(dpr,0,0,dpr,0,0);
  const sr=safeRect(w,h);
  scale=Math.min((sr.R-sr.L)/W,(sr.B-sr.T)/H);
  ox=sr.L+((sr.R-sr.L)-W*scale)/2; oy=sr.T+((sr.B-sr.T)-H*scale)/2;
}
// ---- pixel-art dish: naturalistic agar micro-environment, generated once
const PIX=4; let bgCv=null;
function makeBg(){
  const bw=Math.ceil(W*scale/PIX), bh=Math.ceil(H*scale/PIX);
  bgCv=document.createElement('canvas'); bgCv.width=bw; bgCv.height=bh;
  const c=bgCv.getContext('2d');
  let seed=90210; const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  const GX=26,GY=17,g=[]; for(let i=0;i<GX*GY;i++) g.push(rnd());
  const val=(x,y)=>{ // bilinear value noise
    const fx=x*(GX-1),fy=y*(GY-1),x0=Math.min(GX-2,Math.floor(fx)),y0=Math.min(GY-2,Math.floor(fy));
    const tx=fx-x0,ty=fy-y0;
    return g[y0*GX+x0]*(1-tx)*(1-ty)+g[y0*GX+x0+1]*tx*(1-ty)+g[(y0+1)*GX+x0]*(1-tx)*ty+g[(y0+1)*GX+x0+1]*tx*ty;
  };
  for(let j=0;j<bh;j++) for(let i=0;i<bw;i++){
    const u=i/bw,v=j/bh;
    const n=0.62*val(u,v)+0.38*val(u*3.7%1,v*3.7%1);
    const light=1-0.55*Math.hypot(u-0.5,(v-0.5)*0.9); // scope illumination
    let r=22+26*n*light, gg=24+30*n*light, b=14+16*n*light; // humus olive-browns
    const q=rnd();
    if(q>0.982){ r+=30;gg+=28;b+=12; }        // pale grain of detritus
    else if(q<0.012){ r*=0.55;gg*=0.6;b*=0.55; } // dark pore
    else if(q>0.965){ r+=8;gg+=20;b+=4; }     // moss fleck
    c.fillStyle='rgb('+(r|0)+','+(gg|0)+','+(b|0)+')';
    c.fillRect(i,j,1,1);
  }
}
window.addEventListener('resize',()=>{resize();makeBg();}); resize(); makeBg();
const w2x=x=>ox+x*scale, w2y=y=>oy+y*scale;
const x2w=x=>(x-ox)/scale, y2w=y=>(y-oy)/scale;

// ---- presets: fixed dishes, no randomness ----
const PRESETS={
  'Open dish':{tag:'One worm, one meal, a lot of agar', make(){ AF(6.1,3.6,1.0,0.6); }},
  'Dinner trail':{tag:'Five drops laid in an arc, scent overlapping', make(){
    const pts=[[2.2,1.3],[3.4,1.1],[4.6,1.5],[5.7,2.3],[6.4,3.4]];
    for (const [x,y] of pts) AF(x,y,0.55,0.45); }},
  'The corridor':{tag:'Food at the end of a bent hallway', make(){
    AW(2.2,1.4,5.8,1.4); AW(2.2,2.6,5.0,2.6);
    AW(5.8,1.4,5.8,3.9); AW(5.0,2.6,5.0,3.9);
    AF(5.4,4.3,1.2,0.5); }},
  'Post forest':{tag:'Thread the pillars to reach the lawn', make(){
    for (let i=0;i<4;i++) for (let j=0;j<3;j++) AO(2.6+i*1.0,1.4+j*1.1,0.22);
    AF(7.0,2.5,1.2,0.6); }},
  'The corner':{tag:'A dead end; watch the nose neurons argue it out', make(){
    AW(6.6,2.5,4.4,1.1); AW(6.6,2.5,4.4,3.9);
    AF(7.3,4.2,0.9,0.5); }},
};
let lastPreset=null;
function loadPreset(name,btn){
  lastPreset=name;
  pickDish();
  env=new Environment(W,H); PRESETS[name].make();
  resize(); makeBg();
  // every animal gets a fresh start, spread across the new dish
  worms.forEach((w,k)=>{
    const f=(k+1)/(worms.length+1);
    w.body.reset(W*(0.18+0.6*f), H*(0.3+0.4*((k%3)/2)), 0.2+k*0.9);
    w.brain.reset(); w.trail.length=0; w.pokePulse=null;
  });
  eaten=0;
  document.querySelectorAll('.preset').forEach(b=>b.setAttribute('aria-pressed',String(b===btn)));
}
{ const holder=el('presets'); let first=null;
  Object.entries(PRESETS).forEach(([name,p],i)=>{
    const b=document.createElement('button'); b.className='preset';
    b.innerHTML='<b>'+name+'</b><small>'+p.tag+'</small>';
    b.addEventListener('click',()=>loadPreset(name,b));
    holder.appendChild(b); if(i===0)first=b;
  });
  loadPreset('Open dish',first);
}
// ---- the colony ---------------------------------------------------------
function addWorm(x,y,ang){
  if (worms.length>=MAXW) return null;
  const a=(ang===undefined)?Math.random()*6.283:ang;
  const w=new Worm(Math.max(0.35,Math.min(W-0.35,x)),Math.max(0.35,Math.min(H-0.35,y)),a);
  worms.push(w); selectWorm(worms.length-1); syncWormChips(); return w;
}
function removeWorm(k){
  if (worms.length<=1) return;
  worms.splice(k,1);
  selectWorm(Math.min(sel,worms.length-1));
  sel=Math.min(sel,worms.length-1); brain=worms[sel].brain; body=worms[sel].body;
  syncWormChips();
}
function syncWormChips(){
  const box=el('wchips'); if(!box) return;
  box.innerHTML='';
  worms.forEach((w,k)=>{
    const b=document.createElement('button');
    b.className='wchip'; b.textContent=String(w.id);
    b.setAttribute('aria-pressed',String(k===sel));
    b.title='Show worm '+w.id+' in the readouts';
    b.addEventListener('click',()=>selectWorm(k));
    box.appendChild(b);
  });
  const add=el('b-addworm'); if(add) add.disabled=worms.length>=MAXW;
  const rm=el('b-rmworm'); if(rm) rm.disabled=worms.length<=1;
}
function updateHud(n){
  const e=el('wormstat'); if(!e) return;
  const nb=worms[sel].soc.nb||0;
  e.textContent=worms.length+(worms.length>1?' worms':' worm')+' \u00b7 readouts show #'+worms[sel].id
    +' \u00b7 '+realSpeed.toFixed(1)+'x actual'+(worms.length>1?' \u00b7 neighbours '+nb.toFixed(2):'');
}
// ---- tools ----
document.querySelectorAll('.tool').forEach(b=>b.addEventListener('click',()=>{
  tool=b.dataset.tool;
  document.querySelectorAll('.tool').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));
}));
function wormAt(x,y,rad){
  let best=-1,bd=rad||0.28,bi=-1;
  for (let k=0;k<worms.length;k++){
    const b=worms[k].body;
    for (let i=0;i<BTUNE.NP;i++){ const d=Math.hypot(b.px[i]-x,b.py[i]-y); if(d<bd){bd=d;best=k;bi=i;} }
  }
  return {k:best,i:bi};
}
function poke(x,y){
  const hit=wormAt(x,y,0.35);
  const bi=hit.i;
  if (bi<0) return false;
  selectWorm(hit.k);
  const w=worms[hit.k], brain=w.brain;
  const region=bi<6?'nose':bi<20?'anterior':'posterior';
  // a deliberate prod is the full escape response, not a nudge: prod() sets
  // the commanded backing / forward sprint and the habituation, and the
  // volley keeps the touch cells firing for a third of a second so you can
  // watch ALM/AVM/ASH light up on the readouts
  brain.prod(region,2.0);
  w.pokePulse={region,t:0.35};
  ripples.push({x,y,r:0.06,a:1});
  ripples.push({x,y,r:0.02,a:1.4});
  return true;
}
cv.addEventListener('pointerdown',e=>{
  const x=x2w(e.offsetX),y=y2w(e.offsetY);
  if (x<0||x>W||y<0||y>H) return;
  if (tool==='wall'){ dragA=[x,y]; dragB=[x,y]; return; }
  if (tool==='worm'){ addWorm(x,y); return; }
  // clicking an animal always makes it the one the readouts are about
  { const hit=wormAt(x,y,0.3); if(hit.k>=0) selectWorm(hit.k); }
  if (tool==='food') env.addFood(x,y,1.0,0.55);
  else if (tool==='post') env.addObstacle(x,y,0.22);
  else if (tool==='erase') env.removeAt(x,y);
  else if (tool==='poke') poke(x,y);
});
cv.addEventListener('pointermove',e=>{ if(dragA) dragB=[x2w(e.offsetX),y2w(e.offsetY)]; });
window.addEventListener('pointerup',()=>{
  if (dragA&&dragB&&Math.hypot(dragB[0]-dragA[0],dragB[1]-dragA[1])>0.15)
    env.addWall(dragA[0],dragA[1],dragB[0],dragB[1]);
  dragA=dragB=null;
});

// ---- sliders ----
function bind(id,vid,fmt,set){ const s=el(id),v=el(vid);
  const f=()=>{v.textContent=fmt(parseFloat(s.value)); set(parseFloat(s.value));};
  s.addEventListener('input',f); f(); }
let simSpeed=1;
bind('s-speed','v-speed',v=>(v<1?v.toFixed(2):v.toFixed(v%1?1:0))+'x',v=>simSpeed=v);
bind('s-smell','v-smell',v=>v.toFixed(1),v=>TUNE.senseGain=6*v);
bind('s-medium','v-medium',v=>v<0.25?'water':v<0.75?'thick gel':'agar surface',v=>{ BTUNE.load=v; TUNE.load=v; });

// ---- right-hand visualization: five selectable windows into the machine ----
const VIEWS=['nerves','gang','geo','muscles','scent','signals'];
let vizOn; try{ vizOn=new Set(JSON.parse(localStorage.getItem('celeg-viz'))||[]); }catch(e){ vizOn=new Set(); }
if (![...vizOn].some(v=>VIEWS.includes(v))) vizOn=new Set(['nerves','gang','muscles','scent']);
vizOn.delete('geo_legacy');
// the visualizations are half the point of this sim, so on a big screen the
// panel starts expanded (and the dish gives up the width) unless the reader
// has previously chosen otherwise
let vizWide=window.innerWidth>=1500;
try{ const st=localStorage.getItem('celeg-wide'); if(st!==null) vizWide=(st==='1'); }catch(e){}
const vdpr=Math.min(window.devicePixelRatio||1,2);
const VC={}; for (const v of VIEWS) VC[v]=el({nerves:'nerves',gang:'geohead',geo:'geo',muscles:'muscles',scent:'scentcv',signals:'signals'}[v]);
const VG={}; for (const v of VIEWS) VG[v]=VC[v].getContext('2d');
let nervesGrid={NC:20,CS:11,rows:15};
// Dashboard mode: >=1100px every readout is on at once and every canvas is
// sized from the space actually left in the window, so nothing scrolls.
function dashOn(){ return window.innerWidth>=1100 && !document.body.classList.contains('clean') && !document.body.classList.contains('fs'); }
function shown(v){ return dashOn() ? true : vizOn.has(v); }
function sizeDash(){
  const vp=el('vizpanel'), vb=document.querySelector('.vbody');
  for (const v of VIEWS) el('sec-'+v).classList.add('on');
  const pw=vb.clientWidth; if(!pw) return;
  const top=vb.getBoundingClientRect().top;
  document.documentElement.style.setProperty('--vtop',Math.round(top+24)+'px');
  const availH=Math.max(330, window.innerHeight-top-24);
  const GAP=9, CGAP=12, CHROME=34;              // row gap, column gap, label+caption
  const rowH=Math.floor((availH-2*GAP)/3);
  const cellH=Math.max(60,rowH-CHROME);
  // 12 equal columns with a gap between each: a box spanning n of them is
  // n columns plus the n-1 gaps it swallows
  const col=(pw-11*CGAP)/12, span=n=>Math.floor(n*col+(n-1)*CGAP);
  const w7=span(7), w5=span(5);      // row 1: neuron table | ganglia
  const w6=span(6);                  // row 2: whole body | muscles
  const w9=span(9), w3=span(3);      // row 3: traces | scent
  const set=(v,w,h)=>{ const c=VC[v]; c.width=Math.max(8,Math.round(w*vdpr)); c.height=Math.max(8,Math.round(h*vdpr));
    c.style.width=Math.round(w)+'px'; c.style.height=Math.round(h)+'px'; };
  set('gang',w5,cellH);
  set('geo',w6,Math.min(cellH,Math.round(w6*0.52)));
  set('muscles',w6,Math.min(cellH,Math.round(w6*0.46)));
  set('signals',w9,cellH);
  const sw=Math.min(w3,Math.round(cellH*W/H)); set('scent',sw,Math.round(sw*H/W));
  // the neuron table tiles its own cell: pick the column count that fits
  const cell=Math.sqrt(w7*cellH/brain.N);
  let NC=Math.max(6,Math.floor(w7/cell)); let rows=Math.ceil(brain.N/NC);
  while (rows*Math.floor(w7/NC)>cellH && NC<46){ NC++; rows=Math.ceil(brain.N/NC); }
  const CSpx=Math.min(Math.floor(w7/NC),Math.floor(cellH/rows));
  const CS=Math.max(3,Math.floor(CSpx*vdpr));
  nervesGrid={NC,CS,rows};
  const nc=VC.nerves; nc.width=NC*CS; nc.height=rows*CS;
  nc.style.width=(NC*CS/vdpr)+'px'; nc.style.height=(rows*CS/vdpr)+'px';
}
function sizeViz(){
  document.body.classList.toggle('dash',dashOn());
  if (dashOn()){
    el('vizpanel').classList.remove('wide','cols2'); document.body.classList.remove('vwide');
    for (const v of VIEWS) document.querySelector('.vchip[data-v="'+v+'"]').setAttribute('aria-pressed','true');
    sizeDash(); return;
  }
  for (const v of VIEWS){ const c=VC[v]; c.style.width=''; c.style.height=''; }
  // don't let the expanded panel crowd the dish into the left panel on
  // narrower desktop windows: only honour the "wide" preference once there
  // is comfortably room for both panels plus a usable dish between them
  const wideOK=vizWide && window.innerWidth>=1180;
  const vp=el('vizpanel');
  vp.classList.toggle('wide',wideOK);
  // docked layout: the column width is a custom property on <body> so the
  // stage's right inset and the icon buttons track it automatically
  document.body.classList.toggle('vwide',wideOK);
  el('v-wide').setAttribute('aria-pressed',String(wideOK));
  for (const v of VIEWS){
    const on=vizOn.has(v);
    el('sec-'+v).classList.toggle('on',on);
    document.querySelector('.vchip[data-v="'+v+'"]').setAttribute('aria-pressed',String(on));
  }
  // two-column packing once each column would still be at least 300px wide,
  // measured rather than guessed from the viewport
  const pw=vp.clientWidth-30;
  vp.classList.toggle('cols2', pw>=560);
  // the first open section in each grid column must not carry a top rule
  {
    const open=VIEWS.map(v=>el('sec-'+v)).filter(e=>e.classList.contains('on'));
    open.forEach(e=>e.classList.remove('notop'));
    // the section at the top of each grid column carries no rule above it
    const nCols=vp.classList.contains('cols2')?2:1;
    let col=0;
    for (const e of open){
      if (e.classList.contains('vspan')){ if(col===0) e.classList.add('notop'); break; }
      e.classList.add('notop');
      if (++col>=nCols) break;
    }
  }
  for (const v of VIEWS){
    if (!vizOn.has(v)) continue;
    const c=VC[v], cw=c.clientWidth; if(!cw) continue;
    let ch;
    if (v==='nerves'){ const NC=cw>=380?30:20, rows=Math.ceil(brain.N/NC), CS=Math.floor(cw*vdpr/NC);
      nervesGrid={NC,CS,rows}; c.width=NC*CS; c.height=rows*CS; c.style.height=(rows*CS/vdpr)+'px'; continue; }
    if (v==='geo') ch=Math.round(cw*0.34);
    else if (v==='gang') ch=Math.round(cw*0.95);
    else if (v==='muscles') ch=Math.round(cw*0.46);
    else if (v==='scent') ch=Math.round(cw*H/W);
    else ch=Math.max(200,Math.min(300,Math.round(cw*0.30)));
    c.width=Math.round(cw*vdpr); c.height=Math.round(ch*vdpr); c.style.height=ch+'px';
  }
}
document.querySelectorAll('.vchip').forEach(b=>b.addEventListener('click',()=>{
  const v=b.dataset.v; vizOn.has(v)?vizOn.delete(v):vizOn.add(v);
  try{ localStorage.setItem('celeg-viz',JSON.stringify([...vizOn])); }catch(e){}
  sizeViz();
}));
el('v-wide').addEventListener('click',()=>{
  vizWide=!vizWide; try{ localStorage.setItem('celeg-wide',vizWide?'1':'0'); }catch(e){}
  sizeViz(); resize(); makeBg(); sizeViz();
});
window.addEventListener('resize',sizeViz);
// In the docked layout the controls column has the whole window height, so
// every group starts open - there is no reason to make the reader hunt for
// the sliders. Narrow windows keep the compact bottom-sheet defaults.
if (window.innerWidth>=1100) document.querySelectorAll('.panel details.grp').forEach(d=>{d.open=true;});
// shared pose: the body rotated head-left into its own frame, with dorsal normals.
// dorsal drive bends the chain toward the (-ty,tx) normal (verified against the
// sign of the joint turn), so that side carries the dorsal band and the D label.
const NPP=BTUNE.NP;
const pose={qx:new Float32Array(NPP),qy:new Float32Array(NPP),nx:new Float32Array(NPP),ny:new Float32Array(NPP),minY:0,maxY:0};
function computePose(){
  const n=NPP, px=body.px, py=body.py;
  let cx=0,cy=0; for(let i=0;i<n;i++){cx+=px[i];cy+=py[i];} cx/=n; cy/=n;
  const ang=Math.atan2(py[n-1]-py[0],px[n-1]-px[0]), co=Math.cos(-ang), si=Math.sin(-ang);
  let mnY=1e9,mxY=-1e9;
  for(let i=0;i<n;i++){
    const dx=px[i]-cx, dy=py[i]-cy;
    pose.qx[i]=dx*co-dy*si; pose.qy[i]=dx*si+dy*co;
    if(pose.qy[i]<mnY)mnY=pose.qy[i]; if(pose.qy[i]>mxY)mxY=pose.qy[i];
  }
  for(let i=0;i<n;i++){
    const im=Math.max(0,i-1), ip=Math.min(n-1,i+1);
    let tx=pose.qx[ip]-pose.qx[im], ty=pose.qy[ip]-pose.qy[im];
    const L=Math.hypot(tx,ty)||1e-9;
    pose.nx[i]=-ty/L; pose.ny[i]=tx/L;
  }
  pose.minY=mnY; pose.maxY=mxY;
}
function poseMap(c,wScale){ // canvas transform for the body frame
  const cw=c.width, ch=c.height, pad=14*vdpr;
  let S=(cw-2*pad)/1.06;
  const bh=Math.max(pose.maxY-pose.minY+0.1+0.1*(wScale||1),0.24);
  if (bh*S>ch-2*pad) S=(ch-2*pad)/bh;
  return {S, cx:cw/2, cy:ch/2-((pose.maxY+pose.minY)/2)*S};
}
const order=[...Array(brain.N).keys()].sort((a,b)=>{
  const r={'S':0,'I':1,'M':2};
  return (r[brain.cat[a]]-r[brain.cat[b]])||(brain.names[a]<brain.names[b]?-1:1);
});
const catColor={S:[230,195,79],I:[86,224,194],M:[255,125,92]};
const orderPos=new Int16Array(brain.N); order.forEach((gi,k)=>orderPos[gi]=k);
let selectedNeuron=-1; // persists across frames; set by clicking the grid or either body view
function pinNeuron(i){ selectedNeuron=i; nameCell(i,'ncap'); nameCell(i,'gcap'); if(headPos[i]!==undefined) nameCell(i,'hcap'); }

// ---- static anatomical layout for "where, not how it's moving" panels ----
// (muscles + firing map): the live crawl is already visible on the main
// canvas, so these use a fixed straight reference frame; only the coloring
// (activity / muscle drive) is live. Head at left, tail at right, always.
let maxBodyW=0; for (let k=0;k<200;k++) maxBodyW=Math.max(maxBodyW,widthAt(k/199));
function bodyPointStatic(u,off){ return [u-0.5, off]; }
function poseMapStatic(c,wScale){
  const cw=c.width, ch=c.height, pad=14*vdpr;
  let S=(cw-2*pad)/1.06;
  const bh=Math.max(2*maxBodyW*(wScale||1)+0.12,0.24);
  if (bh*S>ch-2*pad) S=(ch-2*pad)/bh;
  return {S, cx:cw/2, cy:ch/2};
}
function ribbonStatic(g,M,alphaFill,alphaLine,wS){ const WS=wS||1, steps=120;
  g.beginPath();
  for (let i=0;i<=steps;i++){ const u=i/steps, w=widthAt(u)*WS, pt=bodyPointStatic(u,w);
    const x=M.cx+pt[0]*M.S, y=M.cy+pt[1]*M.S; i?g.lineTo(x,y):g.moveTo(x,y); }
  for (let i=steps;i>=0;i--){ const u=i/steps, w=widthAt(u)*WS, pt=bodyPointStatic(u,-w);
    const x=M.cx+pt[0]*M.S, y=M.cy+pt[1]*M.S; g.lineTo(x,y); }
  g.closePath();
  g.fillStyle='rgba(226,238,229,'+alphaFill+')'; g.fill();
  g.strokeStyle='rgba(160,190,175,'+alphaLine+')'; g.lineWidth=vdpr; g.stroke();
}

// ---- head-ganglia inset ----
// The nerve ring + head ganglia (189 of 300 cells, anatomical x<0.15) is the
// densest, least legible cluster in the full-body map. A copy of their real
// relative positions is relaxed apart (repulsion + weak spring home) just
// enough to read individually, once at load; their actual wired synapses
// (Cook et al. 2019 chemical connectome + gap junctions, same data used to
// drive the model) are drawn as a live-lighting graph, not schematic lines.
const NPOS=data.pos;
const HEAD_THRESH=0.15;
const headIdx=[]; for (let i=0;i<data.pos.length;i++) if (data.pos[i][0]<HEAD_THRESH) headIdx.push(i);
const headPos={}; headIdx.forEach((gi,li)=>headPos[gi]=li);
const HN=headIdx.length;
const headAdj=Array.from({length:HN},()=>[]);
(function buildHeadAdj(){
  const hset=new Set(headIdx);
  const add=(a,b)=>{ if(hset.has(a)&&hset.has(b)) headAdj[headPos[a]].push(headPos[b]); };
  for (const e of data.chem) add(e[0],e[1]);
  for (const e of data.gap){ add(e[0],e[1]); add(e[1],e[0]); }
})();
const hlx=new Float32Array(HN), hly=new Float32Array(HN);
(function relaxHeadLayout(){
  for (let k=0;k<HN;k++){ const p=NPOS[headIdx[k]]; hlx[k]=(p[0]/HEAD_THRESH)*2-1; hly[k]=p[1]*2.4; }
  const hx0=hlx.slice(), hy0=hly.slice();
  const minD=0.15, fx=new Float32Array(HN), fy=new Float32Array(HN);
  for (let iter=0;iter<220;iter++){
    fx.fill(0); fy.fill(0);
    for (let a=0;a<HN;a++) for (let b=a+1;b<HN;b++){
      const dx=hlx[a]-hlx[b], dy=hly[a]-hly[b], d2=dx*dx+dy*dy;
      if (d2<minD*minD && d2>1e-9){ const d=Math.sqrt(d2), push=(minD-d)/d*0.5;
        fx[a]+=dx*push; fy[a]+=dy*push; fx[b]-=dx*push; fy[b]-=dy*push; }
    }
    for (let a=0;a<HN;a++){
      fx[a]+=(hx0[a]-hlx[a])*0.03; fy[a]+=(hy0[a]-hly[a])*0.03;
      hlx[a]+=fx[a]*0.6; hly[a]+=fy[a]*0.6;
    }
  }
  let mnx=1e9,mxx=-1e9,mny=1e9,mxy=-1e9;
  for (let k=0;k<HN;k++){ mnx=Math.min(mnx,hlx[k]); mxx=Math.max(mxx,hlx[k]); mny=Math.min(mny,hly[k]); mxy=Math.max(mxy,hly[k]); }
  const sx=1.7/Math.max(1e-6,mxx-mnx), sy=1.7/Math.max(1e-6,mxy-mny), ccx=(mnx+mxx)/2, ccy=(mny+mxy)/2;
  for (let k=0;k<HN;k++){ hlx[k]=(hlx[k]-ccx)*sx; hly[k]=(hly[k]-ccy)*sy; }
})();
let geoHeadHover=-1;
function headMapXY(c,k){
  // anisotropic fit, ratio-capped: a wide short box should still be used, but
  // the ganglion schematic must not stretch into an unrecognisable smear
  const pad=14*vdpr, cx=c.width/2, cy=c.height/2;
  let sx=(c.width-2*pad)/2, sy=(c.height-2*pad)/2;
  const R=1.7;
  if (sx>sy*R) sx=sy*R; if (sy>sx*R) sy=sx*R;
  return [cx+hlx[k]*sx, cy+hly[k]*sy, Math.min(sx,sy), cx, cy];
}
// Head-ganglion view. The old version added every glow together ('lighter')
// and drew a line for any cell above a threshold, so a busy moment washed out
// to a white blur. Now: a dim static scaffold of the real wiring, the ACTIVE
// synapses drawn on top coloured by sign and weighted by how much signal is
// actually passing (pre x post x |w|), capped at the strongest few so the
// picture stays readable, and node glow that cannot saturate.
const headEdges=(function(){
  const out=[], hset=new Set(headIdx), seen=new Set();
  for (const e of data.chem){
    if (!hset.has(e[0])||!hset.has(e[1])) continue;
    out.push([headPos[e[0]],headPos[e[1]],e[2],e[2]<0?-1:1]);
  }
  for (const e of data.gap){
    if (!hset.has(e[0])||!hset.has(e[1])) continue;
    const k=Math.min(e[0],e[1])+'-'+Math.max(e[0],e[1]); if(seen.has(k)) continue; seen.add(k);
    out.push([headPos[e[0]],headPos[e[1]],e[2]||1,0]);
  }
  let mw=1e-6; for (const e of out) mw=Math.max(mw,Math.abs(e[2]));
  for (const e of out) e[2]=Math.abs(e[2])/mw;
  return out;
})();
const EDGE_COL={1:'134,255,214', '-1':'186,150,255', 0:'150,196,226'};
function drawHeadInset(){
  const c=document.getElementById('geohead'); if (!c || !c.width) return;
  const g=c.getContext('2d');
  g.fillStyle='#060f0c'; g.fillRect(0,0,c.width,c.height);
  const P=[]; for (let k=0;k<HN;k++){ const m=headMapXY(c,k); P.push([m[0],m[1]]); }
  // scaffold: the whole head wiring, barely there
  g.strokeStyle='rgba(120,152,140,0.055)'; g.lineWidth=vdpr; g.beginPath();
  for (const e of headEdges){ g.moveTo(P[e[0]][0],P[e[0]][1]); g.lineTo(P[e[1]][0],P[e[1]][1]); }
  g.stroke();
  // live traffic: keep the strongest, draw weakest first so the loud ones win
  const live=[];
  for (const e of headEdges){
    const a=brain.activity[headIdx[e[0]]], b=brain.activity[headIdx[e[1]]];
    const sgl=a*(0.35+0.65*b)*(0.35+0.65*e[2]);
    if (sgl>0.05) live.push([sgl,e]);
  }
  live.sort((u,v)=>u[0]-v[0]);
  const keep=live.slice(-90);
  for (const [sgl,e] of keep){
    const col=EDGE_COL[e[3]];
    g.strokeStyle='rgba('+col+','+(0.10+0.55*Math.min(1,sgl)).toFixed(3)+')';
    g.lineWidth=(0.8+1.5*Math.min(1,sgl))*vdpr;
    g.beginPath(); g.moveTo(P[e[0]][0],P[e[0]][1]); g.lineTo(P[e[1]][0],P[e[1]][1]); g.stroke();
  }
  // nodes: a dark seat so overlapping cells stay separate, then a bounded glow
  for (let k=0;k<HN;k++){
    const gi=headIdx[k], a=brain.activity[gi], cc=catColor[brain.cat[gi]];
    const x=P[k][0], y=P[k][1];
    if (a>0.25){
      g.globalAlpha=Math.min(0.5,0.5*(a-0.25)/0.75+0.08);
      const r=(4+5*a)*vdpr;
      g.drawImage(sprites[brain.cat[gi]],x-r,y-r,2*r,2*r);
      g.globalAlpha=1;
    }
    const rr=(1.7+1.5*a)*vdpr;
    g.beginPath(); g.arc(x,y,rr+vdpr,0,7); g.fillStyle='rgba(6,15,12,0.9)'; g.fill();
    g.beginPath(); g.arc(x,y,rr,0,7);
    g.fillStyle='rgba('+cc[0]+','+cc[1]+','+cc[2]+','+(0.3+0.7*a).toFixed(3)+')'; g.fill();
  }
  const pin = selectedNeuron>=0 && headPos[selectedNeuron]!==undefined ? headPos[selectedNeuron] : (geoHeadHover>=0?geoHeadHover:-1);
  if (pin>=0){ g.beginPath(); g.arc(P[pin][0],P[pin][1],7*vdpr,0,7); g.strokeStyle='#e3efe9'; g.lineWidth=1.4*vdpr; g.stroke(); }
  g.fillStyle='rgba(136,163,151,.7)'; g.font=(9*vdpr)+'px "Space Mono",monospace';
  g.fillText(HN+' cells \u00b7 teal excite, violet inhibit, blue gap',7*vdpr,c.height-7*vdpr);
}
document.getElementById('geohead').addEventListener('mousemove',e=>{
  const c=e.target, r=c.getBoundingClientRect();
  const x=(e.clientX-r.left)*vdpr, y=(e.clientY-r.top)*vdpr;
  let bi=-1,bd=14*vdpr;
  for (let k=0;k<HN;k++){ const [hx,hy]=headMapXY(c,k); const d=Math.hypot(hx-x,hy-y); if(d<bd){bd=d;bi=k;} }
  geoHeadHover=bi;
  if (bi>=0) nameCell(headIdx[bi],'hcap'); else if(selectedNeuron<0) el('hcap').textContent='hover a cell';
});
document.getElementById('geohead').addEventListener('mouseleave',()=>{ geoHeadHover=-1; if(selectedNeuron>=0) nameCell(selectedNeuron,'hcap'); else el('hcap').textContent='hover a cell'; });
document.getElementById('geohead').addEventListener('click',()=>{ if (geoHeadHover>=0) pinNeuron(headIdx[geoHeadHover]); });
function glowSprite(c){
  const s=document.createElement('canvas'); s.width=s.height=48;
  const g=s.getContext('2d'), rg=g.createRadialGradient(24,24,0,24,24,24);
  rg.addColorStop(0,'rgba('+c[0]+','+c[1]+','+c[2]+',0.85)');
  rg.addColorStop(0.35,'rgba('+c[0]+','+c[1]+','+c[2]+',0.28)');
  rg.addColorStop(1,'rgba('+c[0]+','+c[1]+','+c[2]+',0)');
  g.fillStyle=rg; g.fillRect(0,0,48,48); return s;
}
const sprites={S:glowSprite(catColor.S),I:glowSprite(catColor.I),M:glowSprite(catColor.M)};
function nameCell(i,capEl){
  const cat={S:'sensory',I:'interneuron',M:'motor'}[brain.cat[i]];
  el(capEl).textContent=brain.names[i]+' ('+cat+') '+(brain.activity[i]*100).toFixed(0)+'%';
}
function nervesK(e){
  const r=VC.nerves.getBoundingClientRect(), G=nervesGrid;
  return Math.floor((e.clientY-r.top)/r.height*G.rows)*G.NC+Math.floor((e.clientX-r.left)/r.width*G.NC);
}
VC.nerves.addEventListener('mousemove',e=>{
  const k=nervesK(e);
  if (k>=0&&k<brain.N) nameCell(order[k],'ncap');
  else if (selectedNeuron>=0) nameCell(selectedNeuron,'ncap'); else el('ncap').textContent='';
});
VC.nerves.addEventListener('click',e=>{
  const k=nervesK(e); if (k>=0&&k<brain.N) pinNeuron(order[k]);
});
VC.nerves.addEventListener('mouseleave',()=>{
  if (selectedNeuron>=0) nameCell(selectedNeuron,'ncap'); else el('ncap').textContent='hover or click a cell to name it';
});
function drawNeurons(){
  const g=VG.nerves, c=VC.nerves, G=nervesGrid;
  g.fillStyle='#07120f'; g.fillRect(0,0,c.width,c.height);
  for (let k=0;k<brain.N;k++){
    const i=order[k], a=brain.activity[i], cc=catColor[brain.cat[i]];
    g.fillStyle='rgba('+cc[0]+','+cc[1]+','+cc[2]+','+(0.06+0.94*a*a).toFixed(3)+')';
    g.fillRect((k%G.NC)*G.CS+1,Math.floor(k/G.NC)*G.CS+1,G.CS-2,G.CS-2);
  }
  if (selectedNeuron>=0){
    const k=orderPos[selectedNeuron];
    g.strokeStyle='#e3efe9'; g.lineWidth=1.6*vdpr;
    g.strokeRect((k%G.NC)*G.CS+1,Math.floor(k/G.NC)*G.CS+1,G.CS-2,G.CS-2);
  }
}
// geometric firing map: every neuron at its true place in the body it is driving.
// soma positions from the wormneuroatlas anatomical atlas, projected on the
// anterior-posterior x dorso-ventral plane (the plane the crawl happens in).
const geoSX=new Float32Array(brain.N), geoSY=new Float32Array(brain.N);
let geoHover=-1;
function bodyPoint(u,off){ // point at arc fraction u, offset along dorsal normal
  const f=Math.min(NPP-1,Math.max(0,u*(NPP-1))), i0=Math.floor(f), i1=Math.min(NPP-1,i0+1), t=f-i0;
  const qx=pose.qx[i0]*(1-t)+pose.qx[i1]*t, qy=pose.qy[i0]*(1-t)+pose.qy[i1]*t;
  const nx=pose.nx[i0]*(1-t)+pose.nx[i1]*t, ny=pose.ny[i0]*(1-t)+pose.ny[i1]*t;
  return [qx+nx*off, qy+ny*off];
}
function ribbon(g,M,alphaFill,alphaLine,wS){ const WS=wS||1;
  g.beginPath();
  for (let i=0;i<NPP;i++){ const w=widthAt(i/(NPP-1))*WS;
    const x=M.cx+(pose.qx[i]+pose.nx[i]*w)*M.S, y=M.cy+(pose.qy[i]+pose.ny[i]*w)*M.S;
    i?g.lineTo(x,y):g.moveTo(x,y); }
  for (let i=NPP-1;i>=0;i--){ const w=widthAt(i/(NPP-1))*WS;
    g.lineTo(M.cx+(pose.qx[i]-pose.nx[i]*w)*M.S, M.cy+(pose.qy[i]-pose.ny[i]*w)*M.S); }
  g.closePath();
  g.fillStyle='rgba(226,238,229,'+alphaFill+')'; g.fill();
  g.strokeStyle='rgba(160,190,175,'+alphaLine+')'; g.lineWidth=vdpr; g.stroke();
}
function drawGeo(){
  const g=VG.geo, c=VC.geo;
  // choose the dorso-ventral exaggeration that fills the box: the real animal
  // is far too thin to read at this size, and this is a schematic map, not a
  // scale drawing (labelled as such in the caption)
  let M=poseMapStatic(c,1.7), WS=1.7;
  {
    const pad=14*vdpr, want=(c.height-2*pad)/M.S;
    WS=Math.max(1.7,Math.min(4.2,(want-0.12)/(2*maxBodyW)));
    M=poseMapStatic(c,WS);
  }
  g.fillStyle='#060f0c'; g.fillRect(0,0,c.width,c.height);
  ribbonStatic(g,M,0.04,0.16,WS);
  g.save(); g.globalCompositeOperation='lighter';
  for (let i=0;i<brain.N;i++){
    const p=NPOS[i], a=brain.activity[i];
    const pt=bodyPointStatic(p[0],p[1]*0.8*WS*widthAt(p[0]));
    const x=M.cx+pt[0]*M.S, y=M.cy+pt[1]*M.S;
    geoSX[i]=x; geoSY[i]=y;
    const r=(1.4+3.6*a*a)*vdpr;
    g.globalAlpha=0.10+0.62*Math.pow(a,1.5);
    g.drawImage(sprites[brain.cat[i]],x-r,y-r,2*r,2*r);
  }
  g.restore(); g.globalAlpha=1;
  const pin = selectedNeuron>=0 ? selectedNeuron : geoHover;
  if (pin>=0){
    g.beginPath(); g.arc(geoSX[pin],geoSY[pin],5*vdpr,0,7);
    g.strokeStyle='#e3efe9'; g.lineWidth=1.4*vdpr; g.stroke();
  }
  g.fillStyle='rgba(136,163,151,.8)'; g.font=(9*vdpr)+'px "Space Mono",monospace';
  g.fillText('head',M.cx-M.S*0.5-2*vdpr,M.cy-M.S*0.09-6*vdpr);
  g.fillText('tail',M.cx+M.S*0.5-20*vdpr,M.cy-M.S*0.09-6*vdpr);
}
VC.geo.addEventListener('mousemove',e=>{
  const r=VC.geo.getBoundingClientRect();
  const x=(e.clientX-r.left)*vdpr, y=(e.clientY-r.top)*vdpr;
  let bi=-1, bd=12*vdpr;
  for (let i=0;i<brain.N;i++){ const d=Math.hypot(geoSX[i]-x,geoSY[i]-y); if(d<bd){bd=d;bi=i;} }
  geoHover=bi;
  if (bi>=0) nameCell(bi,'gcap'); else if(selectedNeuron>=0) nameCell(selectedNeuron,'gcap'); else el('gcap').textContent='hover or click a cell';
});
VC.geo.addEventListener('click',()=>{ if (geoHover>=0) pinNeuron(geoHover); });
VC.geo.addEventListener('mouseleave',()=>{geoHover=-1; if(selectedNeuron>=0) nameCell(selectedNeuron,'gcap'); else el('gcap').textContent='hover or click a cell';});
// muscle map drawn on the live body: 24 segment pairs, dorsal band on the D side
const mAct=d=>Math.min(1,Math.max(0,(d-0.28)/0.62));
function drawMuscles(){
  const g=VG.muscles, c=VC.muscles, M=poseMapStatic(c,2.2);
  g.fillStyle='#060f0c'; g.fillRect(0,0,c.width,c.height);
  let pkD=0,pkDk=0,pkV=0,pkVk=0;
  for (let k=0;k<24;k++){
    const d=mAct(brain.muscleDorsal[k]), v=mAct(brain.muscleVentral[k]);
    if(d>pkD){pkD=d;pkDk=k;} if(v>pkV){pkV=v;pkVk=k;}
    const u0=k/24, u1=(k+1)/24;
    for (const side of [1,-1]){
      const a=side>0?d:v, cc=side>0?'255,125,92':'86,224,194';
      g.beginPath();
      const steps=3;
      for (let s=0;s<=steps;s++){ const u=u0+(u1-u0)*s/steps, p=bodyPointStatic(u,0);
        g[s?'lineTo':'moveTo'](M.cx+p[0]*M.S,M.cy+p[1]*M.S); }
      for (let s=steps;s>=0;s--){ const u=u0+(u1-u0)*s/steps, p=bodyPointStatic(u,side*2.02*widthAt(u));
        g.lineTo(M.cx+p[0]*M.S,M.cy+p[1]*M.S); }
      g.closePath();
      g.fillStyle='rgba('+cc+','+(0.07+0.9*Math.pow(a,1.35)).toFixed(3)+')'; g.fill();
    }
    if (k){ const p0=bodyPointStatic(u0,2.02*widthAt(u0)), p1=bodyPointStatic(u0,-2.02*widthAt(u0));
      g.beginPath(); g.moveTo(M.cx+p0[0]*M.S,M.cy+p0[1]*M.S); g.lineTo(M.cx+p1[0]*M.S,M.cy+p1[1]*M.S);
      g.strokeStyle='rgba(6,15,12,.55)'; g.lineWidth=vdpr; g.stroke(); }
  }
  ribbonStatic(g,M,0,0.22,2.2);
  const hp=bodyPointStatic(0.045,0);
  g.beginPath(); g.arc(M.cx+hp[0]*M.S,M.cy+hp[1]*M.S,1.2*widthAt(0.05)*M.S,0,7);
  g.fillStyle='rgba(90,110,100,.7)'; g.fill();
  g.font=(9*vdpr)+'px "Space Mono",monospace';
  g.fillStyle='rgba(255,125,92,.9)'; g.fillText('D dorsal',8*vdpr,c.height-6*vdpr);
  g.fillStyle='rgba(86,224,194,.9)'; g.fillText('V ventral',8*vdpr,12*vdpr);
  el('mcap').textContent='peak drive  D'+(pkDk+1)+' '+(pkD*100|0)+'%  \u00b7  V'+(pkVk+1)+' '+(pkV*100|0)+'%';
}
// scent minimap: the whole smellscape, normalized so structure is always visible
const SGX=64,SGY=40,sf=new Float32Array(SGX*SGY); let sframe=0, sMax=1e-6, lastNose=0, noseTrend=0;
function scentColor(q){
  const a=Math.pow(q,0.42);
  const r=10+245*a, gg=20+205*a, b=16+130*Math.pow(a,1.5);
  return 'rgb('+(r|0)+','+(gg|0)+','+(b|0)+')';
}
function drawScent(){
  const g=VG.scent, c=VC.scent, kx=c.width/W, ky=c.height/H;
  if (sframe++%6===0){
    let mx=1e-6;
    for (let j=0;j<SGY;j++) for (let i=0;i<SGX;i++){
      const v=env.concentrationAt((i+0.5)/SGX*W,(j+0.5)/SGY*H);
      sf[j*SGX+i]=v; if(v>mx)mx=v;
    }
    sMax=Math.max(mx,sMax*0.6+mx*0.4);
    const cn=env.concentrationAt(body.noseX,body.noseY);
    noseTrend=cn-lastNose; lastNose=cn;
    el('scap').textContent='at the nose '+cn.toExponential(1)+(Math.abs(noseTrend)<1e-6?'  \u00b7  steady':noseTrend>0?'  \u00b7  rising':'  \u00b7  falling');
  }
  const cw=c.width/SGX, ch=c.height/SGY;
  for (let j=0;j<SGY;j++) for (let i=0;i<SGX;i++){
    g.fillStyle=scentColor(Math.min(1,sf[j*SGX+i]/sMax));
    g.fillRect(i*cw,j*ch,cw+1,ch+1);
  }
  for (const wl of env.walls){ g.beginPath(); g.moveTo(wl.x1*kx,wl.y1*ky); g.lineTo(wl.x2*kx,wl.y2*ky);
    g.strokeStyle='rgba(160,190,175,.7)'; g.lineWidth=2*vdpr; g.stroke(); }
  for (const o of env.obstacles){ g.beginPath(); g.arc(o.x*kx,o.y*ky,o.r*kx,0,7);
    g.fillStyle='rgba(20,32,27,.9)'; g.fill(); }
  g.fillStyle='rgba(255,248,222,.95)';
  for (const f of env.foods) for (const p of f.parts) if (p.a>0) g.fillRect(p.x*kx-vdpr,p.y*ky-vdpr,2*vdpr,2*vdpr);
  g.beginPath();
  for (let i=0;i<NPP;i+=2){ const x=body.px[i]*kx,y=body.py[i]*ky; i?g.lineTo(x,y):g.moveTo(x,y); }
  g.strokeStyle='rgba(227,239,233,.95)'; g.lineWidth=1.6*vdpr; g.stroke();
  g.beginPath(); g.arc(body.noseX*kx,body.noseY*ky,3*vdpr,0,7);
  g.strokeStyle='#56e0c2'; g.lineWidth=vdpr; g.stroke();
  const e=0.12, gx=env.concentrationAt(body.noseX+e,body.noseY)-env.concentrationAt(body.noseX-e,body.noseY),
        gy=env.concentrationAt(body.noseX,body.noseY+e)-env.concentrationAt(body.noseX,body.noseY-e);
  const gm=Math.hypot(gx,gy);
  if (gm>1e-7){ const L=13*vdpr, x0=body.noseX*kx, y0=body.noseY*ky;
    g.beginPath(); g.moveTo(x0,y0); g.lineTo(x0+gx/gm*L,y0+gy/gm*L);
    g.strokeStyle='rgba(230,195,79,.9)'; g.lineWidth=vdpr; g.stroke(); }
}
// signals: a scrolling chart of the command state and the slow chemistry
const SIGS=[
  {n:'AVB fwd', c:'#56e0c2', f:()=>(brain.activity[brain.idx.AVBL]+brain.activity[brain.idx.AVBR])/2},
  {n:'AVA rev', c:'#ff7d5c', f:()=>(brain.activity[brain.idx.AVAL]+brain.activity[brain.idx.AVAR])/2},
  {n:'ASE smell',c:'#e6c34f', f:()=>Math.max(brain.activity[brain.idx.ASEL],brain.activity[brain.idx.ASER])},
  {n:'dopamine (food contact)',c:'#b48cff', f:()=>brain.dopa},
  {n:'serotonin (satiety tone)',c:'#ff8cc0', f:()=>brain.serTone},
];
const SN=300, sbuf=SIGS.map(()=>new Float32Array(SN)), stbuf=new Uint8Array(SN); let shead=0;
function pushSignals(){
  for (let i=0;i<SIGS.length;i++) sbuf[i][shead]=SIGS[i].f();
  stbuf[shead]=brain.omegaT>0?3:brain.upsilonT>0?2:brain.command<-0.08?1:0;
  shead=(shead+1)%SN;
}
function drawSignals(){
  const g=VG.signals, c=VC.signals;
  g.fillStyle='#060f0c'; g.fillRect(0,0,c.width,c.height);
  const stripH=7*vdpr;
  const stc=['rgba(86,224,194,.25)','rgba(255,125,92,.55)','rgba(255,180,84,.7)','rgba(230,195,79,.85)'];
  const dx=c.width/SN;
  for (let s=0;s<SN;s++){ const v=stbuf[(shead+s)%SN];
    if (v){ g.fillStyle=stc[v]; g.fillRect(s*dx,0,dx+1,stripH); } }
  const top=stripH+5*vdpr, gap=5*vdpr;
  const rh=(c.height-top-gap*(SIGS.length-1))/SIGS.length;
  for (let i=0;i<SIGS.length;i++){
    const y0=top+i*(rh+gap);
    g.strokeStyle='rgba(130,170,150,.14)'; g.lineWidth=1;
    g.beginPath(); g.moveTo(0,y0+rh); g.lineTo(c.width,y0+rh); g.stroke();
    g.strokeStyle=SIGS[i].c; g.lineWidth=1.6*vdpr; g.beginPath();
    for (let s=0;s<SN;s++){ const v=Math.max(0,Math.min(1,sbuf[i][(shead+s)%SN]));
      const x=s*dx, y=y0+rh-2*vdpr-v*(rh-8*vdpr);
      s?g.lineTo(x,y):g.moveTo(x,y); }
    g.stroke();
    g.fillStyle='rgba(6,15,12,.68)'; g.fillRect(2*vdpr,y0,c.width*0.34,11*vdpr);
    g.fillStyle=SIGS[i].c; g.font=(9*vdpr)+'px "Space Mono",monospace';
    g.fillText(SIGS[i].n,4*vdpr,y0+9*vdpr);
  }
}
let vizFrame=0;
function drawViz(){
  vizFrame++;
  if (vizFrame%5===0 && !paused) pushSignals();
  if (!dashOn() && vizOn.size===0) return;
  if (shown('nerves')) drawNeurons();
  if (shown('geo')) drawGeo();
  if (shown('gang')) drawHeadInset();
  if (shown('muscles')) drawMuscles();
  if (shown('scent')) drawScent();
  if (shown('signals')) drawSignals();
}
sizeViz();
// ---- rendering the dish ----
function draw(){
  const w=cv.clientWidth,h=cv.clientHeight;
  ctx.fillStyle='#050c0a'; ctx.fillRect(0,0,w,h);
  // dish: pixel-art agar
  ctx.save();
  ctx.beginPath(); ctx.roundRect(w2x(0),w2y(0),W*scale,H*scale,14); ctx.clip();
  ctx.imageSmoothingEnabled=false;
  if(bgCv) ctx.drawImage(bgCv,w2x(0),w2y(0),W*scale,H*scale);
  ctx.restore();
  ctx.beginPath(); ctx.roundRect(w2x(0),w2y(0),W*scale,H*scale,14);
  ctx.strokeStyle='rgba(130,170,150,.22)'; ctx.lineWidth=1.5; ctx.stroke();
  // food: a lawn of pixel particles, dense centre thinning outward, plus a
  // dithered scent halo whose pixel density falls off like the gradient does
  const snap=q=>Math.floor(q/PIX)*PIX;
  for (const f of env.foods){
    const rel=Math.min(1,f.amount/f.amount0+0.1);
    for (const hp of f.halo){
      const a=0.16*rel*Math.exp(-hp.d/1.0);
      if(a<0.015) continue;
      ctx.fillStyle='rgba(196,180,110,'+a.toFixed(3)+')';
      ctx.fillRect(snap(w2x(hp.x)),snap(w2y(hp.y)),PIX,PIX);
    }
    for (const p of f.parts){
      if(p.a<=0) continue;
      const fr=p.a/p.a0, sz=PIX*(p.sz>2?2:1);
      ctx.fillStyle=p.sz>2?'rgba(233,219,160,'+(0.45+0.5*fr).toFixed(2)+')'
                   :p.sz>1?'rgba(214,198,130,'+(0.4+0.5*fr).toFixed(2)+')'
                          :'rgba(186,172,112,'+(0.35+0.5*fr).toFixed(2)+')';
      ctx.fillRect(snap(w2x(p.x)),snap(w2y(p.y)),sz,sz);
    }
  }
  // trails, one per animal (the selected one brighter)
  for (let k=0;k<worms.length;k++){
    const tr=worms[k].trail; if(tr.length<3) continue;
    ctx.beginPath(); ctx.moveTo(w2x(tr[0][0]),w2y(tr[0][1]));
    for (const p of tr) ctx.lineTo(w2x(p[0]),w2y(p[1]));
    ctx.strokeStyle=(k===sel)?'rgba(86,224,194,.15)':'rgba(86,224,194,.06)';
    ctx.lineWidth=1.2; ctx.stroke();
  }
  // walls and posts
  ctx.lineCap='round';
  for (const wl of env.walls){ ctx.beginPath(); ctx.moveTo(w2x(wl.x1),w2y(wl.y1)); ctx.lineTo(w2x(wl.x2),w2y(wl.y2));
    ctx.strokeStyle='rgba(160,190,175,.55)'; ctx.lineWidth=Math.max(3,0.07*scale); ctx.stroke(); }
  for (const o of env.obstacles){ ctx.beginPath(); ctx.arc(w2x(o.x),w2y(o.y),o.r*scale,0,7);
    ctx.fillStyle='rgba(50,72,63,.9)'; ctx.fill(); ctx.strokeStyle='rgba(160,190,175,.4)'; ctx.lineWidth=1.5; ctx.stroke(); }
  // wall preview
  if (dragA&&dragB){ ctx.beginPath(); ctx.moveTo(w2x(dragA[0]),w2y(dragA[1])); ctx.lineTo(w2x(dragB[0]),w2y(dragB[1]));
    ctx.strokeStyle='rgba(160,190,175,.35)'; ctx.setLineDash([6,5]); ctx.lineWidth=3; ctx.stroke(); ctx.setLineDash([]); }
  // ripples
  for (const r of ripples){ ctx.beginPath(); ctx.arc(w2x(r.x),w2y(r.y),r.r*scale,0,7);
    ctx.strokeStyle='rgba(255,125,92,'+(0.6*r.a)+')'; ctx.lineWidth=2; ctx.stroke(); }
  // worms: every animal on the dish, the selected one picked out
  for (let k=0;k<worms.length;k++) drawWorm(worms[k],k===sel);
}
function drawWorm(w,isSel){
  const body=w.body;
  const NP=BTUNE.NP, lx=[],ly=[],rx=[],ry=[];
  for (let i=0;i<NP;i++){
    const im=Math.max(0,i-1), ip=Math.min(NP-1,i+1);
    let nx=-(body.py[ip]-body.py[im]), ny=body.px[ip]-body.px[im];
    const L=Math.hypot(nx,ny)||1e-9; nx/=L; ny/=L;
    const wd=widthAt(i/(NP-1));
    lx.push(body.px[i]+nx*wd); ly.push(body.py[i]+ny*wd);
    rx.push(body.px[i]-nx*wd); ry.push(body.py[i]-ny*wd);
  }
  ctx.beginPath(); ctx.moveTo(w2x(lx[0]),w2y(ly[0]));
  for (let i=1;i<NP;i++) ctx.lineTo(w2x(lx[i]),w2y(ly[i]));
  for (let i=NP-1;i>=0;i--) ctx.lineTo(w2x(rx[i]),w2y(ry[i]));
  ctx.closePath();
  const hg=ctx.createLinearGradient(w2x(body.px[0]),w2y(body.py[0]),w2x(body.px[NP-1]),w2y(body.py[NP-1]));
  if (isSel){ hg.addColorStop(0,'rgba(226,238,229,.95)'); hg.addColorStop(1,'rgba(180,205,192,.88)'); }
  else { hg.addColorStop(0,'rgba(196,214,203,.72)'); hg.addColorStop(1,'rgba(150,175,163,.66)'); }
  ctx.fillStyle=hg; ctx.fill();
  ctx.strokeStyle=isSel?'rgba(20,40,33,.5)':'rgba(20,40,33,.35)'; ctx.lineWidth=1; ctx.stroke();
  // pharynx: two darker bulbs behind the nose
  ctx.fillStyle='rgba(90,110,100,.65)';
  for (const t of [0.045,0.09]){ const i=Math.round(t*(NP-1));
    ctx.beginPath(); ctx.arc(w2x(body.px[i]),w2y(body.py[i]),widthAt(t)*0.62*scale,0,7); ctx.fill(); }
  if (worms.length>1){
    // marker: which animal the right-hand column is about
    const hx=w2x(body.px[0]), hy=w2y(body.py[0]);
    ctx.beginPath(); ctx.arc(hx,hy,Math.max(9,0.17*scale),0,7);
    ctx.strokeStyle=isSel?'rgba(86,224,194,.95)':'rgba(120,150,138,.35)';
    ctx.lineWidth=isSel?2:1; ctx.stroke();
    ctx.fillStyle=isSel?'rgba(86,224,194,.95)':'rgba(150,180,168,.6)';
    ctx.font='600 '+Math.max(9,Math.round(0.1*scale))+'px "Space Mono",monospace';
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(String(w.id),hx,hy);
    ctx.textAlign='left'; ctx.textBaseline='alphabetic';
  }
}

// ---- loop ----
const dt=1/60;
function stepWorm(w){
  const body=w.body, brain=w.brain;
  // mechanotransduction: last frame's body-wall contacts reach the neurons.
  // Nose tip pressed forward = ASH/FLP/OLQ nose touch; side of the nose =
  // OLQ/IL1 head withdrawal; body flank = ALM/AVM (entrainment along walls).
  // Contact with ANOTHER WORM enters through the same body touch cells.
  let noseOn=0,noseSide=0,bodyA=w.soc.head||0,bodyP=w.soc.tail||0;
  for (const c of body.contacts){
    if (c.i<=4){ const dot=-(c.nx*body.noseDirX+c.ny*body.noseDirY);
      noseOn=Math.max(noseOn,Math.max(0,dot)); noseSide+=c.side*Math.min(0.4,c.push);
    } else if (c.i<24) bodyA=Math.max(bodyA,c.push);
    else bodyP=Math.max(bodyP,c.push);
  }
  brain.mech(noseOn,noseSide,bodyA,bodyP,dt,body.speed);
  brain.chemosense(env.concentrationAt(body.noseX,body.noseY));
  // basal slowing: the dopamine cells feel bacteria mechanically under the
  // body, so they are gated by particle-local density, never by smell alone
  const midi=Math.floor(body.px.length*0.55);
  const lf=env.localFoodAt(body.noseX,body.noseY);
  const lfP=env.localFoodAt(body.px[midi],body.py[midi]);
  brain.food(lf>0.5?1:0, lfP>0.5?1:0, lf>0.5?1:0, dt);
  if (w.pokePulse){ brain.touch(w.pokePulse.region,1.1); w.pokePulse.t-=dt; if(w.pokePulse.t<=0) w.pokePulse=null; }
  brain.step(dt,body.curvature);
  body.step(dt,brain.muscleDorsal,brain.muscleVentral,env);
  if (lf>0.5){ const e=env.consume(body.noseX,body.noseY,dt,0.06); w.eaten+=e; eaten+=e; }
}
function stepOnce(){
  if (worms.length>1) socialStep(worms,dt);
  else { const S=worms[0].soc; S.head=0; S.tail=0; S.nb=0; }
  for (const w of worms) stepWorm(w);
  for (const r of ripples){ r.r+=dt*1.6; r.a-=dt*1.8; }
  for (let i=ripples.length-1;i>=0;i--) if (ripples[i].a<=0) ripples.splice(i,1);
}
let frame=0, acc=0, realSpeed=1;
// With several animals a 10x request can cost more than a frame, so the
// substep loop is capped by TIME, not by count, and the HUD reports the speed
// actually achieved rather than the one asked for.
const STEP_BUDGET_MS=11;
function loop(){
  requestAnimationFrame(loop);
  if (!paused){
    acc+=simSpeed;
    const t0=performance.now(); let n=0;
    while (acc>=1){ stepOnce(); acc-=1; n++;
      if (n>=2 && performance.now()-t0>STEP_BUDGET_MS){ acc=0; break; } }
    realSpeed+=(n-realSpeed)*0.08;
    frame++;
    if (frame%4===0){
      for (const w of worms){ w.trail.push([w.body.noseX,w.body.noseY]); if (w.trail.length>900) w.trail.shift(); }
    }
    if (frame%15===0) updateHud(n);
  }
  draw();
  // at high speed the readouts do not need a redraw every frame
  if (simSpeed<=3 || frame%2===0) drawViz(frame);
}
loop();

// ---- chrome ----
el('b-addworm').addEventListener('click',()=>{
  // drop the new animal in open dish space, away from the others
  let bx=W*0.5,by=H*0.5,bd=-1;
  for(let t=0;t<24;t++){
    const x=0.5+Math.random()*(W-1), y=0.5+Math.random()*(H-1);
    let d=1e9; for(const w of worms) d=Math.min(d,Math.hypot(w.body.px[12]-x,w.body.py[12]-y));
    if(d>bd){bd=d;bx=x;by=y;}
  }
  addWorm(bx,by);
});
el('b-rmworm').addEventListener('click',()=>removeWorm(sel));
function setStrain(mode){
  SOC.mode=mode;
  el('b-solitary').setAttribute('aria-pressed',String(mode==='solitary'));
  el('b-social').setAttribute('aria-pressed',String(mode==='social'));
}
el('b-solitary').addEventListener('click',()=>setStrain('solitary'));
el('b-social').addEventListener('click',()=>setStrain('social'));
syncWormChips(); updateHud(1);
el('b-pause').addEventListener('click',()=>{ paused=!paused; el('b-pause').dataset.on=String(paused); });
el('b-reset').addEventListener('click',()=>{
  worms.forEach((w,k)=>{
    const ang=0.2+k*0.9, f=(k+1)/(worms.length+1);
    w.body.reset(W*(0.18+0.64*f), H*(0.3+0.4*((k%3)/2)), ang);
    w.brain.reset(); w.trail.length=0; w.pokePulse=null;
  });
});
el('b-clean').addEventListener('click',()=>{ const on=document.body.classList.toggle('clean'); el('b-clean').dataset.on=String(on); sizeViz(); resize(); makeBg(); });
document.addEventListener('fullscreenchange',()=>{ document.body.classList.toggle('fs',!!document.fullscreenElement); resize(); makeBg(); sizeViz(); });
el('b-full').addEventListener('click',()=>{ document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen(); });
el('b-about').addEventListener('click',()=>el('about').showModal());
el('b-close').addEventListener('click',()=>el('about').close());
el('about').addEventListener('click',e=>{ if(e.target===el('about')) el('about').close(); });
el('p-toggle').addEventListener('click',()=>{ const o=el('panel').classList.toggle('open'); el('p-toggle').setAttribute('aria-expanded',String(o)); });
window.addEventListener('keydown',e=>{
  if (e.target.tagName==='INPUT') return;
  const k=e.key;
  if (k===' '){ e.preventDefault(); el('b-pause').click(); }
  else if (k==='r'||k==='R') el('b-reset').click();
  else if (k==='h'||k==='H') el('b-clean').click();
  else if (k==='f'||k==='F') el('b-full').click();
  else if (k>='1'&&k<='5'){ const b=document.querySelectorAll('.preset')[+k-1]; if(b) b.click(); }
});
if (window.self!==window.top) document.body.classList.add('in-frame');
// test hook: lets automated checks find the worm
window.__worm={get body(){return body},get brain(){return brain},env,poke,worms,addWorm,removeWorm,
  get sel(){return sel},selectWorm,SOC,get realSpeed(){return realSpeed}};
window.__dishW=W; window.__dishH=H;
window.__viz={get ox(){return ox},get oy(){return oy},get scale(){return scale},vizOn};
