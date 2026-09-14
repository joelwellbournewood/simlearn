# 02. Architecture

## The shape of the program

```
                 main thread                    |         worker thread
  input, camera, panel, charts, save UI         |   the world: fixed step simulation
        |  commands (structured clone)          |        |
        +-------------------------------------->|        |
        |<--------------------------------------+        v
        |  snapshot: typed arrays, transferred    double buffered state
        v
   renderer (canvas 2D at M0, WebGL2 from M2)
```

Three rules follow from that diagram and they are the whole architecture.

1. **The world never touches the DOM.** It receives commands and emits snapshots. That is
   what makes a worker possible, and a worker is what keeps the interface alive at 100x speed.
2. **State lives in typed arrays, one array per field** (structure of arrays), not in objects
   per creature. An `x` array, a `y` array, an `energy` array, and so on, with a free list for
   dead slots. This is the single decision that decides whether ten thousand organisms is
   easy or impossible.
3. **The simulation is a pure function of (state, seed, commands).** No `Math.random`, no
   `Date.now`, no reading the wall clock. See determinism below.

## Fixed timestep

The world advances in ticks of exactly 1/30 second of world time. Rendering interpolates
between the last two ticks. Speed control changes how many ticks are run per rendered frame
(0, 1, 2, 4, ... 100), never the size of a tick. A variable timestep would make the same seed
produce different worlds on different machines, which would destroy replay, save integrity,
and any hope of reproducing a bug report.

## Determinism

- One seeded generator, xoshiro128\*\* or PCG32, its state saved with the world.
- Every system that needs randomness draws from a named substream, so adding a system does
  not shift every other system's numbers.
- Floating point is deterministic within a single engine for the same sequence of operations.
  Across engines it is not guaranteed once `Math.sin`, `Math.pow`, and friends are involved,
  so the engine uses its own polynomial approximations for anything transcendental, tabulated
  in `assets/data/math-tables.json`.
- Iteration order is by slot index, never by hash map order.
- **Acceptance test, from M0 onward:** run 10,000 ticks twice from the same seed, hash the
  state, and require the hashes to be equal. A third run from a mid point save must match the
  tail of the first. `tools/replay-check.mjs`.

## Tick budget

At 30 ticks per second and 10,000 organisms, one tick has 33 ms and we want to spend under
8 ms so that 4x speed is still comfortable. Budget per tick, to be measured and updated:

| System | Budget | Notes |
|---|---|---|
| Spatial hash rebuild | 1.0 ms | uniform grid, cell about twice the largest body radius |
| Physics integrate and collide | 2.5 ms | see `03-PHYSICS.md` |
| Senses and brains | 2.0 ms | fixed size network, no allocation |
| Metabolism, eating, breeding, death | 1.0 ms | branch heavy, keep it flat |
| Fields: diffusion of nutrient, scent, heat | 1.0 ms | coarse grid, half resolution, every other tick |
| Bookkeeping, stats, events | 0.5 ms | |

If a budget is blown, the fix is in this order: reduce the work, change the algorithm, then
change the language. Not the other way round.

## The language question

**JavaScript first. Rust and WebAssembly when a profile says so, not before.**

- JavaScript with typed arrays gets within roughly two to three times of native for this kind
  of tight numeric loop, and it costs nothing to build, debug, and hot reload.
- The rewrite cost of a numeric core is small if it is written in the right style from the
  start: flat arrays, no closures in the hot loop, no allocation per organism per tick, and
  systems as free functions taking arrays. Write JavaScript that looks like C and the port is
  mechanical.
- **The gate for Rust and wasm:** profiling shows the core over budget with the algorithm
  already chosen, and we want more than 50,000 organisms. Then the physics and brains move to
  wasm, the rest stays. `wasm-pack`, one module, the same command and snapshot interface.
- **The gate for the GPU:** more than 100,000 organisms, which is Mote's territory. WebGL2
  transform feedback or WebGPU compute. This breaks the phone path and breaks exact
  determinism across drivers, so it would be an optional high scale mode with its own save
  compatibility story, not the default.

## Rendering

- **M0 and M1: canvas 2D.** Instanced drawing of a few thousand shapes is fine and debugging
  is trivial.
- **From M2: WebGL2**, one draw call for all bodies via instancing, one for the terrain, one
  for the fields. Points become quads with a signed distance shape in the fragment shader, so
  a creature is one quad and not a path.
- Camera: pan and zoom, and zoom decides level of detail. Far out, creatures are dots and the
  fields carry the information. Close in, bodies, limbs, and status rings appear.

## Folder layout inside `src/` (once M0 starts)

```
src/
  core/      seeded rng, math tables, typed array pools, spatial hash, event bus
  world/     the tick: physics, fields, senses, brains, metabolism, reproduction
  render/    camera, renderers, palettes
  ui/        panel, inspector, charts, save menu, all DOM
  save/      serialise, deserialise, migrate
  main.js    wiring, worker creation, the frame loop
```
