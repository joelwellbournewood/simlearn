// Cost of one tick, measured rather than guessed. Run: node tools/bench.mjs
// Population is held constant (no metabolism, no births, no bites) so the number is the
// cost of N agents and not the cost of a population that drifted during the run.
import { World } from '../src/core/world.js';
import { Field } from '../src/core/field.js';

const STATIC = { metabolism: 0, moveCost: 0, birthEnergy: 1e9, biteDamage: 0 };
const BUDGET = 1000 / 30;

function timeTicks(w, ticks) {
  const t0 = process.hrtime.bigint();
  for (let i = 0; i < ticks; i++) w.step();
  return Number(process.hrtime.bigint() - t0) / 1e6 / ticks;
}

console.log('A. Full tick, 2048x2048 world, 256x256 fields, sense radius 24');
console.log('       N    agents/cell   ms/tick   % of 33.3ms budget   max N at 30Hz');
for (const n of [2000, 5000, 10000, 20000, 50000, 100000, 200000]) {
  const w = new World(999, Object.assign({ capacity: n + 10 }, STATIC));
  w.spawn(n);
  timeTicks(w, 30);                       // warm the jit
  const ms = timeTicks(w, 120);
  const perCell = (n / (w.grid.cols * w.grid.rows)).toFixed(2);
  console.log(`${String(n).padStart(8)} ${perCell.padStart(12)} ${ms.toFixed(3).padStart(9)} ${(100 * ms / BUDGET).toFixed(1).padStart(20)} ${Math.round(n * BUDGET / ms).toLocaleString('en-US').padStart(15)}`);
}

console.log('\nA2. Same sweep at CONSTANT DENSITY (world grown with N, 2.77 agents per cell)');
console.log('       N    world edge   ms/tick   ns per agent   % of 33.3ms budget');
for (const n of [2000, 10000, 20000, 50000, 100000, 200000, 400000]) {
  const edge = Math.round(2048 * Math.sqrt(n / 20000));
  const fw = Math.min(1024, Math.max(64, 1 << Math.round(Math.log2(256 * Math.sqrt(n / 20000)))));
  const w = new World(999, Object.assign({ capacity: n + 10, worldW: edge, worldH: edge, fieldW: fw, fieldH: fw }, STATIC));
  w.spawn(n);
  timeTicks(w, 30);
  const ms = timeTicks(w, 60);
  console.log(`${String(n).padStart(8)} ${String(edge).padStart(12)} ${ms.toFixed(3).padStart(9)} ${(ms * 1e6 / n).toFixed(0).padStart(14)} ${(100 * ms / BUDGET).toFixed(1).padStart(20)}`);
}

console.log('\nB. Where the time goes at N = 20000 (same run, one stage disabled at a time)');
const base = () => { const w = new World(999, Object.assign({ capacity: 20010 }, STATIC)); w.spawn(20000); timeTicks(w, 30); return w; };
const full = timeTicks(base(), 120);
const noField = (() => { const w = base(); w.food.diffuseDecay = () => {}; w.scent.diffuseDecay = () => {}; timeTicks(w, 20); return timeTicks(w, 120); })();
const gridOnly = (() => {
  const w = base(); const g = w.grid, x = w.x, y = w.y, n = w.count;
  const t0 = process.hrtime.bigint(); for (let i = 0; i < 400; i++) g.build(x, y, n);
  return Number(process.hrtime.bigint() - t0) / 1e6 / 400;
})();
console.log(`  whole tick            ${full.toFixed(3)} ms`);
console.log(`  fields (2 grids)      ${(full - noField).toFixed(3)} ms`);
console.log(`  spatial hash rebuild  ${gridOnly.toFixed(3)} ms`);
console.log(`  pairs + integrate     ${(noField - gridOnly).toFixed(3)} ms (remainder)`);

console.log('\nC. One field, diffuse and decay, ms per tick');
for (const s of [128, 256, 512, 1024]) {
  const f = new Field(s, s);
  for (let i = 0; i < f.a.length; i++) f.a[i] = (i % 97) / 97;
  for (let i = 0; i < 20; i++) f.diffuseDecay(0.12, 0.999);
  const t0 = process.hrtime.bigint();
  const reps = s >= 512 ? 60 : 300;
  for (let i = 0; i < reps; i++) f.diffuseDecay(0.12, 0.999);
  const ms = Number(process.hrtime.bigint() - t0) / 1e6 / reps;
  console.log(`  ${String(s).padStart(4)}^2 = ${String(s * s).padStart(9)} cells   ${ms.toFixed(3).padStart(7)} ms   ${(100 * ms / BUDGET).toFixed(1)}% of budget`);
}

console.log('\nD. Memory at N = 200000: ' +
  (200000 * 4 * 9 / 1048576).toFixed(1) + ' MiB of agent arrays, ' +
  (2 * 256 * 256 * 4 * 2 / 1048576).toFixed(1) + ' MiB of fields');

console.log('\nE. Render preparation on the CPU: pack N instances into an interleaved buffer');
console.log('   (8 floats each: x, y, size, hue, energy, heading, phase, flags)');
for (const n of [5000, 20000, 100000]) {
  const w = new World(999, Object.assign({ capacity: n + 10 }, STATIC));
  w.spawn(n);
  const inst = new Float32Array(n * 8);
  const pack = () => {
    const x = w.x, y = w.y, vx = w.vx, vy = w.vy, en = w.energy, rd = w.radius, dt = w.diet;
    for (let i = 0, o = 0; i < n; i++, o += 8) {
      inst[o] = x[i]; inst[o + 1] = y[i]; inst[o + 2] = rd[i];
      inst[o + 3] = dt[i] * 0.5 + rd[i] * 0.01; inst[o + 4] = en[i];
      inst[o + 5] = vx[i]; inst[o + 6] = vy[i]; inst[o + 7] = i & 7;
    }
  };
  for (let i = 0; i < 20; i++) pack();
  const t0 = process.hrtime.bigint();
  for (let i = 0; i < 200; i++) pack();
  const ms = Number(process.hrtime.bigint() - t0) / 1e6 / 200;
  console.log(`  N = ${String(n).padStart(6)}   ${ms.toFixed(3).padStart(7)} ms   ${(100 * ms / BUDGET).toFixed(1)}% of a 30Hz budget   buffer ${(n * 32 / 1048576).toFixed(2)} MiB`);
}
