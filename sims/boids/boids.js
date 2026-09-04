const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');

function resize() {
  canvas.width = canvas.clientWidth * devicePixelRatio;
  canvas.height = canvas.clientHeight * devicePixelRatio;
}
window.addEventListener('resize', resize);
resize();

const state = { sep: 1.5, ali: 1.0, coh: 1.0, count: 120, paused: false };

const els = {
  sep: document.getElementById('sep'),
  ali: document.getElementById('ali'),
  coh: document.getElementById('coh'),
  count: document.getElementById('count'),
  vSep: document.getElementById('v-sep'),
  vAli: document.getElementById('v-ali'),
  vCoh: document.getElementById('v-coh'),
  vCount: document.getElementById('v-count'),
  reset: document.getElementById('reset'),
  pause: document.getElementById('pause'),
};

els.sep.addEventListener('input', () => { state.sep = +els.sep.value; els.vSep.textContent = state.sep.toFixed(1); });
els.ali.addEventListener('input', () => { state.ali = +els.ali.value; els.vAli.textContent = state.ali.toFixed(1); });
els.coh.addEventListener('input', () => { state.coh = +els.coh.value; els.vCoh.textContent = state.coh.toFixed(1); });
els.count.addEventListener('input', () => { state.count = +els.count.value; els.vCount.textContent = state.count; initBoids(); });
els.reset.addEventListener('click', initBoids);
els.pause.addEventListener('click', () => {
  state.paused = !state.paused;
  els.pause.textContent = state.paused ? 'Resume' : 'Pause';
  if (!state.paused) requestAnimationFrame(loop);
});

const PERCEPTION = 70;
const MAX_SPEED = 3.2;
const MAX_FORCE = 0.09;

let boids = [];

function rand(min, max) { return Math.random() * (max - min) + min; }

class Boid {
  constructor() {
    this.x = rand(0, canvas.width);
    this.y = rand(0, canvas.height);
    const angle = rand(0, Math.PI * 2);
    this.vx = Math.cos(angle) * MAX_SPEED;
    this.vy = Math.sin(angle) * MAX_SPEED;
  }
  update(neighbors) {
    let sepX = 0, sepY = 0, aliX = 0, aliY = 0, cohX = 0, cohY = 0, n = 0;
    const scale = devicePixelRatio;
    for (const o of neighbors) {
      if (o === this) continue;
      const dx = this.x - o.x, dy = this.y - o.y;
      const d = Math.hypot(dx, dy);
      if (d < PERCEPTION * scale && d > 0) {
        sepX += dx / d; sepY += dy / d;
        aliX += o.vx; aliY += o.vy;
        cohX += o.x; cohY += o.y;
        n++;
      }
    }
    if (n > 0) {
      aliX /= n; aliY /= n;
      cohX = cohX / n - this.x; cohY = cohY / n - this.y;
      this.vx += (sepX * state.sep + aliX * state.ali * 0.05 + cohX * state.coh * 0.001) * MAX_FORCE;
      this.vy += (sepY * state.sep + aliY * state.ali * 0.05 + cohY * state.coh * 0.001) * MAX_FORCE;
    }
    const speed = Math.hypot(this.vx, this.vy);
    if (speed > MAX_SPEED) { this.vx = (this.vx / speed) * MAX_SPEED; this.vy = (this.vy / speed) * MAX_SPEED; }
    this.x += this.vx * scale;
    this.y += this.vy * scale;
    if (this.x < 0) this.x = canvas.width;
    if (this.x > canvas.width) this.x = 0;
    if (this.y < 0) this.y = canvas.height;
    if (this.y > canvas.height) this.y = 0;
  }
  draw() {
    const angle = Math.atan2(this.vy, this.vx);
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(8, 0);
    ctx.lineTo(-6, 4);
    ctx.lineTo(-6, -4);
    ctx.closePath();
    ctx.fillStyle = '#56e0c2';
    ctx.fill();
    ctx.restore();
  }
}

function initBoids() {
  boids = Array.from({ length: state.count }, () => new Boid());
}

function loop() {
  if (state.paused) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const b of boids) b.update(boids);
  for (const b of boids) b.draw();
  requestAnimationFrame(loop);
}

initBoids();
requestAnimationFrame(loop);
