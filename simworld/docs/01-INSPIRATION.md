# 01. Inspiration, and what is worth taking

Every claim here has a source. Nothing in this folder copies code or assets from any of
them: the licences are unknown or restrictive in most cases, and the value is in the design
decisions, which are not copyrightable.

## Mote, by Peter Whidden (the starting point)

- Talk: "Mote: An Interactive Ecosystem Simulation", Recurse Center Localhost, August 2025.
  https://www.youtube.com/watch?v=Hju0H3NHxVI
- Discussion: https://news.ycombinator.com/item?id=46712547 and
  https://www.resetera.com/threads/mote-an-interactive-ecosystem-simulation-%E2%80%94-peter-whidden.1290867/
- Author's summary (X/@computerender, Aug 2025): Mote uses a custom GPU based physics engine
  to model hundreds of thousands of organisms, producing emergent phenomena, and is
  described by its author as part game, part research.

**What it establishes.** Scale is the feature. Hundreds of thousands of simple organisms on
a GPU produce phenomena that a hundred clever ones never will, because the interesting
behaviour is statistical. Commenters consistently pick out two things: that every visual
element carries meaning rather than being decoration, and that the whole system is reactive
and adjustable while it runs.

**What we take.**
1. Scale before sophistication. Ten thousand dumb creatures beat a hundred smart ones.
2. A custom physics engine rather than a general purpose one, because the physics needed is
   narrow and the performance requirement is extreme. See `03-PHYSICS.md`.
3. Every pixel carries information. Colour, size, and motion all mean something specific and
   are written down in `07-READABILITY.md`.
4. Everything adjustable mid flight. No restart to change a parameter.

**What we do differently.** Mote is a research sandbox by a graphics specialist and is not
released. We are a browser project with an existing house style and an audience that arrives
from an educational site. So: a CPU first path that runs everywhere including phones, a
gameplay layer with goals, and save files. The GPU route is a later optimisation and is
gated in `09-ROADMAP.md`, not assumed.

**Honest limit of this section.** The talk is a video and the design details in it have not
been transcribed here. Before M2 someone should watch it properly and add notes on the
organism model and the membrane and fungus behaviours that the discussion threads mention.

## The rest of the field

| Work | The one thing to steal | The one thing to avoid |
|---|---|---|
| **Species: Artificial Life, Real Evolution** (Steam, 2018, Early Access) https://store.steampowered.com/app/774541/ | The nursery: an isolated area where you tinker with the gene pool without wrecking the main world. A player wants a laboratory as well as a planet. | Presentation is a wall of numbers. Its reviews sit at mostly positive but the complaint is legibility. |
| **Evolve 4.0**, Ken Stauffer, 1996, archived at https://github.com/rubberduck203/Evolve | Creatures run a tiny instruction set, so behaviour is genuinely open ended rather than a few tuned parameters. | A full virtual machine per creature is expensive and the results are hard to read. Our brains are small and fixed in shape. |
| **The Powder Toy** https://powdertoy.co.uk/ | A palette of materials and a cursor. The entire interface is: choose a thing, draw it, watch. Nothing to learn before you can play. | No goals at all, which is why it never leaves the sandbox category. |
| **Rain World** | An ecology that does not care about the player, which is exactly why watching it is interesting. | Hostility as a design value. Ours is a toy, not an ordeal. |
| **Dwarf Fortress** | Persistence and the story a world accumulates. Losing is fun because the log tells you why. | Its interface. See `07-READABILITY.md` for the opposite approach. |
| **Factorio** | Readability at scale: throughput is visible in the motion of the belts themselves, no dashboard needed. | Nothing. This is the standard to aim at for information design. |
| **Conway, Boids, Schelling** (already on the site) | The lesson that one rule repeated is enough. Our creature rules stay small for the same reason. | Nothing to avoid, but nothing to reuse either: these are demonstrations, not worlds. |

## Our own prior work worth reusing
- `artifacts/pwhiddy-review-2026-09-11.md` section 4 already sketched a three trophic level
  ecosystem with terrain, heritable traits, seasons, and charts, and concluded that the site
  sim should come first and the deep version second. This folder is that second thing.
- `sims/predator-prey` is the closest existing module and its palette and card layout are the
  visual reference. `sims/boids` is the reference for panel design.
- The site's shared sim shell gives us panels, tooltips, dialogs, presets, and the phone
  layouts for free if we keep the same markup conventions.
