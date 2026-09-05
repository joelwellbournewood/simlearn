# Performance

Everything on this site is a full-bleed canvas repainting 60 times a second. That
makes it unusually sensitive to a small number of CSS and drawing mistakes. This
file records the ones already diagnosed so they are not reintroduced.

## Two compositor traps, both already removed

The human reported roughly 140 fps testing a sim standalone and roughly 20 fps once
it was on the site. Nothing about hosting can slow a canvas down after load, so the
difference had to be the page around the sim. Two things on the player page were
prime suspects and both are now gone, with "do not re-add" comments in the CSS.

1. **`border-radius` and `box-shadow` on `iframe.sim-frame`.** A rounded clip on a
   cross-document iframe stops the browser handing that frame to the compositor as
   one plain textured quad. It has to mask and re-rasterise the frame surface. On a
   static page you never notice. On a canvas invalidating 60 times a second across
   about 1.8 million CSS pixels, you pay it 60 times a second.
2. **`backdrop-filter: blur(6px)` on the sticky `header.site-header`.** A backdrop
   filter forces a fresh rasterisation of everything behind the element, and behind
   it is the whole document including the animating frame. This is a well known
   foot-gun and is the prime suspect for most of the 7x.

**This diagnosis has never been confirmed on real hardware.** The sandbox runs
headless Chromium with no GPU, so rAF is vsync or software bound at 60 to 85 fps in
every configuration and an A/B tells you nothing. Never claim a performance win from
a number measured in the sandbox.

The A/B that would settle it, on a real machine, at the same window size:
- https://simlearn.ai/sims/boids/index.html (no site chrome at all), press `D`
- https://simlearn.ai/sim.html?id=boids, press `D`

`D` prints fps, sim ms, draw ms, boid count, pixel count and quality level. If
draw ms matches and fps does not, it was the chrome. If both are slow at full screen
but fine in a small window, it is fill rate and the resolution ladder is the answer.

## Fill rate and the resolution ladder

On a retina display a full-bleed 1874x961 field asks for a 3748x1922 backing store,
7.2 megapixels, repainted every frame. Every sim here therefore caps its device
pixel ratio against a **3.2 million device pixel budget**:

```js
const native = Math.min(window.devicePixelRatio || 1, 2);
let d = native;
if (W*H*d*d > 3.2e6) d = Math.max(1, Math.sqrt(3.2e6/(W*H)));
```

Boids goes further and has a runtime quality ladder, contributed by the human and
then extended:

- Their version could drop the blurs, then cut resolution **once**, and never
  recover. A machine that was already at 1x got no relief at all.
- It now steps resolution down repeatably to a `dprCap` floor of 0.55, and
  `upgrade()` climbs back by 1.12x, then restores quality level 0 -> 1 -> 2, after
  about three seconds sustained above 57 fps. `DPR_NATIVE` holds the ceiling.

Boids v3 from the human also adapts the simulation rate itself: it drops 60Hz to
30Hz with a doubled timestep when a step costs more than about 5.5ms.

## Drawing rules the rewritten sims follow

- **Batch fills.** One `beginPath()` covering every agent, then one `fill()`. The
  predator-prey lynx went from six passes per frame to two batched fills for
  exactly this reason.
- **Never stroke per agent.** At 900 agents that is 900 extra path submissions.
- **Taper trails in chunks, not per segment.** A per-segment alpha ramp on a 300
  point trail is 300 strokes per body. Splitting the trail into 12 chunks with one
  alpha and width each gives the same visual taper for 12 strokes.
- **Budget total trail points.** Each sim computes a per-agent trail cap as
  `min(slider value, TOTAL_BUDGET / agent count)`, so turning the agent count up
  does not multiply drawing cost without limit.
- **Drop glow above a count threshold.** Radial gradients are cheap for tens of
  agents and expensive for hundreds. The rewritten sims switch to flat dots above
  6 to 12 agents depending on the sim.
- **Clear rather than fade where trails are drawn explicitly.** A translucent fade
  rect costs the same as a clear and produces uncontrolled trail decay. If you draw
  the trail yourself, clear the frame and the taper is exact.
