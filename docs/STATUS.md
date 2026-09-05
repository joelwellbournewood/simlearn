# Status

Last updated 2026-09-05.

Live at https://simlearn.ai. Eleven sims, all loading with zero JS errors and no
page scroll at 1600x900. Verified with `tools/qa.py 1600 900`.

## The sims

"Standard" means the three rules in `docs/ADDING-A-SIM.md`: a "What am I looking
at?" button at the top opening a modal, preset cards with a bold name plus a
one-line tag, and a "?" tooltip on every control.

| Sim | Standard | State |
|---|---|---|
| Boids | yes | The human's own module, v3. Best thing on the site. Counting-sort spatial hash, adaptive candidate target, adaptive 60/30Hz sim rate, `D` diagnostics panel, 10 presets. |
| Hare & Lynx (predator-prey) | yes | Reworked run 20. Modal explainer, 5 preset cards, 10 tooltips, minimalist lynx dart glyph. Left column overflows by 67px at 1366x768 and 35px at 1280x800 and scrolls internally there; zero overflow at 1600x900 and above. |
| N-Body Gravity | yes | Rewritten run 22. Velocity Verlet with softening and substeps, energy drift readout, 5 presets, mass-coloured bodies with glow, tapered trails, starfield. |
| Double Pendulum | yes | Rewritten run 22. RK4, energy drift under 0.1% over a minute, up to 220 copies released across a stated angular spread, live divergence readout. |
| Lorenz Attractor | yes | Rewritten run 22. RK4, real yaw and pitch rotation with perspective, drag to turn, fixed points marked, presets walking the bifurcation from settling at rho 14 to the periodic window at 100.5. |
| Epidemic (SIR) | partial | v3 content pass done in an earlier run. Has not been through the three-rule standard. |
| Segregation (Schelling) | no | Original build. Works, renders densely, but legacy chrome and no modal or presets. |
| Traffic | no | Original build. Same. |
| Game of Life | no | Original build. Same. |
| Reaction-Diffusion | no | Original build. Visually the strongest of the un-reworked four. |
| Pharmacokinetics | not built | Placeholder card. The human said they have a sim for this and has not sent it yet. `sim.html` shows an "In development" state so nothing 404s. |

## What is left

1. Bring segregation, traffic and game-of-life up to the three-rule standard and
   give them the same CSS block the three rewrites share.
2. Give epidemic the same treatment.
3. Trim 70px off the predator-prey left column so it stops scrolling at 1366x768.
4. Install the pharmacokinetics sim when it arrives.

## Known open questions

- The 140 fps to 20 fps report has a diagnosis and a fix but no confirmation on
  real hardware. See `docs/PERFORMANCE.md` for the exact A/B to run.
- `artifacts/site/` in the project workspace is a stale mirror of the repo, many
  commits behind. Git is the source of truth. The `/work` mount from the sandbox is
  dead, so the mirror cannot currently be refreshed from here.

## Conventions worth not relearning

- Design tokens: Space Grotesk and Space Mono, `--bg #0a1512`, field `#07120f`,
  panel `rgba(15,31,26,.84)`, teal accent `#56e0c2`, coral `#ff7d5c`, gold `#e6c34f`.
- Mobile loads the desktop layout on purpose: `<meta name="viewport" content="width=1200">`.
- Copy style: plain declarative prose. No em dashes, no en dashes, no "not just X
  but Y", no rule-of-three lists used for rhythm.
- Human-supplied sims arrive by drag and drop into the GitHub repo root. That is
  the only reliable channel. When installing one, retheme the **chrome only** and
  never touch per-preset palettes or per-preset background colours, which are
  colour-coded to the meaning of the scene.
