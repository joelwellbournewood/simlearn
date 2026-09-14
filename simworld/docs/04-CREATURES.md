# 04. Creatures

## Genome

A fixed length array of `float32` genes, forty or so, in a named layout. Fixed length keeps
crossover trivial, keeps the save format stable, and keeps mutation from ever producing a
structurally invalid creature.

| Block | Genes | Range | Notes |
|---|---|---|---|
| Body | size, segments, aspect, colour hue, colour value | bounded | size drives everything downstream |
| Metabolism | basal rate, digestion of plant, digestion of meat, fat capacity | 0 to 1 | plant and meat digestion trade off against each other |
| Senses | scent range, scent acuity, vision cone, vision range | bounded | each has an energy price |
| Movement | thrust, turn rate, stride efficiency, buoyancy | bounded | |
| Life history | maturity age, clutch size, egg investment, lifespan bias | bounded | the r versus K trade off lives here |
| Defence | armour, toxin, camouflage | 0 to 1 | all three cost upkeep |
| Brain | 16 to 24 weights of the small network below | unbounded | |
| Social | herding tendency, aggression, kin recognition | 0 to 1 | |

**Mutation** on reproduction: each gene has an independent chance (default 4 percent) of a
gaussian nudge, plus a rare (0.2 percent) large jump. Rates are themselves genes, so
mutability can evolve, which is a real phenomenon and a free source of interest.

**Reproduction** is asexual at M1 (copy plus mutate) and sexual from M3 (uniform crossover
between two parents that met, plus mutation). Sexual reproduction needs mate finding, which
needs the scent field, which is why it comes second.

**Species labels** are a display convenience, not a mechanism: a cluster in gene space with a
name and a colour, recomputed every few hundred ticks by a cheap online clustering. Creatures
never know their species.

## Body

At M2 a creature is a chain of particles, one per segment, held at fixed distances. Size gene
sets mass and radius, which sets drag, which sets the cost of moving. Everything the player
can see about a body is a consequence of a gene, and the mapping is fixed and published in
`07-READABILITY.md` so that looking at a creature tells you something true about it.

## Brain

The smallest thing that can produce interesting behaviour: a single layer recurrent network,
about eight inputs, four hidden units carried between ticks, four outputs. No learning during
life at M1. The weights are genes, so behaviour evolves with everything else.

- **Inputs:** scent gradient left and right, scent intensity, food scent versus threat scent,
  own energy fraction, own age fraction, terrain slope, a clock oscillator.
- **Outputs:** thrust, turn, bite, breed.

Cost: about 100 multiply adds per creature per tick, one million per tick at ten thousand
creatures, which fits the 2 ms budget in flat arrays with no allocation.

Lifetime learning (a reward modulated weight change) is a candidate for M5 and nothing in the
design depends on it.

## The energy budget

Energy is the currency of the whole world and every rule reduces to it.

```
  dE/dt  =  intake  -  basal  -  movement  -  senses  -  defence  -  growth  -  breeding
```

- **Basal:** `b0 * mass^0.75`, Kleiber's observed scaling of metabolic rate with body mass,
  which is what makes large creatures cheaper per gram and slower to starve. Temperature
  multiplies it.
- **Movement:** `thrust^2 / efficiency`, so sprinting is disproportionately expensive, and
  drag from the terrain medium is in the constant.
- **Senses:** linear in range times acuity. Sensing is never free, which is what stops every
  creature evolving perfect vision.
- **Defence:** armour and toxin charge rent every tick whether or not anything attacks.
- **Growth:** juveniles pay a surcharge until maturity.
- **Breeding:** a lump sum per offspring, taken at laying. If it cannot be paid, no offspring.
- **Death:** at zero energy, or at lifespan, or from being eaten. A corpse returns its mass
  and remaining energy to the nutrient field, on a timer. Nothing vanishes.

Every one of these constants lives in `assets/data/balance.json`, not in the code.

## Diet

There is no herbivore flag. There are two digestion genes, and what a creature can eat
follows from them. A creature that bites a plant with low plant digestion wastes the energy
spent biting. Omnivores are possible and should be bad at both, which is the trade off that
makes the niche interesting rather than dominant.
