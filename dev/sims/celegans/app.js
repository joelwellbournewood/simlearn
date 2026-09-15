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
function resize(){
  const st=el('stage'), w=st.clientWidth, h=st.clientHeight;
  let dpr=Math.min(window.devicePixelRatio||1, Math.sqrt(3.2e6/(w*h)));
  cv.width=Math.round(w*dpr); cv.height=Math.round(h*dpr);
  cv.style.width=w+'px'; cv.style.height=h+'px';
  ctx.setTransform(dpr,0,0,dpr,0,0);
  scale=Math.min(w/W,h/H)*0.965;
  ox=(w-W*scale)/2; oy=(h-H*scale)/2;
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

// ---- right-hand visualization: four windows into the machine ----
const order=[...Array(brain.N).keys()].sort((a,b)=>{
  const r={'S':0,'I':1,'M':2};
  return (r[brain.cat[a]]-r[brain.cat[b]])||(brain.names[a]<brain.names[b]?-1:1);
});
const nv=el('nerves'), nctx=nv.getContext('2d'), NC=20, NR=15, CS=11; // 220x165
const catColor={S:[230,195,79],I:[86,224,194],M:[255,125,92]};
let viz='neurons';
const CAP={neurons:'hover a cell to name it',
  muscles:'muscle drive per row, head at top: dorsal | ventral',
  wave:'bend along the body (rows) through time (columns)',
  scent:'the scent field the nose actually smells; dot = nose'};
document.querySelectorAll('.vtab').forEach(b=>b.addEventListener('click',()=>{
  viz=b.dataset.viz;
  document.querySelectorAll('.vtab').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));
  el('ncap').textContent=CAP[viz];
}));
nv.addEventListener('mousemove',e=>{
  if(viz!=='neurons') return;
  const r=nv.getBoundingClientRect();
  const cx=Math.floor((e.clientX-r.left)/r.width*NC), cy=Math.floor((e.clientY-r.top)/r.height*NR);
  const k=cy*NC+cx;
  if (k<brain.N){ const i=order[k];
    const cat={S:'sensory',I:'interneuron',M:'motor'}[brain.cat[i]];
    el('ncap').textContent=brain.names[i]+' ('+cat+') '+(brain.activity[i]*100).toFixed(0)+'%';
  } else el('ncap').textContent='';
});
nv.addEventListener('mouseleave',()=>{if(viz==='neurons')el('ncap').textContent=CAP.neurons;});
function drawNeurons(){
  nctx.fillStyle='#07120f'; nctx.fillRect(0,0,220,165);
  for (let k=0;k<brain.N;k++){
    const i=order[k], a=brain.activity[i], c=catColor[brain.cat[i]];
    nctx.fillStyle='rgba('+c[0]+','+c[1]+','+c[2]+','+(0.06+0.94*a*a)+')';
    nctx.fillRect((k%NC)*CS+1,Math.floor(k/NC)*CS+1,CS-2,CS-2);
  }
}
function drawMuscles(){
  nctx.fillStyle='#07120f'; nctx.fillRect(0,0,220,165);
  const rh=165/24;
  for (let k=0;k<24;k++){
    const d=brain.muscleDorsal[k], v=brain.muscleVentral[k], y=k*rh;
    nctx.fillStyle='rgba(255,125,92,'+(0.15+0.85*d)+')';
    nctx.fillRect(108-d*104,y+1,d*104,rh-2);
    nctx.fillStyle='rgba(86,224,194,'+(0.15+0.85*v)+')';
    nctx.fillRect(112,y+1,v*104,rh-2);
  }
  nctx.fillStyle='rgba(160,190,175,.35)'; nctx.fillRect(109,0,2,165);
}
const kymo=document.createElement('canvas'); kymo.width=220; kymo.height=165;
const kctx=kymo.getContext('2d'); kctx.fillStyle='#07120f'; kctx.fillRect(0,0,220,165);
let kf=0;
function pushKymo(){
  kctx.drawImage(kymo,-1,0);
  const NCU=body.curvature.length, rh=165/NCU;
  for (let j=0;j<NCU;j++){
    const c=Math.max(-1,Math.min(1,body.curvature[j]*2.4));
    kctx.fillStyle=c>0?'rgba(255,125,92,'+(0.12+0.88*c)+')':'rgba(86,224,194,'+(0.12-0.88*c)+')';
    kctx.fillRect(219,j*rh,1,rh+1);
  }
}
const SGX=44,SGY=28,sf=new Float32Array(SGX*SGY); let sframe=0;
function drawScent(){
  if (sframe++%8===0){
    for (let j=0;j<SGY;j++) for (let i=0;i<SGX;i++)
      sf[j*SGX+i]=env.concentrationAt((i+0.5)/SGX*W,(j+0.5)/SGY*H);
  }
  nctx.fillStyle='#07120f'; nctx.fillRect(0,0,220,165);
  for (let j=0;j<SGY;j++) for (let i=0;i<SGX;i++){
    const a=Math.min(1,Math.pow(sf[j*SGX+i],0.45)*1.15);
    if(a<0.03) continue;
    nctx.fillStyle='rgba(222,196,110,'+(a*0.9).toFixed(3)+')';
    nctx.fillRect(i*5,12+j*5,5,5);
  }
  nctx.fillStyle='#e2eee5';
  nctx.fillRect(body.noseX/W*220-2,12+body.noseY/H*140-2,4,4);
}
function drawViz(){
  if (viz==='neurons') drawNeurons();
  else if (viz==='muscles') drawMuscles();
  else if (viz==='wave'){ nctx.drawImage(kymo,0,0); }
  else drawScent();
}
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
    if (frame%2===0) pushKymo();
    if (frame%4===0){
      trail.push([body.noseX,body.noseY]);
      if (trail.length>900) trail.shift();
    }
  }
  draw(); drawViz();
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
el('b-clean').addEventListener('click',()=>{ const on=document.body.classList.toggle('clean'); el('b-clean').dataset.on=String(on); });
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
  else if (k==='v'||k==='V'){ const t=[...document.querySelectorAll('.vtab')];
    const c=t.findIndex(b=>b.dataset.viz===viz); t[(c+1)%t.length].click(); }
  else if (k>='1'&&k<='5'){ const b=document.querySelectorAll('.preset')[+k-1]; if(b) b.click(); }
});
if (window.self!==window.top) document.body.classList.add('in-frame');
// test hook: lets automated checks find the worm
window.__worm={body,brain,env,poke};
