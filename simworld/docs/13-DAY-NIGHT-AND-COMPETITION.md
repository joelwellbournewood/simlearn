# 13. The day cycle, and competition as physics

Status: the day cycle is implemented in `src/core/world.js`. Competition is implemented in
its first form and the rest is design. 2026-09-14.

## The day cycle

One value, `light`, between 0 and 1, from the tick count alone, no wall clock. Default day
is 1,800 ticks, which is sixty seconds of real time at 30 Hz. It is deliberately short: a
player should live through several days in a sitting and learn the rhythm.

`light` is the only source of energy entering the world. Nutrient is added to every cell of
the food field in proportion to it, so night is not a filter over the picture, it is the
supply being switched off. Tick zero is dawn, so a world opens in the morning and gets
brighter.

Measured behaviour of the current build, seed 12345, 20,000 starting organisms, three days:

| tick | light | population |
|---|---|---|
| 450 (noon, day 1) | 1.00 | 31,694 |
| 1,350 (midnight) | 0.00 | 6,370 |
| 1,752 (the trough, before dawn of day 2) | 0.03 | 1,972 |
| 2,250 (noon, day 2) | 1.00 | 35,267 |
| 4,048 (the peak, noon of day 3) | 1.00 | 35,523 |

A stable limit cycle, reached in one day and held for three, and it produced itself on the
first run rather than being scripted. It is also **too violent to ship**: losing ninety
five percent of the population every night means the world is a bloom and a crash rather
than an ecosystem, and an individual a player has become attached to will almost never see
a second dawn. The balance work that follows M0 is to damp this, most likely by letting
plant matter bank overnight instead of decaying, and by making resting genuinely cheap. The
number to watch is trough over peak, currently 0.06, and the target is around 0.4.

What else `light` will drive, in the order it is planned:

| System | Effect of darkness | Consequence |
|---|---|---|
| Photosynthesis | growth stops | the whole food economy runs on stored energy overnight |
| Vision radius | shrinks, except for creatures with the night eye trait | hunting gets harder for most, and a niche opens for the few |
| Metabolic rate | falls with temperature | resting is cheaper, so waiting out the night is a viable strategy and the screen visibly slows |
| Scent persistence | rises in still cold air | trails last longer at night, so tracking replaces seeing |
| Bioluminescence | a trait that is only visible at night | it attracts both mates and hunters, which is a cost and a benefit in the same gene |

The intended emergent result, stated as a prediction so it can be wrong: two schedules
appear from one population, day feeders and night feeders, because the same trait set is
priced differently at the two ends of the cycle. If it does not appear, the prices are
wrong and 05-ECOLOGY.md gets the correction rather than the sim getting a scripted nudge.

## Competition is physical, and has no verb

There is no attack button and no combat resolution step. There is one contact solver, and
everything that looks like fighting falls out of it.

Implemented now:
- Two overlapping bodies push apart with a force proportional to overlap, split by mass,
  where mass is the radius squared, which is the same radius that is drawn.
- Damage on contact is **closing speed** times the armament of the one doing the hitting
  times what gets past the armour of the one being hit. Energy taken is energy gained,
  minus a loss, so predation is a transfer and the books balance.
- Because it is closing speed, a hunter that drifts into prey does nothing and one that
  charges takes a lot. Speed, mass, and the angle of approach are the whole tactical
  vocabulary, and they are physics rather than stats.

Planned, all as contact or occupancy rather than as rules:
- **Crowding out.** Bodies occupy space, so a dense patch of feeders physically blocks
  access to the ground they are standing on. Exclusion needs no code of its own.
- **Shoving contests** at a food patch: same solver, no damage, whoever has mass and
  numbers holds the ground.
- **Armour as a real cost.** Armour adds mass, mass costs energy to move, so an arms race
  spirals into a bill instead of running away. This is the brake named in 05-ECOLOGY.md.
- **Ambush.** Sitting still deposits less scent, so a hunter that waits is harder to smell.
  Nothing implements stealth; it is a consequence of the scent field.
- **Scavenging.** A death releases its remaining energy into the nutrient field at that
  spot, so corpses are a place on the map rather than an entity, and the scavenger diet
  class is the one that reads that spike.

The rule that keeps this honest: **no interaction may exist that a player cannot see the
cause of.** If two creatures touch and one loses energy, the closing speed, the spines, and
the outline weight were all on screen a moment before it happened.


## What the night does now, measured

The first build killed 95 per cent of the population every night. Trough over peak inside
one day was 0.06, which is a bloom and a crash rather than a world. It is now **0.46**,
measured on two seeds over eight simulated days, with plant eaters and hunters both still
present at the end of every day (`/root/px/r99/m.mjs`, 1024 square world, 3000 spawned).

Six changes did it, and every one of them is a thing an animal or a plant does.

1. **Plants grow from plants.** Growth is logistic on the standing crop of a cell,
   `g * (crop + seedRain) * (1 - crop / cap)`, so ground grazed to bare earth stays bare
   until something seeds it from next door. This is what makes a grazing front a front,
   and what makes an ungrazed patch worth walking to.
2. **A mouth is only so wide.** Intake is capped at `intakeMax` energy per tick, so the
   first animal to reach a patch cannot swallow it whole. Standing crop survives contact
   with the herd: the pasture now cycles between 0.17 and 1.0 of its daily peak instead of
   being stripped to nothing.
3. **A fed animal coasts.** Eating, chasing, and biting are all scaled by hunger, which
   falls towards a floor as energy approaches satiety. A full herd goes quiet, which is
   why the pasture is still there at dawn.
4. **A hunter runs on sight, and sight runs on the sun.** Chase strength scales with
   `nightVision + (1 - nightVision) * light`, so the dark is a refuge and not an ambush.
5. **Prey run.** A plant eater inside sense range of a hunter is pushed directly away
   from it, on the same eyes and the same sun, scaled by its own limb gene. The chase is
   now an arms race between two genes rather than a capture rate.
6. **A cub costs three times a calf.** Hunters need `hunterBirth` times the birth energy
   and pay `hunterBirth` times the birth cost. Without that one number the hunters boom
   through the herd in a single night and then starve, which is what days 3 and 4 of the
   first long run did.

Left honest: over eight days the population still drifts down from about 15,000 to about
9,000 while cycling, so the equilibrium is not proven flat. A fourteen day run on three
seeds is the next reading.
