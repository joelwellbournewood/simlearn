# 11. Performance fundamentals: can this run on a CPU?

Status: measured, 2026-09-14. Supersedes the hand waving in 02-ARCHITECTURE.md.
Everything below comes from code in this repository. Reproduce with
`node simworld/tools/bench.mjs`. Raw output is in `artifacts/run-2026-09-14c.md`.

## The short answer

Yes for the world we actually want, no for Mote's world.

A single CPU core running plain JavaScript costs about **270 nanoseconds per organism per
tick** with contact physics, sensing, two diffusing fields, energy, birth, and death all
switched on. At a 30 Hz tick that is **about 100,000 organisms per core before the frame
budget is gone**, on a 2022 desktop part. Leaving room for rendering and for the game on
top, the honest desktop target is **50,000**, and the honest mid range phone target is
**10,000 to 15,000**. Mote runs hundreds of thousands on a GPU. We are not going to match
that on a CPU and we should stop pretending the gap is closeable by tuning.

The part worth arguing about is whether we want to match it. See "The readability ceiling"
below: at the sizes a creature must be drawn to carry a visual language, a 1080p screen
holds a few thousand creatures before the picture turns to noise. The CPU limit is roughly
an order of magnitude above the limit your eyes impose on a single screen.

## The measurements

Machine: Intel Core i5-12600K, Node 20 (V8), one thread, no SIMD, no WASM. Budget is one
tick at 30 Hz, so 33.3 ms. Every figure is a mean over 120 ticks after warm up.

### Cost against population, world size fixed at 2048 x 2048

| N | agents per hash cell | ms per tick | share of budget |
|---|---|---|---|
| 2,000 | 0.28 | 0.82 | 2.5% |
| 10,000 | 1.38 | 2.48 | 7.4% |
| 20,000 | 2.77 | 5.43 | 16.3% |
| 50,000 | 6.92 | 20.96 | 62.9% |
| 100,000 | 13.84 | 72.73 | 218% |
| 200,000 | 27.68 | 269.4 | 808% |

That curve is quadratic, and the reason is in the second column rather than the first.
Fixing the world size while raising N raises crowding, and the pair loop costs
N times neighbours, so it costs N squared over area. **Population is not the cost driver.
Density is.**

### Cost against population, density held at 2.77 per cell

| N | world edge | ms per tick | ns per organism |
|---|---|---|---|
| 2,000 | 648 | 0.46 | 231 |
| 10,000 | 1,448 | 2.84 | 284 |
| 20,000 | 2,048 | 5.11 | 255 |
| 50,000 | 3,238 | 14.41 | 288 |
| 100,000 | 4,579 | 27.18 | 272 |
| 200,000 | 6,476 | 80.02 | 400 |
| 400,000 | 9,159 | 144.1 | 360 |

Flat to 100,000, then it degrades. The knee is a cache effect: nine floats per organism is
36 bytes, so 100,000 organisms is 3.6 MB of hot state, which no longer sits in L2 and only
just sits in a 20 MB L3 alongside the fields. This is the first real wall, and it is a
memory wall rather than an arithmetic one.

### Where the 5.4 ms at N = 20,000 goes

| stage | ms | share |
|---|---|---|
| pair loop plus integration | 4.49 | 83% |
| both fields, 256 x 256, diffuse and decay | 0.77 | 14% |
| spatial hash rebuild, counting sort | 0.15 | 3% |

The spatial hash is free. The fields are nearly free and scale with grid area rather than
population: a single 256 x 256 field costs 0.28 ms, 512 x 512 costs 1.03 ms, and
1024 x 1024 costs 4.15 ms or 12.5% of the budget. So a high resolution world skin is
affordable and a high resolution *simulation* field is the expensive kind.

### Preparing a frame for the GPU

Packing every organism into an interleaved instance buffer of eight floats costs 0.012 ms
at 5,000, 0.118 ms at 20,000, and 0.599 ms at 100,000, which is 1.8% of the budget for the
largest case. **Feeding a GPU renderer is not a bottleneck at any population the simulation
can sustain.** Memory is also not a concern: nine agent arrays at 200,000 is 6.9 MiB and
two 256 x 256 fields are 1.0 MiB.

## Assumptions, marked as such

- **Phones are 3 to 4 times slower per core than this desktop.** Assumption, not measured
  here. It comes from the usual single core gap between a 12600K and a mid range Android
  part. The prototype prints its own measured ms per tick, so the way to replace this
  assumption with a fact is to open the prototype on a phone and read the number.
- **A browser main thread has less than 33.3 ms.** The simulation runs in a worker, so it
  gets a full core, but on a phone the browser will throttle it under heat.
- Node and Chrome are both V8, so these numbers transfer to Chrome desktop within a few
  percent. Safari's JavaScriptCore is a different engine and has not been measured.

## The readability ceiling

The population the CPU can carry is not the population the screen can show. A creature
needs roughly 12 to 30 pixels across before hue, shape, limb count, and damage state are
legible at all, and the visual language in 12-VISUAL-LANGUAGE.md depends on exactly that.
At 20 pixels, and allowing that a scene should be mostly empty space to read as a place
rather than a soup, a 1920 x 1080 viewport carries **two to five thousand creatures**.

So the design has a natural shape. The world is larger than the screen. The viewport shows
a few thousand organisms at a readable size, the rest of the world is off camera and still
ticking, and zooming out crosses over to a field view where individuals stop being drawn
and populations are rendered as density and colour. That crossover is a rendering decision,
not a simulation one, and it means the simulation can carry 50,000 while the screen never
has to draw more than a few thousand sprites.

## Where the headroom is, cheapest first

Each of these preserves determinism. Numbers are estimates unless marked measured.

1. **Temporal level of detail.** Organisms far from the camera and outside any contested
   region tick at 10 Hz on a deterministic schedule keyed on index, not on wall clock.
   Estimated 2 to 2.5x. Cheap to build, and it is the one that buys the phone target.
2. **Spatial striping across workers.** Split the world into horizontal bands with a one
   cell halo, one worker each, exchange halos every tick, merge in a fixed band order so
   the result does not depend on which worker finished first. Estimated 3 to 6x on a
   desktop with 4 to 8 cores, 2 to 3x on a phone. This is the single biggest CPU win and
   the reason the core is written with no shared mutable state outside the arrays.
3. **WASM with SIMD.** Rewriting the pair loop in Rust and compiling to wasm32 with
   SIMD128 gives 4 lanes of float32. Estimated 2 to 3x on the pair loop, so about 1.8x
   overall given the 83% share measured above. Deterministic, since WASM floats are IEEE
   754 with no fast math. Gated behind the trigger already recorded in ADR-002.
4. **Smaller organisms.** Dropping from nine float arrays to six, and packing diet, armour,
   and flags into one Uint32, shrinks hot state by a third and moves the cache knee up.

Stacked and taken conservatively, that is roughly 8x on desktop and 3x on a phone, which
puts 200,000 on a desktop and 40,000 on a phone within reach without any GPU compute.

## Why not GPU compute, given it is now available everywhere

WebGPU is genuinely shipped. Chrome and Edge since 113, Firefox 141 on Windows and 145 on
Apple silicon, and Safari 26 across macOS Tahoe, iOS, iPadOS, and visionOS, with Firefox on
Linux and Android still in progress.
Sources: https://web.dev/blog/webgpu-supported-major-browsers ,
https://webkit.org/blog/16993/news-from-wwdc25-web-technology-coming-this-fall-in-safari-26-beta/ ,
https://www.webgpu.com/news/webgpu-hits-critical-mass-all-major-browsers/

We are still not putting the simulation on it, for one reason that is not about speed.
**GPU compute and bit exact determinism do not go together.** Order of execution across
workgroups is not defined, atomics land in whatever order they land, and a neighbour sum
accumulated in a different order gives a different float in the low bits. One different bit
in one organism's velocity is a different world a thousand ticks later. Determinism is what
pays for save files that resume into the same future, a timeline you can scrub, regression
tests, and bug reports that reproduce. That was ADR-003 and the measurements do not
challenge it, because they show the CPU reaches the population the screen can use.

There is a way to have both, recorded here so it is not reinvented later: run the
authoritative simulation on the CPU at 30 Hz, and let the GPU own only effects that never
feed back into the world, which is exactly the rendering split below.

## The decision

**ADR-007: the simulation stays on the CPU in a worker. Rendering moves to the GPU now,
not later.**

- Simulation: one worker, fixed 1/30 s tick, single thread until the spatial striping in
  step 2 above is needed, JavaScript until the ADR-002 trigger fires.
- Rendering: WebGL2 with instanced quads as the baseline, because it is the thing that
  works everywhere today, with a WebGPU path behind `navigator.gpu` feature detection once
  there is something it buys us. Canvas 2D is kept only as the last resort fallback and is
  capped at 5,000 sprites, which is roughly where per sprite draw calls stop fitting in a
  frame.
- The interface between them is the instance buffer measured above: the simulation writes
  eight floats per organism into a `Float32Array`, posts it, and never touches a drawing
  API. That keeps the world testable headless, which is how every number on this page was
  produced.
- Targets, written down so a regression is visible: **50,000 organisms at 30 Hz on a
  desktop, 12,000 on a mid range phone, 3,000 sprites on screen at once.**
