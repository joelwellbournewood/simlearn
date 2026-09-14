# SimWorld

A gamified, persistent, evolving ecosystem. It is a branch of SimLearn in ambition rather
than in kind: the site's simulations are three minute demonstrations, and this one is meant
to be left running, returned to, and argued with.

**Status: planning. No engine code yet.** Everything here is written before the fact on
purpose, because the expensive mistakes in a project like this are architectural and they
are all made in week one.

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
  src/               engine and game code (empty until milestone M0)
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
