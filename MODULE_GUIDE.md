# SimLearn module architecture

## How it already works (no rewrite needed)
Every simulation is a fully self-contained, independent module:

- `sims/manifest.json` — the catalog. One JSON object per sim: `id`, `title`, `category`, `tags`, `difficulty`, `description`, `status` (`live` | `coming-soon`).
- `sims/<id>/index.html` — the entire simulation: markup, CSS, and JS in one file. No sim imports from another sim and no sim imports from the shell site.
- `sim.html` — the shared shell. Reads `?id=` from the URL, looks it up in the manifest, and loads `sims/<id>/index.html` into a sandboxed `<iframe>`.
- `index.html` (homepage) — reads the manifest and renders the catalog grid/filters. Adding a sim to the site is one manifest entry; nothing else changes.

**Why this matters for iteration:** because each sim is one file loaded in an isolated iframe, you can rewrite, redesign, or completely rebuild any single simulation — swap its physics, add sliders, change its color scheme, add sound — and it is *physically impossible* for that change to break any other sim or the shell site. There is no shared JS runtime, no shared global state, no shared CSS bleed. This is already the "make each sim modular" architecture the charter/message asked for.

## Contract every sim module should follow (for consistency, not enforced by code)
1. Self-contained single `index.html` (inline `<style>` + `<script>`), so it can be dropped into `sims/<id>/` and work standalone if opened directly.
2. Responsive canvas that fills its container (`width: 100%`, resize listener) — the iframe wrapper controls final size.
3. A visible title/short instructions inside the sim itself (redundant with `sim.html`'s header, but makes the sim work if shared/embedded elsewhere).
4. At least one interactive control (slider, click-to-add, preset buttons) — pure "watch and do nothing" sims are the ones most worth upgrading first (see below).
5. No external dependencies (CDNs, fonts, libraries) — keeps every sim loading instantly and working offline; this has been the convention since sim #1 and all 10 current sims honor it.

## Recommended interactivity upgrade pass (one sim at a time, independently, zero risk to others)
Ranked by "most static → most already interactive", based on current implementations:
1. **Lorenz Attractor** — currently a fixed trajectory; add draggable initial-condition point + parameter (σ, ρ, β) sliders.
2. **Double Pendulum** — add click-to-set starting angle, trail-length slider, "release second pendulum for comparison" (sensitivity-to-initial-conditions demo).
3. **Epidemic (SIR)** — add adjustable population size, a "patient zero" click-placement, and a live R₀ readout.
4. **Segregation (Schelling)** — add adjustable tolerance slider per group and a "reset with random seed" button (some exists already — verify and extend).
5. **Game of Life** — add click-to-draw-pattern library (glider, glider gun presets) instead of only random seed.
6. Boids, Predator-Prey, Traffic, Gravity, Reaction-Diffusion already have runtime controls/click-interactions — lower priority, but candidates for "fun" polish (sound, particle trails, color themes) later.

## Process for the human or a future run to request a sim upgrade
Say which sim + what to add. Because of the isolation above, this is always a single-file edit + a `git push` — no coordination with the other 9 sims required, and no risk of a regression elsewhere. A good ask looks like: "make Lorenz Attractor draggable and add sliders for σ/ρ/β" — that's a scoped, one-file, low-cost task.
