const canvas=document.getElementById('c'), ctx=canvas.getContext('2d');
const $=id=>document.getElementById(id);
const IMM_MAX=2200;
const P={pop:200,rad:12,pinf:0.3,rec:300,mort:0.05,dist:0,vax:0,imm:IMM_MAX,mut:0};
// state: 0=S 1=I 2=R 3=D 4=V
let ag=[],pulses=[],hist=[],sampleEvery=2,stepCount=0,peakI=0,spreads=[],paused=false;
let maxStrain=0,reinf=0;
const CHART_H=90, COL=['#4f8ce6','#e65f5f','#4fd196','#6d8479','#e6c04f'];
const HUES=[0,315,270,30,255,345];
function resize(){canvas.width=canvas.clientWidth;canvas.height=canvas.clientHeight;}
function init(){
  ag=[];pulses=[];hist=[];sampleEvery=2;stepCount=0;peakI=0;spreads=[];maxStrain=0;reinf=0;
  for(let i=0;i<P.pop;i++){
    const a=Math.random()*Math.PI*2;
    ag.push({x:Math.random()*canvas.width,y:Math.random()*(canvas.height-CHART_H),
      vx:Math.cos(a)*1.2,vy:Math.sin(a)*1.2,state:0,timer:0,spread:0,
      strain:0,immStrain:-1,immT:0,distancing:false});
  }
  const nv=Math.round(P.pop*P.vax);
  for(let i=0;i<nv;i++){ag[i].state=4;ag[i].immStrain=0;}
  applyDistancing();
  const sus=ag.filter(a=>a.state===0);
  if(sus.length){const p=sus[Math.floor(Math.random()*sus.length)];p.state=1;}
}
function applyDistancing(){
  const nd=Math.round(P.pop*P.dist);
  for(let i=0;i<ag.length;i++)ag[i].distancing=i>=ag.length-nd;
}
function seedAt(x,y){
  let best=null,bd=1e18;
  for(const a of ag){if(a.state!==0)continue;const d=(a.x-x)**2+(a.y-y)**2;if(d<bd){bd=d;best=a;}}
  if(best){best.state=1;best.timer=0;best.spread=0;best.strain=maxStrain;}
}
function infect(s,src){
  if(s.state===2||s.state===4)reinf++;
  s.state=1;s.timer=0;s.spread=0;
  s.strain=src.strain;
  if(Math.random()<P.mut){s.strain=++maxStrain;pulses.push({x:s.x,y:s.y,r:2,mut:true});}
  else pulses.push({x:s.x,y:s.y,r:2});
  src.spread++;
}
function protection(a,strain){
  if(a.immStrain<0)return 0;
  const d=strain-a.immStrain;
  return d<=0?1:Math.pow(0.5,d);
}
function step(){
  stepCount++;
  const H=canvas.height-CHART_H;
  for(const a of ag){
    if(a.state===3)continue;
    if(!a.distancing){
      a.x+=a.vx;a.y+=a.vy;
      if(a.x<0||a.x>canvas.width)a.vx*=-1;
      if(a.y<0||a.y>H)a.vy*=-1;
      a.x=Math.max(0,Math.min(canvas.width,a.x));a.y=Math.max(0,Math.min(H,a.y));
    }
    if(a.state===1){
      a.timer++;
      if(a.timer>P.rec){
        spreads.push(a.spread);if(spreads.length>150)spreads.shift();
        if(Math.random()<P.mort)a.state=3;
        else{a.state=2;a.immStrain=a.strain;a.immT=0;}
      }
    }else if((a.state===2||a.state===4)&&P.imm<IMM_MAX){
      a.immT++;
      if(a.immT>P.imm){a.state=0;a.immStrain=-1;}
    }
  }
  const cell=Math.max(P.rad,16),cols=Math.max(1,Math.ceil(canvas.width/cell));
  const grid=new Map();
  for(const a of ag){
    if(a.state!==0&&a.state!==2&&a.state!==4)continue;
    const k=Math.floor(a.x/cell)+cols*Math.floor(a.y/cell);
    let b=grid.get(k);if(!b){b=[];grid.set(k,b);}b.push(a);
  }
  const r2=P.rad*P.rad;
  for(const a of ag){
    if(a.state!==1)continue;
    const cx=Math.floor(a.x/cell),cy=Math.floor(a.y/cell);
    for(let gx=cx-1;gx<=cx+1;gx++)for(let gy=cy-1;gy<=cy+1;gy++){
      const b=grid.get(gx+cols*gy);if(!b)continue;
      for(const s of b){
        if(s.state===1||s.state===3)continue;
        const dx=a.x-s.x,dy=a.y-s.y;
        if(dx*dx+dy*dy<r2){
          const p=P.pinf*(1-protection(s,a.strain));
          if(p>0&&Math.random()<p)infect(s,a);
        }
      }
    }
  }
  if(stepCount%sampleEvery===0){
    const c=[0,0,0,0,0];for(const a of ag)c[a.state]++;
    hist.push(c);
    if(hist.length>360){hist=hist.filter((_,i)=>i%2===0);sampleEvery*=2;}
  }
}
function face(a){
  const R=5.5,dead=a.state===3;
  let col=COL[a.state];
  if(a.state===1)col='hsl('+HUES[a.strain%HUES.length]+',72%,58%)';
  ctx.globalAlpha=dead?0.75:1;
  if(a.state===1){
    ctx.fillStyle='rgba(230,95,95,0.07)';
    ctx.beginPath();ctx.arc(a.x,a.y,P.rad,0,Math.PI*2);ctx.fill();
  }
  ctx.fillStyle=col;
  ctx.beginPath();ctx.arc(a.x,a.y,R,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='rgba(0,0,0,0.35)';ctx.lineWidth=1;
  ctx.beginPath();ctx.arc(a.x,a.y,R,0,Math.PI*2);ctx.stroke();
  ctx.strokeStyle='#13261f';ctx.fillStyle='#13261f';ctx.lineWidth=1.1;
  if(dead){ // x eyes + flat mouth
    for(const ex of[-2,2]){
      ctx.beginPath();
      ctx.moveTo(a.x+ex-1.1,a.y-2.4);ctx.lineTo(a.x+ex+1.1,a.y-0.2);
      ctx.moveTo(a.x+ex+1.1,a.y-2.4);ctx.lineTo(a.x+ex-1.1,a.y-0.2);
      ctx.stroke();
    }
    ctx.beginPath();ctx.moveTo(a.x-2,a.y+2.6);ctx.lineTo(a.x+2,a.y+2.6);ctx.stroke();
  }else{
    ctx.beginPath();ctx.arc(a.x-2,a.y-1.4,0.9,0,Math.PI*2);
    ctx.arc(a.x+2,a.y-1.4,0.9,0,Math.PI*2);ctx.fill();
    ctx.beginPath();
    if(a.state===2||a.state===4)ctx.arc(a.x,a.y+0.8,2.6,0.25*Math.PI,0.75*Math.PI); // smile
    else if(a.state===1)ctx.arc(a.x,a.y+4.6,2.6,1.25*Math.PI,1.75*Math.PI); // frown
    else{ctx.moveTo(a.x-2,a.y+2.4);ctx.lineTo(a.x+2,a.y+2.4);} // neutral
    ctx.stroke();
  }
  if(a.distancing&&!dead){
    ctx.strokeStyle='rgba(255,255,255,0.45)';
    ctx.beginPath();ctx.arc(a.x,a.y,R+2.5,0,Math.PI*2);ctx.stroke();
  }
  ctx.globalAlpha=1;
}
function draw(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  for(let i=pulses.length-1;i>=0;i--){
    const p=pulses[i];p.r+=1.4;
    if(p.r>26){pulses.splice(i,1);continue;}
    ctx.strokeStyle=p.mut?'rgba(200,120,255,'+(1-p.r/26)+')':'rgba(230,95,95,'+(1-p.r/26)*0.7+')';
    ctx.lineWidth=p.mut?2:1.5;
    ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.stroke();
  }
  ctx.lineWidth=1;
  const c=[0,0,0,0,0];
  for(const a of ag){c[a.state]++;face(a);}
  peakI=Math.max(peakI,c[1]);
  drawChart();
  $('s-count').textContent=c[0];$('i-count').textContent=c[1];
  $('r-count').textContent=c[2];$('d-count').textContent=c[3];
  $('v-count').textContent=c[4];$('peak-count').textContent=peakI;
  $('strain-count').textContent=maxStrain+1;$('reinf-count').textContent=reinf;
  const el=$('r0-val');
  if(spreads.length>=5){
    const avg=spreads.reduce((a,b)=>a+b,0)/spreads.length;
    el.textContent=avg.toFixed(2);
    el.style.color=avg>1?'#e65f5f':'#4fd196';
  }else{el.textContent='\u2013';el.style.color='#56e0c2';}
}
function drawChart(){
  const y0=canvas.height-CHART_H,w=canvas.width;
  ctx.fillStyle='rgba(5,7,12,0.85)';ctx.fillRect(0,y0,w,CHART_H);
  ctx.strokeStyle='#22362e';ctx.beginPath();ctx.moveTo(0,y0);ctx.lineTo(w,y0);ctx.stroke();
  if(hist.length<2)return;
  const n=hist.length,order=[1,3,2,4,0];
  for(let x=0;x<w;x++){
    const h=hist[Math.min(n-1,Math.floor(x/w*n))];
    const tot=h[0]+h[1]+h[2]+h[3]+h[4]||1;
    let yy=canvas.height;
    for(const s of order){
      const hh=h[s]/tot*CHART_H;if(hh<=0)continue;
      ctx.fillStyle=COL[s];ctx.globalAlpha=s===0?0.25:0.8;
      ctx.fillRect(x,yy-hh,1,hh);yy-=hh;
    }
  }
  ctx.globalAlpha=1;
  ctx.fillStyle='#88a397';ctx.font='11px sans-serif';
  ctx.fillText('epidemic curve \u2192 time',8,y0+14);
}
const DEF={pop:200,rad:12,pinf:0.3,rec:300,mort:5,dist:0,vax:0,imm:2200,mut:0};
const PRESETS=[
 {name:'Baseline',s:{},d:'One sick person in an unprotected crowd: the classic boom-and-bust epidemic curve.'},
 {name:'Flatten the curve',s:{dist:60},d:'60% of people stay home. Same virus, but the peak is lower and later \u2014 hospitals survive.'},
 {name:'Herd immunity',s:{vax:75},d:'75% vaccinated: each case infects fewer than 1 other, so the outbreak fizzles before reaching the unvaccinated.'},
 {name:'Waning immunity',s:{imm:400},d:'Immunity fades after a while, so recovered people turn blue again \u2014 the epidemic returns in endless waves (SIRS).'},
 {name:'Mutating virus',s:{mut:3},d:'Each transmission has a 3% chance of a new variant (purple flash). Variants partly escape old immunity \u2014 waves of new colors.'},
 {name:'Deadly burnout',s:{mort:50,rec:120},d:'A very lethal, fast disease kills its hosts before spreading far \u2014 brutal locally, but it burns itself out.'}
];
const pb=$('presets');
PRESETS.forEach((p,i)=>{
  const b=document.createElement('button');b.textContent=p.name;
  b.addEventListener('click',()=>applyPreset(i));pb.appendChild(b);
});
function applyPreset(i){
  const p=PRESETS[i],vals=Object.assign({},DEF,p.s);
  for(const id in vals){const el=$(id);el.value=vals[id];setParam(id,vals[id]);}
  [...pb.children].forEach((b,j)=>b.classList.toggle('active',j===i));
  $('preset-desc').textContent=p.d;
  init();
}
const fmt={pop:v=>v,rad:v=>v,pinf:v=>(+v).toFixed(2),rec:v=>v,mort:v=>v+'%',
  dist:v=>v+'%',vax:v=>v+'%',imm:v=>+v>=IMM_MAX?'\u221e':v,mut:v=>v+'%'};
function setParam(id,v){
  v=+v;$('v-'+id).textContent=fmt[id](v);
  if(id==='mort')P.mort=v/100;
  else if(id==='dist'){P.dist=v/100;applyDistancing();}
  else if(id==='vax')P.vax=v/100;
  else if(id==='mut')P.mut=v/100;
  else P[id]=v;
}
['pop','rad','pinf','rec','mort','dist','vax','imm','mut'].forEach(id=>{
  $(id).addEventListener('input',e=>{
    setParam(id,e.target.value);
    if(id==='pop'||id==='vax')init();
    [...pb.children].forEach(b=>b.classList.remove('active'));
  });
});
function loop(){if(!paused){step();draw();}requestAnimationFrame(loop);}
$('pause').addEventListener('click',()=>{paused=!paused;$('pause').textContent=paused?'Resume':'Pause';});
$('reset').addEventListener('click',init);
canvas.addEventListener('click',e=>{
  const r=canvas.getBoundingClientRect();
  seedAt((e.clientX-r.left)*canvas.width/r.width,(e.clientY-r.top)*canvas.height/r.height);
});
window.addEventListener('resize',()=>{resize();init();});
resize();init();requestAnimationFrame(loop);
