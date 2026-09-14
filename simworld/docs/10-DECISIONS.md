# 10. Decision log

Append only. Each entry: what was decided, when, why, and what would reverse it.

## ADR-001. SimWorld lives in `simworld/` on the main branch
2026-09-14. Keeps history, review, and the site in one repository, and means no context
switching to work on it. It is not linked from the site and `robots.txt` disallows it, so
nothing is published by accident. **Reversed if** the folder grows large binary assets, at
which point it moves to its own repository with the site pulling a built bundle.

## ADR-002. JavaScript first, Rust and WebAssembly behind a measured gate
2026-09-14. Typed array JavaScript is within a small factor of native for flat numeric loops,
and the iteration speed matters more than the constant factor at this stage. The core is
written in a style that ports mechanically. **Reversed by** a profile showing the tick over
budget with the algorithm already chosen and more than 50,000 organisms wanted.

## ADR-003. Fixed timestep, seeded generator, no wall clock in the world
2026-09-14. Determinism buys replay, save integrity, regression tests, a timeline scrubber,
and reproducible bug reports. It costs discipline: no `Math.random`, no `Date.now`, no
library that uses either, and our own tables for transcendental functions. **Reversed by**
nothing short of abandoning saves and replay.

## ADR-004. Custom physics rather than a physics library
2026-09-14. What is needed is soft circular bodies, drag, and diffusion fields, which is a few
hundred lines. A general engine costs an order of magnitude more per body and does not
guarantee determinism. **Reversed if** jointed rigid bodies become central, which the creature
design deliberately avoids.

## ADR-005. Canvas 2D at M0 and M1, WebGL2 from M2, WebGPU only behind a gate
2026-09-14. Debuggability first, then throughput. WebGPU support is still uneven and it would
break the phone path and cross device determinism. **Reversed by** the 100,000 organism gate.

## ADR-006. Every asset carries a provenance line
2026-09-14. The site already licenses its own work and we intend to keep the option of a paid
desktop build, so an asset of unknown origin is a liability. No asset enters `assets/` without
a row in `simworld/assets/README.md` giving source, licence, and author. Nothing is copied
from Mote, Species, Evolve, or any other referenced work. **Reversed by** nothing.
