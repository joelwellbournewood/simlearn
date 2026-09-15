import { WormBrain, TUNE } from './brain.js';
import { WormBody, Environment, BTUNE, widthAt } from './body.js';

const W=8, H=5, el=id=>document.getElementById(id);
const data=await fetch('./celegans-connectome.json').then(r=>r.json());
const brain=new WormBrain(data);
const body=new WormBody(W*0.35,H*0.5,0.3);
let env=new Environment(W,H);

const cv=el('c'), ctx=cv.getContext('2d');
let scale=1, ox=0, oy=0, paused=false, eaten=0, tool='food';
let trail=[], ripples=[], dragA=null, dragB=null, pokePulse=null;
// the dish is fitted into the space BETWEEN the floating panels, never under them
function safeRect(w,h){
  let L=14,R=w-14,T=14,B=h-46;
  const overlayMode=window.innerWidth<=820||document.body.classList.contains('clean');
  if(!overlayMode){
    const pe=el('panel'), ve=el('vizpanel');
    if(pe&&getComputedStyle(pe).display!=='none'){const r=pe.getBoundingClientRect(); if(r.width>0) L=Math.max(L,r.right+14);}
    if(ve&&getComputedStyle(ve).display!=='none'){const r=ve.getBoundingClientRect(); if(r.width>0) R=Math.min(R,r.left-14);}
  }
  if(R-L<180){L=14;R=w-14;}
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
  'Open dish':{tag:'One worm, one meal, a lot of agar', make(){ env.addFood(6.1,3.6,1.0,0.6); }},
  'Dinner trail':{tag:'Five drops laid in an arc, scent overlapping', make(){
    const pts=[[2.2,1.3],[3.4,1.1],[4.6,1.5],[5.7,2.3],[6.4,3.4]];
    for (const [x,y] of pts) env.addFood(x,y,0.55,0.45); }},
  'The corridor':{tag:'Food at the end of a bent hallway', make(){
    env.addWall(2.2,1.4,5.8,1.4); env.addWall(2.2,2.6,5.0,2.6);
    env.addWall(5.8,1.4,5.8,3.9); env.addWall(5.0,2.6,5.0,3.9);
    env.addFood(5.4,4.3,1.2,0.5); }},
  'Post forest':{tag:'Thread the pillars to reach the lawn', make(){
    for (let i=0;i<4;i++) for (let j=0;j<3;j++) env.addObstacle(2.6+i*1.0,1.4+j*1.1,0.22);
    env.addFood(7.0,2.5,1.2,0.6); }},
  'The corner':{tag:'A dead end; watch the nose neurons argue it out', make(){
    env.addWall(6.6,2.5,4.4,1.1); env.addWall(6.6,2.5,4.4,3.9);
    env.addFood(7.3,4.2,0.9,0.5); }},
};
function loadPreset(name,btn){
  env=new Environment(W,H); PRESETS[name].make();
  body.reset(W*0.22,H*0.55,0.2); brain.reset(); trail.length=0; eaten=0;
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
// ---- tools ----
document.querySelectorAll('.tool').forEach(b=>b.addEventListener('click',()=>{
  tool=b.dataset.tool;
  document.querySelectorAll('.tool').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));
}));
function poke(x,y){
  let bi=-1,bd=0.35;
  for (let i=0;i<BTUNE.NP;i++){const d=Math.hypot(body.px[i]-x,body.py[i]-y);if(d<bd){bd=d;bi=i;}}
  if (bi<0) return false;
  const region=bi<6?'nose':bi<20?'anterior':'posterior';
  pokePulse={region,t:0.45}; // a real prod is a volley, not one spike
  ripples.push({x,y,r:0.06,a:1});
  return true;
}
cv.addEventListener('pointerdown',e=>{
  const x=x2w(e.offsetX),y=y2w(e.offsetY);
  if (x<0||x>W||y<0||y>H) return;
  if (tool==='wall'){ dragA=[x,y]; dragB=[x,y]; return; }
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
bind('s-speed','v-speed',v=>v.toFixed(2)+'x',v=>simSpeed=v);
bind('s-smell','v-smell',v=>v.toFixed(1),v=>TUNE.senseGain=6*v);
bind('s-medium','v-medium',v=>v<0.25?'water':v<0.75?'thick gel':'agar surface',v=>{ BTUNE.load=v; TUNE.load=v; });

// ---- right-hand visualization: five selectable windows into the machine ----
const VIEWS=['nerves','geo','muscles','scent','signals'];
let vizOn; try{ vizOn=new Set(JSON.parse(localStorage.getItem('celeg-viz'))||[]); }catch(e){ vizOn=new Set(); }
if (![...vizOn].some(v=>VIEWS.includes(v))) vizOn=new Set(['nerves','muscles','scent']);
let vizWide=false; try{ vizWide=localStorage.getItem('celeg-wide')==='1'; }catch(e){}
const vdpr=Math.min(window.devicePixelRatio||1,2);
const VC={}; for (const v of VIEWS) VC[v]=el({nerves:'nerves',geo:'geo',muscles:'muscles',scent:'scentcv',signals:'signals'}[v]);
const VG={}; for (const v of VIEWS) VG[v]=VC[v].getContext('2d');
let nervesGrid={NC:20,CS:11,rows:15};
function sizeViz(){
  el('vizpanel').classList.toggle('wide',vizWide);
  el('v-wide').setAttribute('aria-pressed',String(vizWide));
  for (const v of VIEWS){
    const on=vizOn.has(v);
    el('sec-'+v).classList.toggle('on',on);
    document.querySelector('.vchip[data-v="'+v+'"]').setAttribute('aria-pressed',String(on));
  }
  for (const v of VIEWS){
    if (!vizOn.has(v)) continue;
    const c=VC[v], cw=c.clientWidth; if(!cw) continue;
    let ch;
    if (v==='nerves'){ const NC=cw>=380?30:20, rows=Math.ceil(brain.N/NC), CS=Math.floor(cw*vdpr/NC);
      nervesGrid={NC,CS,rows}; c.width=NC*CS; c.height=rows*CS; c.style.height=(rows*CS/vdpr)+'px'; continue; }
    if (v==='geo'){
      const gh=document.getElementById('geohead');
      const ch1=Math.round(cw*0.34), ch2=Math.round(cw*0.95);
      c.width=Math.round(cw*vdpr); c.height=Math.round(ch1*vdpr); c.style.height=ch1+'px';
      const ghw=gh.clientWidth||cw;
      gh.width=Math.round(ghw*vdpr); gh.height=Math.round(ch2*vdpr); gh.style.height=ch2+'px';
      continue;
    }
    if (v==='muscles') ch=Math.round(cw*0.46);
    else if (v==='scent') ch=Math.round(cw*0.625);
    else ch=230;
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
function pinNeuron(i){ selectedNeuron=i; nameCell(i,'ncap'); nameCell(i,'gcap'); }

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
  const pad=16*vdpr, S=(Math.min(c.width,c.height)-2*pad)/2, cx=c.width/2, cy=c.height/2;
  return [cx+hlx[k]*S, cy+hly[k]*S, S, cx, cy];
}
function drawHeadInset(){
  const c=document.getElementById('geohead'); if (!c || !c.width) return;
  const g=c.getContext('2d');
  g.fillStyle='#060f0c'; g.fillRect(0,0,c.width,c.height);
  const hx=k=>headMapXY(c,k)[0], hy=k=>headMapXY(c,k)[1];
  const tiers=[{lo:0.55,cc:'rgba(226,238,229,0.6)'},{lo:0.3,cc:'rgba(226,238,229,0.3)'},{lo:0.12,cc:'rgba(226,238,229,0.13)'}];
  for (const t of tiers){ g.beginPath(); let any=false;
    for (let a=0;a<HN;a++){ const ai=headIdx[a]; if (brain.activity[ai]<t.lo) continue;
      for (const b of headAdj[a]){ if (brain.activity[headIdx[b]]<0.08) continue;
        any=true; g.moveTo(hx(a),hy(a)); g.lineTo(hx(b),hy(b)); } }
    if (any){ g.strokeStyle=t.cc; g.lineWidth=vdpr; g.stroke(); }
  }
  g.save(); g.globalCompositeOperation='lighter';
  for (let k=0;k<HN;k++){
    const gi=headIdx[k], a=brain.activity[gi], cc=catColor[brain.cat[gi]];
    const r=(2.8+7*a*a)*vdpr, x=hx(k), y=hy(k);
    g.globalAlpha=0.18+0.82*Math.pow(a,1.5);
    g.drawImage(sprites[brain.cat[gi]],x-r,y-r,2*r,2*r);
  }
  g.restore(); g.globalAlpha=1;
  const pin = selectedNeuron>=0 && headPos[selectedNeuron]!==undefined ? headPos[selectedNeuron] : (geoHeadHover>=0?geoHeadHover:-1);
  if (pin>=0){ g.beginPath(); g.arc(hx(pin),hy(pin),6*vdpr,0,7); g.strokeStyle='#e3efe9'; g.lineWidth=1.4*vdpr; g.stroke(); }
  g.fillStyle='rgba(136,163,151,.75)'; g.font=(9*vdpr)+'px "Space Mono",monospace';
  g.fillText(HN+' head-ganglion cells \u00b7 lines are real wired synapses, lit while both ends fire',8*vdpr,c.height-8*vdpr);
}
document.getElementById('geohead').addEventListener('mousemove',e=>{
  const c=e.target, r=c.getBoundingClientRect();
  const x=(e.clientX-r.left)*vdpr, y=(e.clientY-r.top)*vdpr;
  let bi=-1,bd=14*vdpr;
  for (let k=0;k<HN;k++){ const [hx,hy]=headMapXY(c,k); const d=Math.hypot(hx-x,hy-y); if(d<bd){bd=d;bi=k;} }
  geoHeadHover=bi;
  if (bi>=0) nameCell(headIdx[bi],'gcap'); else if(selectedNeuron<0) el('gcap').textContent='hover or click a cell to name it';
});
document.getElementById('geohead').addEventListener('mouseleave',()=>{ geoHeadHover=-1; if(selectedNeuron>=0) nameCell(selectedNeuron,'gcap'); });
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
  const g=VG.geo, c=VC.geo, M=poseMapStatic(c,1.7);
  g.fillStyle='#060f0c'; g.fillRect(0,0,c.width,c.height);
  ribbonStatic(g,M,0.04,0.16,1.7);
  g.save(); g.globalCompositeOperation='lighter';
  for (let i=0;i<brain.N;i++){
    const p=NPOS[i], a=brain.activity[i];
    const pt=bodyPointStatic(p[0],p[1]*1.36*widthAt(p[0]));
    const x=M.cx+pt[0]*M.S, y=M.cy+pt[1]*M.S;
    geoSX[i]=x; geoSY[i]=y;
    const r=(1.5+4.5*a*a)*vdpr;
    g.globalAlpha=0.14+0.86*Math.pow(a,1.5);
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
  drawHeadInset();
}
VC.geo.addEventListener('mousemove',e=>{
  const r=VC.geo.getBoundingClientRect();
  const x=(e.clientX-r.left)*vdpr, y=(e.clientY-r.top)*vdpr;
  let bi=-1, bd=12*vdpr;
  for (let i=0;i<brain.N;i++){ const d=Math.hypot(geoSX[i]-x,geoSY[i]-y); if(d<bd){bd=d;bi=i;} }
  geoHover=bi;
  if (bi>=0) nameCell(bi,'gcap'); else if(selectedNeuron>=0) nameCell(selectedNeuron,'gcap'); else el('gcap').textContent='hover or click a cell to name it';
});
VC.geo.addEventListener('click',()=>{ if (geoHover>=0) pinNeuron(geoHover); });
VC.geo.addEventListener('mouseleave',()=>{geoHover=-1; if(selectedNeuron>=0) nameCell(selectedNeuron,'gcap'); else el('gcap').textContent='hover or click a cell to name it';});
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
  stbuf[shead]=brain.omegaT>0?2:brain.command<-0.08?1:0;
  shead=(shead+1)%SN;
}
function drawSignals(){
  const g=VG.signals, c=VC.signals;
  g.fillStyle='#060f0c'; g.fillRect(0,0,c.width,c.height);
  const stripH=7*vdpr;
  const stc=['rgba(86,224,194,.25)','rgba(255,125,92,.55)','rgba(230,195,79,.7)'];
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
  if (vizOn.size===0) return;
  if (vizOn.has('nerves')) drawNeurons();
  if (vizOn.has('geo')) drawGeo();
  if (vizOn.has('muscles')) drawMuscles();
  if (vizOn.has('scent')) drawScent();
  if (vizOn.has('signals')) drawSignals();
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
  // trail
  if (trail.length>2){ ctx.beginPath(); ctx.moveTo(w2x(trail[0][0]),w2y(trail[0][1]));
    for (const p of trail) ctx.lineTo(w2x(p[0]),w2y(p[1]));
    ctx.strokeStyle='rgba(86,224,194,.13)'; ctx.lineWidth=1.2; ctx.stroke(); }
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
  // worm: ribbon with a spindle width profile
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
  hg.addColorStop(0,'rgba(226,238,229,.95)'); hg.addColorStop(1,'rgba(180,205,192,.88)');
  ctx.fillStyle=hg; ctx.fill();
  ctx.strokeStyle='rgba(20,40,33,.5)'; ctx.lineWidth=1; ctx.stroke();
  // pharynx: two darker bulbs behind the nose
  ctx.fillStyle='rgba(90,110,100,.65)';
  for (const t of [0.045,0.09]){ const i=Math.round(t*(NP-1));
    ctx.beginPath(); ctx.arc(w2x(body.px[i]),w2y(body.py[i]),widthAt(t)*0.62*scale,0,7); ctx.fill(); }
}

// ---- loop ----
const dt=1/60;
function stepOnce(){
  // mechanotransduction: last frame's body-wall contacts reach the neurons.
  // Nose tip pressed forward = ASH/FLP/OLQ nose touch; side of the nose =
  // OLQ/IL1 head withdrawal; body flank = ALM/AVM (entrainment along walls)
  let noseOn=0,noseSide=0,bodyA=0,bodyP=0;
  for (const c of body.contacts){
    if (c.i<=4){ const dot=-(c.nx*body.noseDirX+c.ny*body.noseDirY);
      noseOn=Math.max(noseOn,Math.max(0,dot)); noseSide+=c.side*Math.min(0.4,c.push);
    } else if (c.i<24) bodyA=Math.max(bodyA,c.push);
    else bodyP=Math.max(bodyP,c.push);
  }
  brain.mech(noseOn,noseSide,bodyA,bodyP,dt,body.speed);
  const conc=env.concentrationAt(body.noseX,body.noseY);
  brain.chemosense(conc);
  // basal slowing: the dopamine cells feel bacteria mechanically under the
  // body, so they are gated by particle-local density, never by smell alone
  const midi=Math.floor(body.px.length*0.55);
  const lf=env.localFoodAt(body.noseX,body.noseY);
  const lfP=env.localFoodAt(body.px[midi],body.py[midi]);
  brain.food(lf>0.5?1:0, lfP>0.5?1:0, lf>0.5?1:0, dt);
  if (pokePulse){ brain.touch(pokePulse.region,1.3); pokePulse.t-=dt; if(pokePulse.t<=0) pokePulse=null; }
  brain.step(dt,body.curvature);
  body.step(dt,brain.muscleDorsal,brain.muscleVentral,env);
  if (lf>0.5) eaten+=env.consume(body.noseX,body.noseY,dt,0.06);
  for (const r of ripples){ r.r+=dt*1.6; r.a-=dt*1.8; }
  for (let i=ripples.length-1;i>=0;i--) if (ripples[i].a<=0) ripples.splice(i,1);
}
let frame=0, acc=0;
function loop(){
  requestAnimationFrame(loop);
  if (!paused){
    acc+=simSpeed;
    while (acc>=1){ stepOnce(); acc-=1; }
    frame++;
    if (frame%4===0){
      trail.push([body.noseX,body.noseY]);
      if (trail.length>900) trail.shift();
    }
  }
  draw(); drawViz(frame);
  // HUD
  const st=brain.omegaT>0?'omega turn':brain.command<-0.08?'reversal':'forward';
  el('h-state').textContent=st;
  el('h-speed').textContent=body.speed.toFixed(2);
  el('h-eaten').textContent=eaten.toFixed(2);
  let up=0; for (let i=0;i<brain.N;i++) if (brain.activity[i]>0.5) up++;
  el('h-active').textContent=up;
}
loop();

// ---- chrome ----
el('b-pause').addEventListener('click',()=>{ paused=!paused; el('b-pause').dataset.on=String(paused); });
el('b-reset').addEventListener('click',()=>{ body.reset(W*0.22,H*0.55,0.2); brain.reset(); trail.length=0; });
el('b-clean').addEventListener('click',()=>{ const on=document.body.classList.toggle('clean'); el('b-clean').dataset.on=String(on); resize(); makeBg(); });
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
window.__worm={body,brain,env,poke};
window.__viz={get ox(){return ox},get oy(){return oy},get scale(){return scale},vizOn};
