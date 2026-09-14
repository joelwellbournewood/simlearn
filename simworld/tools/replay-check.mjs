// Determinism gate. Run: node tools/replay-check.mjs [ticks]
// Two worlds from one seed must hash identically at every checkpoint, and a world that is
// saved, thrown away, reloaded and run on must land on the same hash as one that never
// stopped. If either fails, the save format or the tick order changed and every save file
// in the wild has just become a different universe.
import { World } from '../src/core/world.js';
import { saveWorld, loadWorld } from '../src/core/serialize.js';

const TICKS = Number(process.argv[2] || 10000);
const SEED = 0xC0FFEE;
const CHECKS = [1, 100, 1000, 5000, TICKS];

function run(seed, ticks, marks) {
  const w = new World(seed, { capacity: 120000 });
  w.spawn(8000);
  const out = new Map();
  for (let t = 1; t <= ticks; t++) { w.step(); if (marks.includes(t)) out.set(t, w.hash()); }
  return { w, out };
}

const a = run(SEED, TICKS, CHECKS);
const b = run(SEED, TICKS, CHECKS);
let fail = 0;
for (const t of CHECKS) {
  const ha = a.out.get(t), hb = b.out.get(t);
  const ok = ha === hb;
  if (!ok) fail++;
  console.log(`tick ${String(t).padStart(6)}  A ${ha.toString(16).padStart(8, '0')}  B ${hb.toString(16).padStart(8, '0')}  ${ok ? 'match' : 'DIFFER'}`);
}

// Save and load round trip: split the same run in half through a save file.
const half = Math.floor(TICKS / 2);
const c = new World(SEED, { capacity: 120000 });
c.spawn(8000);
for (let t = 0; t < half; t++) c.step();
const blob = saveWorld(c);
const d = loadWorld(blob, { capacity: 120000 });
for (let t = half; t < TICKS; t++) d.step();
const viaSave = d.hash();
const straight = a.out.get(TICKS);
const ok2 = viaSave === straight;
if (!ok2) fail++;
console.log(`save/load  saved at ${half}, resumed: ${viaSave.toString(16).padStart(8, '0')} vs ${straight.toString(16).padStart(8, '0')}  ${ok2 ? 'match' : 'DIFFER'}`);
console.log(`population at ${TICKS}: ${a.w.count}   save size: ${(blob.byteLength / 1024).toFixed(1)} KiB`);
console.log(fail === 0 ? 'PASS' : `FAIL (${fail})`);
process.exit(fail === 0 ? 0 : 1);
