const canvas=document.getElementById('c'),ctx=canvas.getContext('2d');
const chartCanvas=document.getElementById('chart'),chartCtx=chartCanvas.getContext('2d');
function resize(){canvas.width=canvas.clientWidth*devicePixelRatio;canvas.height=canvas.clientHeight*devicePixelRatio;chartCanvas.width=chartCanvas.clientWidth*devicePixelRatio;chartCanvas.height=chartCanvas.clientHeight*devicePixelRatio;}
window.addEventListener('resize',resize);resize();
const params={preyBirth:0.02,predDeath:0.01,predEff:0.6,vision:70};
function bindSlider(id,vid,key,fmt){const el=document.getElementById(id),v=document.getElementById(vid);el.addEventListener('input',()=>{params[key]=+el.value;v.textContent=fmt(params[key]);});}
bindSlider('pb','v-pb','preyBirth',x=>x.toFixed(3));
bindSlider('pd','v-pd','predDeath',x=>x.toFixed(3));
bindSlider('pe','v-pe','predEff',x=>x.toFixed(2));
bindSlider('vr','v-vr','vision',x=>Math.round(x));
document.getElementById('reset').addEventListener('click',init);
function rand(a,b){return Math.random()*(b-a)+a;}
let prey=[],predators=[],history=[],pulses=[];
const MAX_HISTORY=400;
class Agent{
  constructor(energy){
    this.x=rand(0,canvas.width);this.y=rand(0,canvas.height);
    const a=rand(0,Math.PI*2);this.vx=Math.cos(a);this.vy=Math.sin(a);
    this.energy=energy;
  }
  steer(tx,ty,turn){
    let dx=tx-this.x,dy=ty-this.y;const d=Math.hypot(dx,dy)||1;dx/=d;dy/=d;
    this.vx+=(dx-this.vx)*turn;this.vy+=(dy-this.vy)*turn;
    const n=Math.hypot(this.vx,this.vy)||1;this.vx/=n;this.vy/=n;
  }
  wander(){
    const a=rand(-0.5,0.5),c=Math.cos(a),s=Math.sin(a);
    const nvx=this.vx*c-this.vy*s,nvy=this.vx*s+this.vy*c;
    this.vx=nvx;this.vy=nvy;
  }
  move(speed){
    this.x+=this.vx*speed*devicePixelRatio;this.y+=this.vy*speed*devicePixelRatio;
    if(this.x<0)this.x=canvas.width;if(this.x>canvas.width)this.x=0;
    if(this.y<0)this.y=canvas.height;if(this.y>canvas.height)this.y=0;
  }
}
function buildGrid(list,cellSize){
  const g=new Map();
  list.forEach((a,i)=>{
    const k=Math.floor(a.x/cellSize)+','+Math.floor(a.y/cellSize);
    if(!g.has(k))g.set(k,[]);
    g.get(k).push(i);
  });
  return g;
}
function nearest(list,grid,cellSize,x,y,radius){
  const cx=Math.floor(x/cellSize),cy=Math.floor(y/cellSize);
  let bestI=-1,bestD=radius;
  for(let ox=-1;ox<=1;ox++)for(let oy=-1;oy<=1;oy++){
    const arr=grid.get((cx+ox)+','+(cy+oy));
    if(!arr)continue;
    for(const i of arr){
      const d=Math.hypot(list[i].x-x,list[i].y-y);
      if(d<bestD){bestD=d;bestI=i;}
    }
  }
  return bestI;
}
function init(){
  const area=(canvas.width*canvas.height)/(devicePixelRatio*devicePixelRatio);
  init.capacity=Math.max(120,Math.round(area/1800));
  prey=Array.from({length:Math.min(80,init.capacity)},()=>new Agent(1));
  predators=Array.from({length:20},()=>new Agent(1));
  history=[];pulses=[];
}
function step(){
  const vis=params.vision*devicePixelRatio,cell=Math.max(30,vis/2);
  const predGrid=buildGrid(predators,cell),preyGrid=buildGrid(prey,cell);
  const capacity=init.capacity;
  const newPrey=[];
  for(const p of prey){
    const ni=nearest(predators,predGrid,cell,p.x,p.y,vis);
    if(ni>=0){
      const pr=predators[ni];
      p.steer(2*p.x-pr.x,2*p.y-pr.y,0.3);p.move(2.1);p.energy-=0.006;
    } else {
      p.wander();p.move(1.2);p.energy+=0.004;
    }
    if(p.energy>1.6 && Math.random()<params.preyBirth*(1-prey.length/capacity)){
      p.energy-=0.6;newPrey.push(new Agent(0.9));
    }
  }
  prey=prey.filter(p=>p.energy>0);
  if(prey.length<capacity*1.3)prey.push(...newPrey);
  const eaten=new Set(),newPred=[];
  for(const pr of predators){
    const ni=nearest(prey,preyGrid,cell,pr.x,pr.y,vis);
    if(ni>=0 && !eaten.has(ni)){
      const t=prey[ni];pr.steer(t.x,t.y,0.25);pr.move(2.3);
      if(Math.hypot(t.x-pr.x,t.y-pr.y)<10*devicePixelRatio){eaten.add(ni);pr.energy+=params.predEff;}
    } else {pr.wander();pr.move(1.6);}
    pr.energy-=params.predDeath;
    if(pr.energy>2.0){pr.energy-=1.0;newPred.push(new Agent(1));}
  }
  prey=prey.filter((_,i)=>!eaten.has(i));
  predators=predators.filter(pr=>pr.energy>0);
  if(predators.length<400)predators.push(...newPred);
  if(prey.length===0 && predators.length===0)init();
  history.push({prey:prey.length,pred:predators.length});
  if(history.length>MAX_HISTORY)history.shift();
}
canvas.addEventListener('click',e=>{
  const rect=canvas.getBoundingClientRect();
  const x=(e.clientX-rect.left)/rect.width*canvas.width;
  const y=(e.clientY-rect.top)/rect.height*canvas.height;
  const r=70*devicePixelRatio;
  for(const p of prey){if(Math.hypot(p.x-x,p.y-y)<r)p.energy+=0.5;}
  pulses.push({x,y,t:0});
});
function draw(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  pulses.forEach(p=>{
    p.t++;
    ctx.strokeStyle=`rgba(79,209,197,${Math.max(0,1-p.t/30)})`;
    ctx.lineWidth=2*devicePixelRatio;
    ctx.beginPath();ctx.arc(p.x,p.y,p.t*3*devicePixelRatio,0,7);ctx.stroke();
  });
  pulses=pulses.filter(p=>p.t<30);
  function drawAgent(a,color,size){
    const alpha=Math.max(0.35,Math.min(1,a.energy/1.4));
    const ang=Math.atan2(a.vy,a.vx);
    ctx.save();ctx.translate(a.x,a.y);ctx.rotate(ang);
    ctx.fillStyle=color.replace('ALPHA',alpha.toFixed(2));
    ctx.beginPath();ctx.moveTo(size*1.6,0);ctx.lineTo(-size,size*0.8);ctx.lineTo(-size,-size*0.8);ctx.closePath();ctx.fill();
    ctx.restore();
  }
  for(const p of prey)drawAgent(p,'rgba(95,224,138,ALPHA)',2.6*devicePixelRatio);
  for(const pr of predators)drawAgent(pr,'rgba(255,107,107,ALPHA)',3.6*devicePixelRatio);
  chartCtx.clearRect(0,0,chartCanvas.width,chartCanvas.height);
  if(history.length>1){
    const maxV=Math.max(10,...history.map(h=>Math.max(h.prey,h.pred)));
    const w=chartCanvas.width/MAX_HISTORY,h=chartCanvas.height;
    const plot=(key,color)=>{
      chartCtx.beginPath();chartCtx.strokeStyle=color;chartCtx.lineWidth=2*devicePixelRatio;
      history.forEach((pt,i)=>{const x=i*w,y=h-(pt[key]/maxV)*h*0.9-4;if(i===0)chartCtx.moveTo(x,y);else chartCtx.lineTo(x,y);});
      chartCtx.stroke();
    };
    plot('prey','#5fe08a');plot('pred','#ff6b6b');
  }
}
let paused=false;
function loop(){if(!paused){step();draw();}requestAnimationFrame(loop);}
const pauseBtn=document.getElementById('pause');
if(pauseBtn)pauseBtn.addEventListener('click',()=>{paused=!paused;pauseBtn.textContent=paused?'Resume':'Pause';});
init();requestAnimationFrame(loop);
