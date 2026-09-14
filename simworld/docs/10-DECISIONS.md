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
**SUPERSEDED by ADR-007 on 2026-09-14, on measured evidence.**
2026-09-14. Debuggability first, then throughput. WebGPU support is still uneven and it would
break the phone path and cross device determinism. **Reversed by** the 100,000 organism gate.

## ADR-006. Every asset carries a provenance line
2026-09-14. The site already licenses its own work and we intend to keep the option of a paid
desktop build, so an asset of unknown origin is a liability. No asset enters `assets/` without
a row in `simworld/assets/README.md` giving source, licence, and author. Nothing is copied
from Mote, Species, Evolve, or any other referenced work. **Reversed by** nothing.

## ADR-007. The simulation stays on the CPU. Rendering goes to the GPU immediately.
2026-09-14, on measurements in `docs/11-PERFORMANCE.md` rather than on taste. One core costs
about 270 ns per organism per tick, so roughly 100,000 organisms fill a 30 Hz budget on a
2022 desktop part and the working target is 50,000 desktop and 12,000 phone. That is an order
of magnitude above what a screen can legibly show, so the CPU is not the binding constraint;
the eye is. Rendering moves to WebGL2 instanced quads now, not at M2, because the CPU side of
feeding it costs 0.6 ms at 100,000 organisms and because Canvas 2D falls over at about 5,000
sprites. GPU compute is still refused: workgroup order and atomics make bit exact replay
impossible, and replay is what pays for saves, the timeline, and regression tests.
**Reversed if** a design change makes 200,000 visible organisms necessary, in which case
determinism has to be renegotiated first. Headroom ladder, in order: temporal level of
detail, spatial striping across workers, WASM with SIMD.

## ADR-008. The visual channel table is a contract
2026-09-14. Hue means diet class and lineage, saturation means energy, brightness means age,
radius means mass, outline weight means armour, and so on through `docs/12-VISUAL-LANGUAGE.md`.
A channel means one thing for the life of the project, because the grammar is learned in the
first two minutes and never consciously revisited. Nothing is drawn that no number decides.
**Reversed by** nothing; a new channel is an addition here, and repurposing one is a break.

## ADR-009. Colour variety comes from lineage drift, not from an artist
2026-09-14. Hue bands are reserved per diet class and each birth mutates hue slightly inside
its band, so a clade is a colour family and speciation is visible as a band splitting. The
other two sources are the day cycle grading the whole palette from one light value, and biome
ramps applied to the nutrient field. This is how the project gets a lot of colour while
keeping the one hue, one meaning rule. **Reversed if** playtesting shows clades are not
distinguishable, in which case pattern is added as a second lineage channel.

## ADR-010. Competition has no verb
2026-09-14. There is no attack action and no combat step. There is a contact solver, and
damage is closing speed times armament times what gets past armour, so approach angle, mass,
and speed are the entire tactical vocabulary. Crowding, blocking, ambush, and scavenging all
fall out of contact, occupancy, and the scent field rather than being implemented. **Reversed
by** nothing short of the ecology failing to produce visible conflict, which the first run
already contradicts.

## ADR-011. Plants grow from plants
2026-09-14. Plant growth is logistic on the standing crop of the cell with a small seed rain
on bare ground, and dispersal is the diffusion step that was already there. Constant seeding
gave a uniform lawn that the herd stripped flat every day, with no refuge, no front, and no
reason to walk anywhere. **Reversed if** a biome needs ground that regrows from nothing, in
which case seed rain becomes a per biome number rather than a global one.

## ADR-012. Hunters are kept rare by the price of a cub
2026-09-14. A hunter needs `hunterBirth` times the birth energy of a plant eater, currently
three. Every alternative brake tried first (lower energy yield per bite, higher hunter
metabolism, prey flight) shifted the equilibrium without stopping the boom, because a hunter
in a full herd can pay any running cost. Making the offspring expensive caps the numerical
response directly, which is also what large predators do. **Reversed if** a scavenger or an
omnivore diet class needs its own price, which would make this a per diet number.

## ADR-013. Distance thins the detail and never the census
2026-09-14. A body is drawn at no less than two pixels across whatever the zoom, and spines
and other fine parts fade in above four pixels. Letting bodies fall under a pixel makes a
crowd disappear at exactly the zoom where its shape is the interesting thing. **Reversed by**
the crowd and field views from `docs/12-VISUAL-LANGUAGE.md`, which replace many small sprites
with one texture and will take over below that size.
