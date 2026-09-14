# 09. Roadmap

Each milestone is a thing that runs and can be judged. No milestone is "refactor". Effort is
in working sessions, where a session is a few hours of focused work, and the estimates are
assumptions rather than measurements.

## M0. The skeleton that proves determinism (2 sessions)
Fixed step loop in a worker, seeded generator, typed array pools, spatial hash, 20,000 inert
particles with drag and collision, canvas 2D dots, pan and zoom.
**Accept:** 20,000 particles at 60 fps on a laptop; `tools/replay-check.mjs` shows two runs
from the same seed hash identically at tick 10,000; mid point save resumes and matches.

## M1. A living world, ugly (3 sessions)
Nutrient and scent fields, plants as a field, one organism type with the full energy budget,
eat, breed, mutate, die, corpses returning matter. Population chart. Conservation readouts.
**Accept:** ten minutes unattended without extinction or explosion; total mass constant to
0.1 percent; the trait histogram visibly moves in five minutes.

## M2. Legible (3 sessions)
WebGL2 renderer, segmented bodies, the fixed colour mapping, terrain with water, the panel in
house style, the inspector, the event ticker.
**Accept:** three strangers pass the ten second test in `07-READABILITY.md`; 10,000 organisms
at 60 fps; phone portrait and landscape both usable.

## M3. A game (4 sessions)
The hands, influence, two scenarios (First light and The lean season), three trophic levels,
sexual reproduction, arms race genes, save slots and file export.
**Accept:** somebody who is not us plays for twenty minutes without being told what to do,
and can say afterwards what they were trying to do.

## M4. Memory (2 sessions)
Autosave, lineage tree, timeline scrubber from keyframes, replay export, time lapse.
**Accept:** close the tab mid crisis, reopen tomorrow, and the crisis is still there; a replay
file reproduces a saved world exactly.

## M5. Depth (open ended)
More scenarios, lifetime learning, disease, migration, better brains, sound.
**Gate before starting:** dwell time on M3 in the browser build justifies it.

## M6. Desktop (2 sessions plus a decision)
Electron shell, itch.io release, then the Steam question with real download numbers in hand.
See task #194 and `artifacts/expansion-options-2026-09-11.md`.

## Decision gates, written down so they are not drifted past
| Gate | Condition | Then |
|---|---|---|
| Rust and wasm | core over tick budget with the algorithm settled, and more than 50,000 organisms wanted | port physics and brains only |
| WebGPU | more than 100,000 organisms wanted | optional high scale mode, separate save story |
| Sexual reproduction | scent field working and mate finding cheap | M3, not before |
| Ship anything to simlearn.ai | M2 passed, and it looks like the rest of the site | a hidden `/dev/simworld/` first, as always |
| Spend money | never without approval in the inbox | assets and accounts included |

## What could stop this
- **Balance is a tarpit.** Every ecosystem project dies tuning numbers. Mitigation: all
  constants in `assets/data/balance.json`, a sweep tool in `tools/`, and scenarios that fix a
  seed so a change can be judged against a known world rather than against a vibe.
- **Scope.** The doc set is deliberately larger than M0 to M3 needs. Build the milestones, not
  the documents.
