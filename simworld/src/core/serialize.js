// Save format v1. Header, options, rng state, then the live slice of every agent array and
// both fields, all little endian. A save is a memcpy because the state was already laid out
// as flat typed arrays, which is the whole reason for structure of arrays.
import { World } from './world.js';
const MAGIC = 0x53574c44; // "SWLD"
const VERSION = 2;   // v2 added the armament, limb and lineage colour genes
const AGENT_ARRAYS = ['x', 'y', 'vx', 'vy', 'energy', 'radius', 'diet', 'armour', 'arm', 'limbs', 'hue'];

export function saveWorld(w) {
  const n = w.count;
  const optJson = new TextEncoder().encode(JSON.stringify(w.opt));
  const pad = (4 - (optJson.length % 4)) % 4;
  const bytes = 24 + optJson.length + pad + 16 + n * 4 * AGENT_ARRAYS.length + n * 4
    + w.food.a.length * 4 + w.scent.a.length * 4;
  const buf = new ArrayBuffer(bytes);
  const dv = new DataView(buf);
  let o = 0;
  dv.setUint32(o, MAGIC, true); o += 4;
  dv.setUint32(o, VERSION, true); o += 4;
  dv.setUint32(o, w.seed, true); o += 4;
  dv.setUint32(o, w.tick, true); o += 4;
  dv.setUint32(o, n, true); o += 4;
  dv.setUint32(o, optJson.length, true); o += 4;
  new Uint8Array(buf, o, optJson.length).set(optJson); o += optJson.length + pad;
  new Uint32Array(buf, o, 4).set(w.rng.s); o += 16;
  for (const k of AGENT_ARRAYS) { new Float32Array(buf, o, n).set(w[k].subarray(0, n)); o += n * 4; }
  new Uint32Array(buf, o, n).set(w.age.subarray(0, n)); o += n * 4;
  new Float32Array(buf, o, w.food.a.length).set(w.food.a); o += w.food.a.length * 4;
  new Float32Array(buf, o, w.scent.a.length).set(w.scent.a);
  return buf;
}

export function loadWorld(buf, override = {}) {
  const dv = new DataView(buf);
  let o = 0;
  if (dv.getUint32(o, true) !== MAGIC) throw new Error('not a SimWorld save');
  o += 4;
  const version = dv.getUint32(o, true); o += 4;
  if (version !== VERSION) throw new Error('save version ' + version + ', this build reads ' + VERSION);
  const seed = dv.getUint32(o, true); o += 4;
  const tick = dv.getUint32(o, true); o += 4;
  const n = dv.getUint32(o, true); o += 4;
  const optLen = dv.getUint32(o, true); o += 4;
  const opt = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, o, optLen)));
  o += optLen + ((4 - (optLen % 4)) % 4);
  const w = new World(seed, Object.assign({}, opt, override));
  w.tick = tick;
  w.count = n;
  w.rng.load(new Uint32Array(buf, o, 4)); o += 16;
  for (const k of AGENT_ARRAYS) { w[k].set(new Float32Array(buf, o, n)); o += n * 4; }
  w.age.set(new Uint32Array(buf, o, n)); o += n * 4;
  w.food.a.set(new Float32Array(buf, o, w.food.a.length)); o += w.food.a.length * 4;
  w.scent.a.set(new Float32Array(buf, o, w.scent.a.length));
  return w;
}
