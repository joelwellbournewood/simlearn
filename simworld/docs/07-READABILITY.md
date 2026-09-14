# 07. Readability

The rule from Mote, adopted wholesale: **every visual element carries information.** No
decoration, no particles for the sake of particles, no colour that means nothing.

## The ten second test
A stranger opens the world and within ten seconds can answer: what is alive here, what is
eating what, and is it doing well or badly. Anyone can run this test on anyone. It is the
acceptance criterion for every rendering change.

## The fixed mapping

| Channel | Meaning | Notes |
|---|---|---|
| **Hue** | diet: green plant eater, red meat eater, amber omnivore | The one mapping that never changes for any reason |
| **Saturation** | health, meaning energy as a fraction of capacity | A starving creature is grey. Pale means dying |
| **Size on screen** | body mass | True at every zoom, never adjusted for visibility |
| **Ring around body** | pregnancy or egg carrying | Thickness is investment |
| **Outline** | selected, or a member of the tracked lineage | |
| **Motion blur, subtle** | speed relative to its own maximum | The cheapest way to show effort |
| **Ground tint** | nutrient density | Rich soil is visibly dark |
| **Overlay, optional** | one field at a time: scent, heat, nutrient, water | Off by default, keyboard 1 to 4 |

Species colours are hue variations inside the diet band, never across it, so a new species
never reads as a different trophic level.

## The panel

Same house style as the site: one glass panel, hairlines only, Space Grotesk headings, mono
readouts, "What am I looking at?" at the top opening a dialog, tooltips as `.tip` bubbles,
presets as cards. That style is already tested on phones and on nine modules, and reusing it
means SimWorld looks like it belongs to SimLearn without any new design work.

Sections: World (time, speed, pressures), Life (populations, the food web), Look (overlays,
palette), Tools (the player's hands, see `08-GAMEPLAY.md`).

## The three readouts that are always visible
1. **Population**, one line per trophic level, stacked over the last few minutes.
2. **The clock**: day, season, and the speed multiplier.
3. **The event ticker**, one line at a time in plain language: "the western herd starved",
   "a new hunter appeared, faster than its parents". This is the single feature most likely
   to make somebody stay, and it costs almost nothing beyond writing the sentences.

## The inspector
Click any creature: its genes as a small bar chart against the population average, its
energy, its age, its parents, its offspring count, its current intention from the brain
outputs. Pin it and the camera follows. This is where a world becomes specific rather than a
pattern of dots.

## Charts
Population over time, one trait histogram with a chosen gene, and a phase plot of predator
against prey, which is already familiar from the site's predator and prey module. All three
read from the history ring buffers, not from live state, so they survive time travel.

## Accessibility and honesty
- Diet is also a shape, not only a hue, so colour vision deficiency does not hide the food web.
- Reduced motion setting removes blur and screen shake, keeps everything informative.
- Nothing in the interface claims an outcome the rules do not produce. If the event ticker
  says a species went extinct, it went extinct.
