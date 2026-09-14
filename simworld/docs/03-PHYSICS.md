# 03. Physics

## Why custom

A general engine (Matter.js, Box2D via wasm, Rapier) solves rigid body dynamics with joints,
stacking, and friction to a precision nobody will look at, and costs far too much per body to
run ten thousand of them. What this world needs is narrow: soft round bodies that push each
other apart, drag that makes swimming and running feel different, and a few scalar fields
that spread. All of that is a few hundred lines and it is fast because it is nothing else.

Custom also means we own determinism, which no third party engine guarantees.

## The model

**Bodies are particles with a radius.** A creature is one particle at M0 and M1. From M2 it
is a small chain of two to five particles held by distance constraints, which is what gives a
body a shape, a head, and a direction without a skeleton system.

**Integration: velocity Verlet**, the same choice the site's gravity and pendulum modules
already use, with the substep count tied to the speed control so that fast forward does not
melt the physics. Position updates once per tick; constraints are relaxed twice.

**Collision: a uniform spatial hash.** Cell size is twice the largest body radius. Each body
tests the nine neighbouring cells. Resolution is a soft positional push apart proportional to
overlap, plus a small velocity exchange. No rotation, no friction solver, no islands.

**Drag, not vacuum.** Every body feels `F = -k * v * |v|` from the medium, and `k` comes from
the terrain cell it is in: water, air, mud. This is what makes movement cost energy and makes
body size matter, and it also keeps the system stable without explicit damping hacks.

**Locomotion is force, never teleportation.** A creature applies a force along its heading
and pays for it: see the energy budget in `04-CREATURES.md`. Nothing in the world moves by
setting a position directly, because that is where free energy creeps in.

## Fields

Three scalar fields on a coarse grid, one quarter of the world resolution, updated every
other tick with a nine point diffusion kernel:

| Field | Source | Sink | What it drives |
|---|---|---|---|
| **Nutrient** | corpses, waste, rain washing it downhill | plant uptake | where plants grow |
| **Scent** | every body, weighted by mass and diet | decay | the main long range sense |
| **Heat** | sun by latitude and time of day, water buffers it | radiation to sky | metabolic rate, seasons |

Diffusion on a grid is cheap, it is order N in cells rather than order N squared in bodies,
and it is how ten thousand creatures can sense each other without ten thousand squared tests.
Gradient following on a scent field produces hunting, herding, and avoidance with no
pathfinding at all.

## Terrain

A height field, generated with layered value noise from the world seed, plus water that fills
basins. Terrain is static at M1 and editable by the player from M3 (raise, lower, flood).
Slope affects movement cost, water is a different medium, and altitude affects temperature.
Terrain is what stops the world being a uniform soup, which was the specific weakness
identified in the existing predator and prey module.

## Conservation, and the no free energy rule

Energy enters only as sunlight and leaves only as heat. Matter enters nowhere and leaves
nowhere: it cycles through nutrient, plant, animal, corpse, and back to nutrient. Two live
readouts exist from M1 and both are treated as failing tests when they drift:

- **Total mass** in the world, constant to within rounding.
- **Energy in minus energy out**, which should track total stored energy.

If a mutation lets a creature gain more energy from eating than the food contained, the
conservation readout catches it in seconds. This is the same instinct as the energy drift
readout on the site's chaotic modules, and it is the single most useful debugging tool in a
simulation that is meant to run for hours.
