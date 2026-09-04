# SimLearn — simlearn.ai

Interactive, educational simulations of complex systems. Static site, no backend,
no build step, no dependencies. Every simulation is one self-contained HTML file.

**Live:** https://simlearn.ai

## Layout

```
index.html            catalogue — cards generated from sims/manifest.json
sim.html              the player: site chrome + full-bleed <iframe> of one sim
about.html
CNAME                 simlearn.ai (GitHub Pages custom domain)
.nojekyll             serve files verbatim, no Jekyll processing
assets/css/style.css  the whole design system (CSS custom properties at the top)
assets/js/main.js     catalogue rendering, filtering, player wiring
sims/manifest.json    the single source of truth for what appears on the site
sims/<id>/index.html  one simulation, self-contained
docs/                 architecture, status, how to add a sim, hosting notes
tools/qa.py           headless-browser QA sweep over every sim
```

## Adding a simulation

1. Drop the file at `sims/<id>/index.html`.
2. Add an entry to `sims/manifest.json` (`id` must equal the folder name).
3. Restyle it to the design system — see `docs/ADDING-A-SIM.md`.
4. Run `python3 tools/qa.py 1600 900` and confirm 0 JS errors and no inner scroll.

Nothing else needs touching. The catalogue and the player read the manifest.

## Running locally

```
python3 -m http.server 8899     # then open http://localhost:8899
```

## Deploying

`git push origin main` → GitHub Pages rebuilds in ~1 min. There is no build step.

## Docs

- `docs/STATUS.md` — what is done, what is in flight, per-simulation state
- `docs/ARCHITECTURE.md` — how the player, manifest and sims fit together
- `docs/ADDING-A-SIM.md` — design tokens + the checklist for making a new sim fit in
- `docs/HOSTING.md` — hosting model, limits, and what happens under a traffic spike
