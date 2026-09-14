# 05. Ecology

## The cycle

```
   sun ──> plants ──> herbivores ──> carnivores
            ^  │           │             │
            │  └───────────┴─────────────┘
            │                 corpses and waste
            └──────── nutrient field <───────┘
```

Sunlight is the only input. The nutrient field is the only stock of matter. A plant grows by
taking nutrient where it stands, so a grazed patch stays poor until something dies on it.
That single loop is where every interesting collapse and recovery comes from, and it is the
reason the nutrient field is a field and not a number.

**Plants** are not agents. They are a density value per terrain cell with a logistic growth
rate limited by local nutrient, light (shade from altitude and season), and water. Treating
plants as a field rather than as ten thousand more bodies buys the entire herbivore budget.

## Pressures

Two kinds, and the distinction matters for the gameplay layer.

**Ambient pressures, which arrive on their own:**
- Day and night: heat, and a vision penalty at night, so nocturnal niches can appear.
- Seasons: a slow sine on light and temperature, with a growing season and a lean one.
- Weather: rain events that move nutrient downhill and fill basins, droughts that do not.
- Rare disasters, off by default: a fire that clears vegetation and enriches the soil, a cold
  snap, a red tide in water.

**Player pressures, which arrive because you did something:** see `08-GAMEPLAY.md`. Raise a
mountain, flood a valley, introduce a predator, poison a lake, feed a corner of the map.

Each pressure is a selection event with a visible before and after in the trait charts. That
is the payoff: not "evolution happened" but "this happened, and the population changed in
this specific way, and here is the graph".

## Adversarial evolution

Arms races are the most interesting dynamic available and they only appear if the design
leaves room for them. Three pairs are built in from M3:

| Attack | Defence | The race |
|---|---|---|
| Bite damage and speed | Armour and size | Classic, tends to escalate body size until the energy cost bites back |
| Toxin | Toxin tolerance in digestion | The predator that eats a toxic prey pays, and tolerance evolves |
| Vision and scent acuity | Camouflage and scent masking | Sensing versus hiding, and both cost upkeep |

**The guard against runaway:** every offensive and defensive gene charges energy rent every
tick. An arms race is therefore a spiral into higher costs, and it ends when the cost exceeds
what the environment can pay for, which is exactly how it ends in nature. Red Queen dynamics
appear as oscillation rather than as a winner.

**Cheating to watch for.** Evolution finds bugs. Known failure modes to test for explicitly:
infinite energy loops (eat own offspring, breed, repeat), corpse camping, wall hugging where
the spatial hash is cheap, and immortal non breeders. The conservation readouts in
`03-PHYSICS.md` catch the first class. The others need the event log.

## Invariants, checked every 1,000 ticks

1. Total mass is constant to within 0.1 percent.
2. Population is under the hard cap and above zero, or the world is marked extinct and the
   player is told so with a timeline of what happened.
3. No creature has energy above its fat capacity.
4. Every corpse decays within its timer. No orphan bodies.

A failed invariant halts the world in place, keeps the state, and says which one failed. It
never silently continues, because a simulation that is quietly wrong for an hour has wasted
the hour.

## What the player should be able to learn without being told
- A predator introduced to a naive population crashes it, then crashes itself.
- Productivity sets the number of trophic levels the world can afford.
- Fragmenting a habitat produces divergence, and reconnecting it produces competition.
- Boom and bust is the normal state, and stability is the unusual one.
