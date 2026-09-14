// A scalar field on a torus: nutrient, scent, heat, light. Diffusion is a separable
// three tap blur, which is the cheapest thing that still spreads isotropically enough
// to steer a gradient follower. Everything is Float32Array so a save is a memcpy.
export class Field {
  constructor(w, h) {
    this.w = w; this.h = h;
    this.a = new Float32Array(w * h);
    this.tmp = new Float32Array(w * h);
  }
  // k in [0, 0.25] is the fraction handed to each neighbour per axis; d is per tick decay.
  diffuseDecay(k, d) {
    const { w, h, a, tmp } = this;
    const c = 1 - 2 * k;
    for (let y = 0; y < h; y++) {
      const r = y * w;
      for (let x = 0; x < w; x++) {
        const l = a[r + (x === 0 ? w - 1 : x - 1)];
        const rt = a[r + (x === w - 1 ? 0 : x + 1)];
        tmp[r + x] = c * a[r + x] + k * (l + rt);
      }
    }
    const s = d * c, sk = d * k;
    for (let y = 0; y < h; y++) {
      const r = y * w, up = (y === 0 ? h - 1 : y - 1) * w, dn = (y === h - 1 ? 0 : y + 1) * w;
      for (let x = 0; x < w; x++) a[r + x] = s * tmp[r + x] + sk * (tmp[up + x] + tmp[dn + x]);
    }
  }
  deposit(u, v, amt) {           // u,v in [0,1)
    const x = (u * this.w) | 0, y = (v * this.h) | 0;
    this.a[y * this.w + x] += amt;
  }
  sample(u, v) {                 // nearest; bilinear is sampleLin
    const x = (u * this.w) | 0, y = (v * this.h) | 0;
    return this.a[y * this.w + x];
  }
  take(u, v, frac) {
    const x = (u * this.w) | 0, y = (v * this.h) | 0, i = y * this.w + x;
    const got = this.a[i] * frac;
    this.a[i] -= got;
    return got;
  }
  // A mouth is only so wide: take a fraction of what is in the cell, but never more than
  // cap in one tick, so a cell cannot be stripped bare by the first animal to reach it.
  takeUpTo(u, v, frac, cap) {
    const x = (u * this.w) | 0, y = (v * this.h) | 0, i = y * this.w + x;
    let got = this.a[i] * frac;
    if (got > cap) got = cap;
    this.a[i] -= got;
    return got;
  }
  // Gradient by central difference on the torus, in field cells.
  gradX(u, v) {
    const x = (u * this.w) | 0, y = (v * this.h) | 0, r = y * this.w;
    return this.a[r + (x === this.w - 1 ? 0 : x + 1)] - this.a[r + (x === 0 ? this.w - 1 : x - 1)];
  }
  gradY(u, v) {
    const x = (u * this.w) | 0, y = (v * this.h) | 0;
    const up = (y === 0 ? this.h - 1 : y - 1) * this.w, dn = (y === this.h - 1 ? 0 : y + 1) * this.w;
    return this.a[dn + x] - this.a[up + x];
  }
}
