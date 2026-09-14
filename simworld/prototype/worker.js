// Simulation worker. Owns the world, never touches a drawing API. Fixed 1/30 s ticks,
// caught up with an accumulator so a slow frame drops visual updates and not world time.
import { World } from '../src/core/world.js';

let world = null, running = true, acc = 0, last = 0;
let speed = 1;
let inst = null;
const FLOATS = 11;

function build(seed, n, dayLength, worldEdge) {
  world = new World(seed, {
    capacity: Math.max(4000, n * 6),
    worldW: worldEdge, worldH: worldEdge,
    fieldW: 256, fieldH: 256,
    dayLengthTicks: dayLength
  });
  world.spawn(n);
  inst = new Float32Array(world.opt.capacity * FLOATS);
  acc = 0; last = performance.now();
}

let nCarn = 0;
function pack() {
  const w = world, n = w.count, x = w.x, y = w.y, vx = w.vx, vy = w.vy;
  const en = w.energy, rd = w.radius, dt = w.diet, ar = w.armour, ag = w.age;
  const hu = w.hue, am = w.arm, lb = w.limbs, full = 1 / w.opt.satiety;
  nCarn = 0;
  for (let i = 0, o = 0; i < n; i++, o += FLOATS) {
    if (dt[i] > 0.5) nCarn++;
    inst[o] = x[i]; inst[o + 1] = y[i];
    inst[o + 2] = rd[i];
    inst[o + 3] = hu[i];                                            // lineage colour, a gene
    const e = en[i] * full;
    inst[o + 4] = e < 0 ? 0 : (e > 1 ? 1 : e);                      // saturation, energy
    inst[o + 5] = Math.atan2(vy[i], vx[i]);
    inst[o + 6] = ar[i];
    inst[o + 7] = (ag[i] % 1024) / 1024;                            // beat phase
    inst[o + 8] = am[i];                                            // armament, spines
    inst[o + 9] = lb[i];                                            // limb power, lobes
    const a = ag[i] / 9000;
    inst[o + 10] = a > 1 ? 1 : a;                                   // age, brightness
  }
  return n;
}

self.onmessage = (e) => {
  const m = e.data;
  if (m.cmd === 'init') build(m.seed, m.n, m.dayLength, m.edge);
  else if (m.cmd === 'pause') running = m.value;
  else if (m.cmd === 'speed') speed = m.value;
  else if (m.cmd === 'reseed') build(m.seed, m.n, m.dayLength, m.edge);
  else if (m.cmd === 'frame') {
    if (!world) return;
    const now = performance.now();
    let dtms = now - last; last = now;
    if (dtms > 250) dtms = 250;
    let steps = 0, t0 = performance.now();
    if (running) {
      acc += dtms * speed;
      while (acc >= 1000 / 30 && steps < 6) { world.step(); acc -= 1000 / 30; steps++; }
    }
    const simMs = steps ? (performance.now() - t0) / steps : 0;
    const n = pack();
    const view = inst.subarray(0, n * FLOATS);
    const copy = new Float32Array(view);
    self.postMessage({
      type: 'frame', n, nCarn, tick: world.tick, light: world.stats.light,
      births: world.stats.births, deaths: world.stats.deaths, bites: world.stats.bites,
      simMs, edge: world.opt.worldW, field: sampleField(), buf: copy.buffer
    }, [copy.buffer]);
  }
};

// A quarter resolution copy of the nutrient field for the ground layer.
let fieldOut = null;
function sampleField() {
  const f = world.food, s = 64;
  if (!fieldOut) fieldOut = new Uint8Array(s * s);
  const step = f.w / s;
  for (let y = 0; y < s; y++) {
    const sy = ((y * step) | 0) * f.w;
    for (let x = 0; x < s; x++) {
      let v = f.a[sy + ((x * step) | 0)] * 26;
      fieldOut[y * s + x] = v > 255 ? 255 : (v < 0 ? 0 : v | 0);
    }
  }
  return fieldOut;
}
