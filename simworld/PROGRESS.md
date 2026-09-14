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
