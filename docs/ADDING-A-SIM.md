# Adding a simulation (and making it look like it belongs)

A simulation is **one self-contained `sims/<id>/index.html`**: its own `<style>`,
its own `<script>`, no imports from the site. That is deliberate — a sim can be
developed and opened standalone, and it can never break the rest of the site.

## 1. Files

- `sims/<id>/index.html` — the sim.
- Optionally `sims/<id>/*.js` if it is large enough to warrant splitting.
- Add to `sims/manifest.json`:

```json
{ "id": "<folder-name>", "title": "...", "category": "Physics",
  "tags": ["..."], "difficulty": "Beginner|Intermediate|Advanced",
  "description": "One sentence, no marketing.", "status": "live" }
```

`status: "coming-soon"` makes the card show an *In development* panel instead of a 404.

## 2. Design tokens — paste these into the sim's `<style>`

```css
--bg:#0a1512;  --field:#07120f;  --panel:#0f1f1a;  --panel-2:#13261f;
--line:rgba(130,170,150,.14);    --line-strong:rgba(130,170,150,.28);
--ink:#e3efe9; --muted:#88a397;
--accent:#56e0c2;   /* teal  — primary / "prey" / positive series */
--accent-2:#ff7d5c; /* coral — secondary / "predator" / warning series */
--grass:#34905c;
--radius:14px;
```

Fonts: **Space Grotesk** for headings/UI, **Space Mono** for numbers and labels,
system sans for body copy. Canvas background is `--field` (`#07120f`), never black.

Conventions that keep sims recognisably one family:
- Buttons: pill, 1px `--line-strong` border; the active one filled `--accent` on dark text.
- Sliders: label left, live value right in Space Mono, `--muted`.
- Counters: big Space Mono number, small uppercase label above.
- Graphs: 2px line, ~10% alpha fill underneath, faint gridlines at `rgba(130,170,150,.10)`.

## 3. Layout rules (this is what actually breaks)

The sim runs inside a full-bleed iframe sized to the visitor's window. So:

- **Everything must fit with no scrolling** at 1280×800 and up. Test it.
- Size off `height:100%` chains, not fixed pixels. If a canvas needs to grow, every
  ancestor needs a resolved height (`align-items:stretch`, `height:100%`) or the
  percentage silently collapses.
- Use `max-height` media queries to tighten spacing / drop explanatory text on short
  windows rather than letting a control column scroll.
- Set the canvas backing store to at least 2× CSS pixels (`devicePixelRatio` clamped
  to 2–3) or big canvases look soft.
- Add this so the sim hides its own `<h1>`/footer when embedded in the player:

```html
<script>if(self!==top)document.documentElement.className+=' in-frame';</script>
```
…and `.in-frame .sim-title,.in-frame footer{display:none}`.

## 4. Verify

```
python3 -m http.server 8899 &
python3 tools/qa.py 1600 900
```

Requires: 0 JS errors, no inner scrollbars, non-trivial canvas ink coverage.

## The shared shell (added 2026-09-05)

`sims/gravity/index.html`, `sims/double-pendulum/index.html` and
`sims/lorenz/index.html` share a byte-identical `<head>` CSS block apart from the
title and meta description. Copy that block when writing a new sim rather than
starting from the old two-column layout, which is deprecated. It gives you, for
free: the tokens, the full-bleed stage with vignette, the floating glass panel, the
`.about-btn` and `dialog.about`, `.preset` cards, the `.tip` bubble, restyled
range inputs, the `.hud` stat chips, `body.clean` for hide-UI, and the
`body.in-frame` rules that hide the brand line and lift the panel when the sim is
loaded inside `sim.html`.

The matching script skeleton is also worth copying: DPR capped to a 3.2M device
pixel budget in `resize()`, a `PRESETS` object whose keys drive both the cards and
the 1-9 number keys, `bind(id, valueId, formatter, setter)` for sliders, and the
space / R / H / F key handlers.
