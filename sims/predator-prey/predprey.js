const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
const chartCanvas = document.getElementById('chart');
const chartCtx = chartCanvas.getContext('2d');

function resize() {
  canvas.width = canvas.clientWidth * devicePixelRatio;
  canvas.height = canvas.clientHeight * devicePixelRatio;
  chartCanvas.width = chartCanvas.clientWidth * devicePixelRatio;
  chartCanvas.height = chartCanvas.clientHeight * devicePixelRatio;
}
window.addEventListener('resize', resize);
resize();

const params = { preyBirth: 0.02, predDeath: 0.01, predEff: 0.6 };
const els = {
  pb: document.getElementById('pb'), vpb: document.getElementById('v-pb'),
  pd: document.getElementById('pd'), vpd: document.getElementById('v-pd'),
  pe: document.getElementById('pe'), vpe: document.getElementById('v-pe'),
  reset: document.getElementById('reset'),
};
els.pb.addEventListener('input', () => { params.preyBirth = +els.pb.value; els.vpb.textContent = params.preyBirth.toFixed(3); });
els.pd.addEventListener('input', () => { params.predDeath = +els.pd.value; els.vpd.textContent = params.predDeath.toFixed(3); });
els.pe.addEventListener('input', () => { params.predEff = +els.pe.value; els.vpe.textContent = params.predEff.toFixed(2); });
els.reset.addEventListener('click', init);

function rand(min, max) { return Math.random() * (max - min) + min; }

let prey = [], predators = [];
let history = [];
const MAX_HISTORY = 400;

class Agent {
  constructor(energy) {
    this.x = rand(0, canvas.width);
    this.y = rand(0, canvas.height);
    const a = rand(0, Math.PI * 2);
    this.vx = Math.cos(a); this.vy = Math.sin(a);
    this.energy = energy;
  }
  move(speed) {
    this.x += this.vx * speed * devicePixelRatio;
    this.y += this.vy * speed * devicePixelRatio;
    if (Math.random() < 0.03) {
      const a = rand(-0.6, 0.6);
      const c = Math.cos(a), s = Math.sin(a);
      const nvx = this.vx * c - this.vy * s;
      const nvy = this.vx * s + this.vy * c;
      this.vx = nvx; this.vy = nvy;
    }
    if (this.x < 0) this.x = canvas.width; if (this.x > canvas.width) this.x = 0;
    if (this.y < 0) this.y = canvas.height; if (this.y > canvas.height) this.y = 0;
  }
}

function init() {
  prey = Array.from({ length: 90 }, () => new Agent(1));
  predators = Array.from({ length: 25 }, () => new Agent(1));
  history = [];
}

function step() {
  for (const p of prey) p.move(1.4);
  const newPrey = [];
  for (const p of prey) {
    if (Math.random() < params.preyBirth) newPrey.push(new Agent(1));
  }
  if (prey.length < 2000) prey.push(...newPrey);

  for (const pr of predators) pr.move(1.7);
  const eaten = new Set();
  for (const pr of predators) {
    pr.energy -= 0.01;
    let closestIdx = -1, closestD = 22 * devicePixelRatio;
    for (let i = 0; i < prey.length; i++) {
      if (eaten.has(i)) continue;
      const d = Math.hypot(prey[i].x - pr.x, prey[i].y - pr.y);
      if (d < closestD) { closestD = d; closestIdx = i; }
    }
    if (closestIdx >= 0) {
      eaten.add(closestIdx);
      pr.energy += params.predEff;
    }
    if (Math.random() < params.predDeath) pr.energy -= 1;
  }
  prey = prey.filter((_, i) => !eaten.has(i));
  const newPred = [];
  predators = predators.filter(pr => {
    if (pr.energy <= 0) return false;
    if (pr.energy > 1.8) { pr.energy -= 1; newPred.push(new Agent(1)); }
    return true;
  });
  if (predators.length < 800) predators.push(...newPred);

  history.push({ prey: prey.length, pred: predators.length });
  if (history.length > MAX_HISTORY) history.shift();
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#5fe08a';
  for (const p of prey) { ctx.beginPath(); ctx.arc(p.x, p.y, 2.2 * devicePixelRatio, 0, 7); ctx.fill(); }
  ctx.fillStyle = '#ff6b6b';
  for (const pr of predators) { ctx.beginPath(); ctx.arc(pr.x, pr.y, 3.2 * devicePixelRatio, 0, 7); ctx.fill(); }

  chartCtx.clearRect(0, 0, chartCanvas.width, chartCanvas.height);
  if (history.length > 1) {
    const maxV = Math.max(10, ...history.map(h => Math.max(h.prey, h.pred)));
    const w = chartCanvas.width / MAX_HISTORY;
    const h = chartCanvas.height;
    const plot = (key, color) => {
      chartCtx.beginPath();
      chartCtx.strokeStyle = color;
      chartCtx.lineWidth = 2 * devicePixelRatio;
      history.forEach((pt, i) => {
        const x = i * w;
        const y = h - (pt[key] / maxV) * h * 0.9 - 4;
        if (i === 0) chartCtx.moveTo(x, y); else chartCtx.lineTo(x, y);
      });
      chartCtx.stroke();
    };
    plot('prey', '#5fe08a');
    plot('pred', '#ff6b6b');
  }
}

function loop() {
  step();
  draw();
  if (prey.length === 0 && predators.length === 0) { init(); }
  requestAnimationFrame(loop);
}

init();
requestAnimationFrame(loop);
