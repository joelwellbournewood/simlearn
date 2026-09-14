// SimWorld deterministic PRNG: sfc32, seeded by splitmix32.
// Every random number in the world comes from here. No Math.random anywhere in src/core.
// State is four uint32s so it saves and restores exactly, which is what makes a save file
// resume into the same future rather than a similar one.
export class Rng {
  constructor(seed) {
    this.s = new Uint32Array(4);
    let z = seed >>> 0;
    for (let i = 0; i < 4; i++) {
      z = (z + 0x9e3779b9) >>> 0;
      let t = z;
      t = Math.imul(t ^ (t >>> 16), 0x21f0aaad) >>> 0;
      t = Math.imul(t ^ (t >>> 15), 0x735a2d97) >>> 0;
      this.s[i] = (t ^ (t >>> 15)) >>> 0;
    }
    for (let i = 0; i < 12; i++) this.u32();
  }
  u32() {
    const s = this.s;
    const t = (s[0] + s[1] + s[3]) >>> 0;
    s[3] = (s[3] + 1) >>> 0;
    s[0] = (s[1] ^ (s[1] >>> 9)) >>> 0;
    s[1] = (s[2] + (s[2] << 3)) >>> 0;
    s[2] = (((s[2] << 21) | (s[2] >>> 11)) + t) >>> 0;
    return t;
  }
  f32() { return this.u32() / 4294967296; }          // [0,1)
  range(a, b) { return a + (b - a) * this.f32(); }
  int(n) { return this.u32() % n; }
  save() { return Uint32Array.from(this.s); }
  load(a) { this.s.set(a); }
}
