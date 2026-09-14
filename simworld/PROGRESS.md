# SimWorld progress log

Newest first. One entry per working session that changed something. Keep it factual.

## 2026-09-14, run 97: M0 is done, and the CPU question is answered with numbers
Engine code exists. `src/core/` has the seeded generator, deterministic trig and exp, the
counting sort spatial hash, the diffusing field, the world with contact physics, a day cycle,
energy, birth and death, and a binary save format. `tools/replay-check.mjs` passes: two runs
from one seed match at ticks 1, 100, 1,000, 5,000, and 10,000, and a world saved at tick
5,000, discarded, reloaded, and run on lands on the same hash as one that never stopped.
`tools/bench.mjs` measures the cost of everything; the answer and the decision it forced are
in `docs/11-PERFORMANCE.md` and ADR-007. `prototype/` runs the core in a module worker and
draws it with instanced WebGL2, which is the first thing in this folder you can look at.
Two new design documents: 12 the visual language, 13 the day cycle and competition.
Not done: temporal level of detail, worker striping, the morphotype atlas, genomes beyond
five traits, and the balance pass the day cycle badly needs.

## 2026-09-14, run 96
Folder created. Wrote the eleven planning documents in `docs/`, the asset conventions, and
the decision log with six decisions recorded (ADR-001 to ADR-006). No engine code. The next
piece of work is M0 in `docs/09-ROADMAP.md`: a deterministic fixed step loop with twenty
thousand particles in a spatial hash, a seeded generator, and a replay check that proves two
runs from the same seed are byte identical.


## 2026-09-14, run 99. M0 balanced, and the genes reach the screen

- The night no longer empties the world. Trough over peak inside a day is 0.38 to 0.46 on
  three seeds over fourteen simulated days, against 0.06 before, and both diets are still
  present at every dawn. What did it: logistic plant growth with a seed rain, a cap on how
  fast a mouth can eat, hunger scaling on eating, chasing and biting, hunters going half
  blind at night, prey that run, and a cub that costs three times a calf.
- Determinism still holds with the new physics and the v2 save: the gate passes at ticks
  1, 100, 1000, 5000 and 10000 plus a save and reload round trip. The gate was moved to a
  512 world with a 600 tick day so it finishes in about two minutes.
- The renderer reads the genes now: lineage hue, energy, age, armour, armament as spines,
  and limb power as lobes, eleven floats per animal.
- The camera pans, zooms to 64x, and holds a body at two pixels minimum so a crowd never
  vanishes. The ground layer follows the camera.
- Cost re-measured: 350 to 415 ns per organism per tick, and a balanced world is three and
  a half times denser than the first test world, so the desktop ceiling at equilibrium is
  about 25,000 rather than 50,000. See docs/11.
