# SimWorld

A gamified, persistent, evolving ecosystem. It is a branch of SimLearn in ambition rather
than in kind: the site's simulations are three minute demonstrations, and this one is meant
to be left running, returned to, and argued with.

**Status: M0 done, 2026-09-14.** The deterministic core runs, replays, and saves, and
`prototype/index.html` draws it. The planning documents were written before the code on
purpose, because the expensive mistakes in a project like this are architectural and they are
all made in week one. `docs/11-PERFORMANCE.md` is the one to read first: it is the measured
answer to whether a CPU can carry this.

Run the gates:

```
node simworld/tools/replay-check.mjs 10000   # determinism and save/load
node simworld/tools/bench.mjs                # cost of a tick, all stages
```

## Where things are

```
simworld/
  README.md          this file
  docs/              the plan, in the order it should be read
  assets/            art, audio, palettes, data tables, reference material
    palettes/        colour ramps, shared with the site's tokens
    sprites/         creature parts, terrain tiles, particles
    audio/           ambience and event sounds
    fonts/           only if a font is not already on the site
    data/            tuning tables in JSON or CSV, edited by hand
    ref/             reference images and notes, never shipped
  src/core/          engine: prng, dmath, grid, field, world, serialize
  prototype/         the M0 demo: module worker plus instanced WebGL2
  tools/             offline scripts: asset packing, balance sweeps, replay checking
```

## Reading order

| Doc | What it settles |
|---|---|
| `docs/00-VISION.md` | What this is, who it is for, and what it refuses to be |
| `docs/01-INSPIRATION.md` | Mote and the rest of the field, and what is worth taking from each |
| `docs/02-ARCHITECTURE.md` | The shape of the program, the tick budget, and the language question |
| `docs/03-PHYSICS.md` | The physics engine, and why it is custom |
| `docs/04-CREATURES.md` | Genome, body, brain, and the energy budget that governs all three |
| `docs/05-ECOLOGY.md` | Trophic levels, nutrient cycling, pressures, and arms races |
| `docs/06-PERSISTENCE.md` | Save states, autosave, lineage records, deterministic replay |
| `docs/07-READABILITY.md` | How a stranger reads the world in ten seconds |
| `docs/08-GAMEPLAY.md` | The layer that makes it a game rather than a screensaver |
| `docs/09-ROADMAP.md` | Milestones, acceptance tests, and the decision gates |
| `docs/10-DECISIONS.md` | The decision log. Add to it, never rewrite it |
| `docs/11-PERFORMANCE.md` | Measured cost of a tick, and the CPU against GPU decision |
| `docs/12-VISUAL-LANGUAGE.md` | The channel table, where colour variety comes from, modular bodies |
| `docs/13-DAY-NIGHT-AND-COMPETITION.md` | The day cycle as the energy supply, and contact as the only conflict |
| `PROGRESS.md` | Running log of what was actually built, newest first |

## Ground rules

1. **Nothing ships to simlearn.ai from this folder** until a milestone says so. The folder
   is in the repository for history and review, it is not linked from the site, and
   `robots.txt` keeps it out of search results.
2. **Every tuning number lives in `assets/data/`,** not in the code. Balance is data.
3. **Determinism is a feature, not a nicety.** Same seed plus same inputs equals same world,
   or a bug has been introduced. See `docs/02-ARCHITECTURE.md`.
4. **No asset without a provenance line** in `assets/README.md`: where it came from, its
   licence, and who made it.
5. The prose style of the site applies to anything a player reads: no em dashes, Oxford
   comma, never step outside the world to talk about the program.
