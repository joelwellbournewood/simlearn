const canvas=document.getElementById('c'), ctx=canvas.getContext('2d');
const $=id=>document.getElementById(id);
const P={pop:200,rad:12,pinf:0.3,rec:300,mort:0.05,dist:0,vax:0};
// state: 0=S 1=I 2=R 3=D 4=V
let ag=[], pulses=[], hist=[], sampleEvery=2, stepCount=0, peakI=0, spreads=[], paused=false;
const CHART_H=90;

function resize(){canvas.width=canvas.clientWidth;canvas.height=canvas.clientHeight;}
function init(){
  ag=[];pulses=[];hist=[];sampleEvery=2;stepCount=0;peakI=0;spreads=[];
  for(let i=0;i<P.pop;i++){
    const a=Math.random()*Math.PI*2;
    ag.push({x:Math.random()*canvas.width,y:Math.random()*(canvas.height-CHART_H),
      vx:Math.cos(a)*1.2,vy:Math.sin(a)*1.2,state:0,timer:0,spread:0,distancing:false});
  }
  let nv=Math.round(P.pop*P.vax);
  for(let i=0;i<nv;i++) ag[i].state=4;
  applyDistancing();
  // patient zero: a random susceptible
  const sus=ag.filter(a=>a.state===0);
  if(sus.length){const p=sus[Math.floor(Math.random()*sus.length)];p.state=1;}
}
function applyDistancing(){
  const nd=Math.round(P.pop*P.dist);
  // deterministic: last nd agents distance (independent of vax block at front)
  for(let i=0;i<ag.length;i++) ag[i].distancing = i>=ag.length-nd;
}
function seedAt(x,y){
  let best=null,bd=1e18;
  for(const a of ag){if(a.state!==0)continue;const d=(a.x-x)**2+(a.y-y)**2;if(d<bd){bd=d;best=a;}}
  if(best){best.state=1;best.timer=0;best.spread=0;}
}
function step(){
  stepCount++;
  const H=canvas.height-CHART_H;
  for(const a of ag){
    if(a.state===3) continue;
    if(!a.distancing){
      a.x+=a.vx;a.y+=a.vy;
      if(a.x<0||a.x>canvas.width)a.vx*=-1;
      if(a.y<0||a.y>H)a.vy*=-1;
      a.x=Math.max(0,Math.min(canvas.width,a.x));
      a.y=Math.max(0,Math.min(H,a.y));
    }
    if(a.state===1){
      a.timer++;
      if(a.timer>P.rec){
        spreads.push(a.spread); if(spreads.length>150)spreads.shift();
        a.state = Math.random()<P.mort ? 3 : 2;
      }
    }
  }
  // spatial grid of susceptibles
  const cell=Math.max(P.rad,16), cols=Math.max(1,Math.ceil(canvas.width/cell));
  const grid=new Map();
  for(const a of ag){ if(a.state!==0)continue;
    const k=Math.floor(a.x/cell)+cols*Math.floor(a.y/cell);
    let b=grid.get(k); if(!b){b=[];grid.set(k,b);} b.push(a);
  }
  const r2=P.rad*P.rad;
  for(const a of ag){ if(a.state!==1)continue;
    const cx=Math.floor(a.x/cell), cy=Math.floor(a.y/cell);
    for(let gx=cx-1;gx<=cx+1;gx++)for(let gy=cy-1;gy<=cy+1;gy++){
      const b=grid.get(gx+cols*gy); if(!b)continue;
      for(const s of b){ if(s.state!==0)continue;
        const dx=a.x-s.x,dy=a.y-s.y;
        if(dx*dx+dy*dy<r2 && Math.random()<P.pinf){
          s.state=1;s.timer=0;s.spread=0;a.spread++;
          pulses.push({x:s.x,y:s.y,r:2});
        }
      }
    }
  }
  // history for chart
  if(stepCount%sampleEvery===0){
    const c=[0,0,0,0,0]; for(const a of ag)c[a.state]++;
    hist.push(c);
    if(hist.length>360){hist=hist.filter((_,i)=>i%2===0);sampleEvery*=2;}
  }
}
const COL={0:'#4f8ce6',1:'#e65f5f',2:'#4fd196',3:'#5a6273',4:'#e6c04f'};
function draw(){
  ctx.fillStyle='#0d1220';ctx.fillRect(0,0,canvas.width,canvas.height);
  // infection radius glow
  ctx.strokeStyle='rgba(230,95,95,0.15)';
  for(const a of ag){ if(a.state!==1)continue;
    ctx.beginPath();ctx.arc(a.x,a.y,P.rad,0,Math.PI*2);ctx.stroke();
  }
  // pulses
  for(let i=pulses.length-1;i>=0;i--){const p=pulses[i];p.r+=0.8;
    if(p.r>22){pulses.splice(i,1);continue;}
    ctx.strokeStyle=`rgba(230,95,95,${1-p.r/22})`;
    ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.stroke();
  }
  const c=[0,0,0,0,0];
  for(const a of ag){
    c[a.state]++;
    if(a.state===3){ // dead: gray x
      ctx.strokeStyle=COL[3];ctx.beginPath();
      ctx.moveTo(a.x-3,a.y-3);ctx.lineTo(a.x+3,a.y+3);
      ctx.moveTo(a.x+3,a.y-3);ctx.lineTo(a.x-3,a.y+3);ctx.stroke();
      continue;
    }
    ctx.fillStyle=COL[a.state];
    ctx.beginPath();ctx.arc(a.x,a.y,4,0,Math.PI*2);ctx.fill();
    if(a.distancing){ctx.strokeStyle='rgba(255,255,255,0.5)';
      ctx.beginPath();ctx.arc(a.x,a.y,6.5,0,Math.PI*2);ctx.stroke();}
  }
  peakI=Math.max(peakI,c[1]);
  drawChart();
  $('s-count').textContent=c[0];$('i-count').textContent=c[1];
  $('r-count').textContent=c[2];$('d-count').textContent=c[3];
  $('v-count').textContent=c[4];$('peak-count').textContent=peakI;
  const el=$('r0-val');
  if(spreads.length>=5){
    const avg=spreads.reduce((a,b)=>a+b,0)/spreads.length;
    el.textContent=avg.toFixed(2);
    el.style.color=avg>1?'#e65f5f':'#4fd196';
  } else {el.textContent='\u2013';el.style.color='#4fd1c5';}
}
function drawChart(){
  const y0=canvas.height-CHART_H, w=canvas.width;
  ctx.fillStyle='rgba(5,7,12,0.85)';ctx.fillRect(0,y0,w,CHART_H);
  ctx.strokeStyle='#1f2636';ctx.beginPath();ctx.moveTo(0,y0);ctx.lineTo(w,y0);ctx.stroke();
  if(hist.length<2)return;
  const n=hist.length, order=[1,3,2,4,0]; // stack: I, D, R, V, S
  for(let x=0;x<w;x++){
    const h=hist[Math.min(n-1,Math.floor(x/w*n))];
    const tot=h[0]+h[1]+h[2]+h[3]+h[4]||1;
    let yy=canvas.height;
    for(const s of order){
      const hh=h[s]/tot*CHART_H; if(hh<=0)continue;
      ctx.fillStyle=COL[s];ctx.globalAlpha=s===0?0.25:0.8;
      ctx.fillRect(x,yy-hh,1,hh);yy-=hh;
    }
  }
  ctx.globalAlpha=1;
  ctx.fillStyle='#9aa5b8';ctx.font='11px sans-serif';
  ctx.fillText('epidemic curve \u2192 time',8,y0+14);
}
function loop(){if(!paused){step();draw();}requestAnimationFrame(loop);}
$('pause').addEventListener('click',()=>{paused=!paused;$('pause').textContent=paused?'Resume':'Pause';});
$('reset').addEventListener('click',init);
const fmt={pop:v=>v,rad:v=>v,pinf:v=>(+v).toFixed(2),rec:v=>v,mort:v=>v+'%',dist:v=>v+'%',vax:v=>v+'%'};
['pop','rad','pinf','rec','mort','dist','vax'].forEach(id=>{
  $(id).addEventListener('input',e=>{
    const v=+e.target.value; $('v-'+id).textContent=fmt[id](e.target.value);
    if(id==='mort')P.mort=v/100; else if(id==='dist'){P.dist=v/100;applyDistancing();}
    else if(id==='vax'){P.vax=v/100;init();}
    else {P[id]=v; if(id==='pop')init();}
  });
});
canvas.addEventListener('click',e=>{
  const r=canvas.getBoundingClientRect();
  seedAt((e.clientX-r.left)*canvas.width/r.width,(e.clientY-r.top)*canvas.height/r.height);
});
window.addEventListener('resize',()=>{resize();init();});
resize();init();requestAnimationFrame(loop);
