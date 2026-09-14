# 12. The visual language

Status: design, 2026-09-14. Extends 07-READABILITY.md, which set the principle. This sets
the grammar, the palette system, and how a creature is actually built out of parts.

## Two laws

**Law 1. Nothing is drawn that is not simulated.** If it is on the screen, some number in
the world decides it, and changing that number changes the picture. No ambient particles,
no decorative grass, no vignette that means nothing, no glow for the sake of a glow. The
test for any new visual: name the array index it reads. If there is not one, it does not
ship.

**Law 2. A channel means one thing, for the life of the project.** Hue never means diet in
one place and temperature in another. The table below is the contract. Adding a channel is
a decision that goes in 10-DECISIONS.md; repurposing one is close to forbidden, because
players learn this grammar in the first two minutes and never consciously revisit it.

## The channel table

| Visual channel | Reads | Range and rule |
|---|---|---|
| Hue band | diet class | plant eater 90 to 160 deg, hunter 340 to 30 deg, scavenger 35 to 60 deg, filter feeder 170 to 210 deg |
| Hue within band | lineage | inherited with a small mutation, so a clade is a colour family and speciation is visible as the band splitting into clumps |
| Saturation | energy as a fraction of what this body can hold | full at 100%, grey at zero, so a starving creature visibly drains |
| Brightness | age against expected lifespan | young are bright, old are dim, no other meaning |
| Radius | mass | the same number the physics uses for momentum, never a display scale |
| Outline weight | armour | a thin line is soft, a heavy line survives a hit |
| Spines drawn on the rim | armament | count is the gene, length is its current value |
| Limb count and beat rate | thrust gene and current effort | a creature sprinting beats faster, and beating costs the energy you can see draining |
| Core pulse rate | metabolic rate | slows at night with the temperature, so the whole screen breathes slower after dusk |
| Halo | carrying enough energy to divide | appears at the birth threshold and nowhere else |
| Trail | scent deposited into the field | literally a readout of the scent array, so trails are what hunters are following |
| Tilt | heading | velocity direction, no smoothing that would lie about it |
| Ground colour | nutrient field | the ground you walk on is the food supply, rendered directly |
| Haze | scent field | faint, additive, the thing that makes a busy corridor look busy |
| Sky tint and ambient | light level | the day cycle, see 13 |

Colour blindness: hue carries diet, which is the single most important fact on screen, so
every diet class also has a distinct silhouette (round, spiked, lobed, finned) and the
palettes ship with a second set of hue bands that keep their distance under deuteranopia.
Shape is the redundant channel, always.

## Where the colour variety comes from

Three sources, none of which is an artist painting variants.

1. **Lineage drift inside a hue band.** Every birth mutates hue by a small bounded amount.
   After a few hundred generations one starting green has become a dozen distinguishable
   greens, and they are the family tree. This is where most of the variety lives, and it is
   earned rather than decorated: two creatures that look alike are related.
2. **Day and night grading.** One global light value drives an ambient multiply and a
   warm-to-cool shift, so the same creature reads differently at noon, at dusk, and under
   its own bioluminescence at 3 am. One number, and the whole palette moves.
3. **Biome tinting of the ground.** The nutrient field is drawn through a ramp that belongs
   to the biome, so the same simulation looks like marsh, scrub, or reef depending on the
   ramp, and the ramps live in `assets/palettes/` as data.

## Modular creatures, rendered dynamically

A creature is not a sprite an artist drew. It is a **part list assembled from the genome**:

    core shape (4 silhouettes, from diet class)
      + limb ring   (0 to 8, from the thrust gene)
      + spine ring  (0 to 12, from the armament gene)
      + shell arc   (0 to 1, thickness from the armour gene)
      + eye count   (from the vision gene, which sets sense radius)

Naive procedural drawing per creature per frame is too expensive on a CPU and too branchy
in a shader, so the plan is a **morphotype atlas built at run time**:

- Quantise the genome into a **morphotype key**: diet class, limb count, spine count,
  armour bucket, and eye count. That is a few thousand possible keys and in practice a few
  dozen live at once.
- The first time a key appears, draw it once into a free cell of an offscreen atlas
  texture, in white on transparent, as flat shapes. Cache it. Evict by least recently used
  when the atlas fills. Expected cost is a handful of small draws a second during a
  radiation event and nothing at all in a stable ecosystem.
- Every creature is then **one instanced quad**: atlas cell, position, angle, size, tint,
  saturation, brightness, and a per creature phase for the limb beat. The instance buffer
  is the eight floats measured in 11-PERFORMANCE.md at 0.6 ms for 100,000.
- The limb beat, the core pulse, the halo, and the damage flash are **shader side**, driven
  by phase and by values already in the instance buffer, so they cost nothing per creature
  on the CPU.

That is what "modular and dynamically rendered" has to mean here: parts, combined by
genetics, baked once per distinct body, tinted per individual, animated in the shader.

## Three zoom modes, one continuous camera

| Zoom | What is drawn | Why |
|---|---|---|
| Close, under about 3,000 on screen | individual creatures, full grammar, trails | this is where the visual language is read |
| Middle | creatures as tinted discs, no parts, trails off | keeps a crowd legible as a crowd |
| Far | no individuals at all: the nutrient field, and population as a density map coloured by the same hue bands | a continent of ecology at a glance, and it is cheap, because it is two textures |

The crossovers are fades over about half a second, in both directions, so it never snaps.
The far view is the one that makes a 50,000 organism world worth having, since the close
view can only ever hold a few thousand.

## What is deliberately not on screen

Numbers. No damage numbers, no floating labels, no health bars. Every quantity in the table
above is carried by the creature's own appearance, and the panel is for the things a body
cannot show, which is history: population over time, lineage, energy in the whole system.
The one exception is inspection, where clicking a creature opens a readout of its genome,
because that is the player asking a direct question.


## Bound in the renderer as of 2026-09-14

Hue is now a real gene carried per animal (`world.hue`), drifting by up to `hueDrift` at each
birth inside the band its diet owns, saved in the file, and read straight into the instance
buffer. Saturation is energy over satiety, brightness falls by a third across a life, the
limb gene sets how many lobes a body has and how far they swing, the armament gene sets how
many spines it carries and how far they stand out, and outline weight is armour. Eleven
floats per animal go to the GPU each frame. The rest of the table in this document is still
waiting on the morphotype atlas.
