# 08. Gameplay

Without this layer the project is a screensaver. It is built at M3 and not deferred.

## The player's position
You are not a creature and you are not a builder. You are the pressure. Everything you can do
either changes the environment or moves matter around in it, and the creatures respond by
living, dying, and evolving. You never command a creature.

## The hands

| Tool | What it does | Cost |
|---|---|---|
| **Terrain brush** | raise, lower, flood, drain | influence |
| **Seed** | scatter plant matter, or drop a carcass | influence |
| **Catch and release** | pick a creature up, move it, drop it elsewhere | free, but stressful for it |
| **Nursery** | a walled enclosure where you can breed a lineage in isolation, taken from Species: ALRE | influence |
| **Introduce** | place a creature from another save or from a template | influence |
| **Barrier** | a wall creatures cannot cross, for making habitat fragments | influence |
| **Blight** | a local toxin or disease | influence |

**Influence** is a slowly refilling budget, not money. It exists so that the answer to every
problem is not "spend more", and so that a hard scenario is about timing rather than clicking.

## Scenarios
A scenario is a seed, a balance table, a starting population, and a goal. Hand written, and
small enough that one is an evening of work.

- **First light.** No goal. The sandbox. This is the default and it must be complete on its own.
- **The lean season.** Keep any population alive through three winters.
- **Arms race.** Introduce a predator and keep both sides alive for 1,000 days.
- **Island.** Split one population into two habitats and get two clusters that no longer
  interbreed, which is speciation you caused.
- **The gardener.** Reach three stable trophic levels with no player intervention for 500 days.
- **Collapse.** Start from an overgrazed world and restore it.

Each has a clear pass condition, a timeline at the end showing what happened and when, and
nothing as dull as a star rating.

## Progression
Scenarios unlock tools. Tools make the sandbox richer. That is the entire progression system,
because a persistent world already provides the reason to come back and a levelling curve on
top of it would be noise.

## Achievements, if any
Only ones that name something the world actually did: "a lineage survived 10,000 days",
"a herbivore evolved armour before a predator evolved a bite", "you caused an extinction".
They are records of events, so they are written by the same system as the event ticker.

## Session shapes to design for
- **Three minutes:** open, watch, poke something, close. Must be satisfying on its own.
- **Thirty minutes:** run a scenario, cause one selection event, look at the trait chart.
- **Weeks:** one world, autosaved, visited now and then, with a lineage the player knows by
  name. This is the one that justifies all the persistence work in `06-PERSISTENCE.md`.

## Where this ends up
If it stands up, this is the shape that could carry a desktop build (Electron, itch.io first,
then the Steam question), which is the open task #194 on the project board. A browser build
stays free at simlearn.ai either way, because it feeds the site.
