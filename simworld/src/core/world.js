// SimWorld M0 core. One fixed step of 1/30 s. No wall clock, no Math.random, no Math.sin.
// Structure of arrays throughout: every per agent quantity is its own typed array, so a
// pass over one quantity is a linear walk through memory and the whole state is a memcpy
// away from being a save file.
//
// TICK ORDER IS PART OF THE SAVE FORMAT. Changing it changes every future from a given
// seed, so it is written down here and in docs/06-PERSISTENCE.md and versioned.
//   1 light      2 fields      3 spatial hash      4 sensing and steering
//   5 contact resolution and damage      6 integrate      7 metabolism, death, birth
import { Rng } from './prng.js';
import { Grid } from './grid.js';
import { Field } from './field.js';
import { dsin, clamp } from './dmath.js';

export const TICK_HZ = 30;
export const DT = 1 / 30;

export const DEFAULTS = {
  worldW: 2048, worldH: 2048,
  capacity: 200000,
  fieldW: 256, fieldH: 256,
  senseRadius: 24,        // also the spatial hash cell size
  dayLengthTicks: 1800,   // 60 s of real time at 30 Hz
  diffuse: 0.12, decay: 0.9985,
  growthPerLight: 0.020,  // nutrient added per lit cell per tick
  drag: 0.86,
  push: 45,               // contact repulsion stiffness
  maxSpeed: 7,            // hard cap, keeps the contact solver from exploding
  thrust: 26,             // steering force towards a gradient
  metabolism: 0.012,      // energy per tick at rest
  moveCost: 0.00025,      // energy per unit of speed squared
  eatRate: 0.35,          // fraction of the cell's nutrient taken per tick
  birthEnergy: 14, birthCost: 9, startEnergy: 6,
  biteDamage: 0.9         // energy taken per unit of closing speed on contact
};

export class World {
  constructor(seed, opts = {}) {
    const o = this.opt = Object.assign({}, DEFAULTS, opts);
    this.seed = seed >>> 0;
    this.rng = new Rng(this.seed);
    this.tick = 0;
    const cap = o.capacity;
    this.x = new Float32Array(cap); this.y = new Float32Array(cap);
    this.vx = new Float32Array(cap); this.vy = new Float32Array(cap);
    this.energy = new Float32Array(cap);
    this.radius = new Float32Array(cap);
    this.diet = new Float32Array(cap);   // 0 plant eater, 1 meat eater
    this.armour = new Float32Array(cap);
    this.age = new Uint32Array(cap);
    this.count = 0;
    this.grid = new Grid(o.worldW, o.worldH, o.senseRadius, cap);
    this.food = new Field(o.fieldW, o.fieldH);
    this.scent = new Field(o.fieldW, o.fieldH);
    this._dead = new Int32Array(cap);
    this.stats = { births: 0, deaths: 0, bites: 0, light: 0 };
  }

  spawn(n) {
    const o = this.opt, r = this.rng;
    for (let k = 0; k < n && this.count < o.capacity; k++) {
      const i = this.count++;
      this.x[i] = r.range(0, o.worldW); this.y[i] = r.range(0, o.worldH);
      this.vx[i] = r.range(-4, 4); this.vy[i] = r.range(-4, 4);
      this.energy[i] = o.startEnergy;
      this.radius[i] = r.range(2.2, 4.5);
      this.diet[i] = r.f32() < 0.12 ? 1 : 0;
      this.armour[i] = r.range(0, 0.6);
      this.age[i] = 0;
    }
    for (let i = 0; i < this.food.a.length; i++) this.food.a[i] = r.f32() * 2;
  }

  // Day length is a full cycle; light is 0 at midnight, 1 at noon, and it is the single
  // driver of plant growth, so night is a real resource squeeze rather than a filter.
  lightAt(tick) {
    const phase = (tick % this.opt.dayLengthTicks) / this.opt.dayLengthTicks;
    return clamp(0.5 + 0.5 * dsin(phase * 6.283185307179586), 0, 1);   // tick 0 is dawn
  }

  step() {
    const o = this.opt, n = this.count;
    const x = this.x, y = this.y, vx = this.vx, vy = this.vy;
    const en = this.energy, rad = this.radius, diet = this.diet, armour = this.armour;
    const W = o.worldW, H = o.worldH;

    // 1, 2: light drives growth, then the fields relax.
    const light = this.lightAt(this.tick);
    this.stats.light = light;
    const grow = o.growthPerLight * light;
    if (grow > 0) { const fa = this.food.a; for (let i = 0; i < fa.length; i++) fa[i] += grow; }
    this.food.diffuseDecay(o.diffuse * 0.25, 0.99995);
    this.scent.diffuseDecay(o.diffuse, o.decay);

    // 3
    this.grid.build(x, y, n);
    const g = this.grid, cols = g.cols, rows = g.rows, start = g.start, order = g.order;
    const R = o.senseRadius, R2 = R * R;
    let bites = 0;

    // 4, 5: one neighbour pass does sensing, contact push and damage. Newton's third law
    // is applied inside the pair so each pair is visited once, which halves the work.
    for (let cy = 0; cy < rows; cy++) {
      for (let cx = 0; cx < cols; cx++) {
        const c = cy * cols + cx, s0 = start[c], s1 = start[c + 1];
        if (s0 === s1) continue;
        for (let a = s0; a < s1; a++) {
          const i = order[a];
          const xi = x[i], yi = y[i], ri = rad[i];
          for (let dy = 0; dy <= 1; dy++) {
            const ny = cy + dy; if (ny >= rows) continue;
            for (let dx = (dy === 0 ? 0 : -1); dx <= 1; dx++) {
              const nx = cx + dx; if (nx < 0 || nx >= cols) continue;
              const nc = ny * cols + nx;
              let b0 = start[nc], b1 = start[nc + 1];
              if (nc === c) b0 = a + 1;
              else if (nc < c) continue;
              for (let b = b0; b < b1; b++) {
                const j = order[b];
                const ex = x[j] - xi, ey = y[j] - yi;
                const d2 = ex * ex + ey * ey;
                if (d2 > R2 || d2 === 0) continue;
                const d = Math.sqrt(d2), inv = 1 / d;
                const ux = ex * inv, uy = ey * inv;
                const touch = ri + rad[j];
                if (d < touch) {
                  // Contact. Push apart with mass taken as area.
                  const overlap = touch - d;
                  const mi = ri * ri, mj = rad[j] * rad[j], mt = mi + mj;
                  const f = o.push * overlap * DT;
                  vx[i] -= ux * f * (mj / mt); vy[i] -= uy * f * (mj / mt);
                  vx[j] += ux * f * (mi / mt); vy[j] += uy * f * (mi / mt);
                  // Competition is physical: damage is closing speed times how much of a
                  // mouth meets how little armour. Nothing here is an "attack" verb.
                  const closing = (vx[i] - vx[j]) * ux + (vy[i] - vy[j]) * uy;
                  if (closing > 0) {
                    const bi = diet[i] * closing * o.biteDamage * (1 - armour[j] * 0.8);
                    const bj = diet[j] * closing * o.biteDamage * (1 - armour[i] * 0.8);
                    if (bi > 0) { const t = bi < en[j] ? bi : en[j]; en[j] -= t; en[i] += t * 0.7; bites++; }
                    if (bj > 0) { const t = bj < en[i] ? bj : en[i]; en[i] -= t; en[j] += t * 0.7; bites++; }
                  }
                } else {
                  // Sensing at a distance: prey leaks scent, meat eaters climb the gradient.
                  const w = (1 - d / R);
                  if (diet[i] > 0.5 && diet[j] < 0.5) { vx[i] += ux * o.thrust * w * DT; vy[i] += uy * o.thrust * w * DT; }
                  if (diet[j] > 0.5 && diet[i] < 0.5) { vx[j] -= ux * o.thrust * w * DT; vy[j] -= uy * o.thrust * w * DT; }
                }
              }
            }
          }
        }
      }
    }
    this.stats.bites = bites;

    // 6, 7 in one pass over agents: steer up the food gradient, integrate, eat, pay, die.
    const invW = 1 / W, invH = 1 / H;
    let ndead = 0;
    const foodF = this.food, scentF = this.scent;
    for (let i = 0; i < n; i++) {
      const u = x[i] * invW, v = y[i] * invH;
      if (diet[i] < 0.5) {
        const gx = foodF.gradX(u, v), gy = foodF.gradY(u, v);
        const m = Math.sqrt(gx * gx + gy * gy);
        if (m > 1e-6) { const s = o.thrust * DT / m; vx[i] += gx * s; vy[i] += gy * s; }
      }
      vx[i] *= o.drag; vy[i] *= o.drag;
      const s2 = vx[i] * vx[i] + vy[i] * vy[i];
      if (s2 > o.maxSpeed * o.maxSpeed) { const k = o.maxSpeed / Math.sqrt(s2); vx[i] *= k; vy[i] *= k; }
      let nxp = x[i] + vx[i]; let nyp = y[i] + vy[i];
      if (nxp < 0) nxp += W; else if (nxp >= W) nxp -= W;
      if (nyp < 0) nyp += H; else if (nyp >= H) nyp -= H;
      x[i] = nxp; y[i] = nyp;
      const uu = nxp * invW, vv = nyp * invH;
      if (diet[i] < 0.5) {
        en[i] += foodF.take(uu, vv, o.eatRate);
        scentF.deposit(uu, vv, 0.05);
      }
      const sp = vx[i] * vx[i] + vy[i] * vy[i];
      en[i] -= o.metabolism + o.moveCost * sp * rad[i];
      this.age[i]++;
      if (en[i] <= 0) this._dead[ndead++] = i;
    }

    // Deaths, highest index first so a swap removal never moves a corpse we have not seen.
    for (let k = ndead - 1; k >= 0; k--) this._remove(this._dead[k]);
    this.stats.deaths += ndead;

    // Births: a full agent splits. Mutation is small and bounded.
    const r = this.rng;
    const m = this.count;
    for (let i = 0; i < m; i++) {
      if (en[i] >= o.birthEnergy && this.count < o.capacity) {
        en[i] -= o.birthCost;
        const j = this.count++;
        x[j] = x[i] + r.range(-2, 2); y[j] = y[i] + r.range(-2, 2);
        if (x[j] < 0) x[j] += W; else if (x[j] >= W) x[j] -= W;
        if (y[j] < 0) y[j] += H; else if (y[j] >= H) y[j] -= H;
        vx[j] = vx[i]; vy[j] = vy[i];
        en[j] = o.birthCost - 2;
        rad[j] = clamp(rad[i] + r.range(-0.25, 0.25), 1.6, 9);
        armour[j] = clamp(armour[i] + r.range(-0.05, 0.05), 0, 0.95);
        diet[j] = r.f32() < 0.002 ? 1 - diet[i] : diet[i];
        this.age[j] = 0;
        this.stats.births++;
      }
    }
    this.tick++;
  }

  _remove(i) {
    const last = --this.count;
    if (i !== last) {
      this.x[i] = this.x[last]; this.y[i] = this.y[last];
      this.vx[i] = this.vx[last]; this.vy[i] = this.vy[last];
      this.energy[i] = this.energy[last]; this.radius[i] = this.radius[last];
      this.diet[i] = this.diet[last]; this.armour[i] = this.armour[last];
      this.age[i] = this.age[last];
    }
  }

  // FNV-1a over everything that decides the future. Two runs agree or they do not.
  hash() {
    let h = 0x811c9dc5;
    const mix = (arr, n) => {
      const b = new Uint8Array(arr.buffer, 0, n * arr.BYTES_PER_ELEMENT);
      for (let i = 0; i < b.length; i++) { h ^= b[i]; h = Math.imul(h, 0x01000193) >>> 0; }
    };
    const n = this.count;
    mix(this.x, n); mix(this.y, n); mix(this.vx, n); mix(this.vy, n);
    mix(this.energy, n); mix(this.radius, n); mix(this.diet, n); mix(this.armour, n);
    mix(this.food.a, this.food.a.length); mix(this.scent.a, this.scent.a.length);
    mix(this.rng.s, 4);
    h ^= n; h = Math.imul(h, 0x01000193) >>> 0;
    h ^= this.tick; h = Math.imul(h, 0x01000193) >>> 0;
    return h >>> 0;
  }
}
