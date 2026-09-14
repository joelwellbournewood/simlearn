# 00. Vision

## One sentence
A world of small creatures that eat, breed, mutate, and die under pressures you control,
which keeps running when you close the tab and is worth opening again tomorrow.

## The three tests it has to pass
These are the site's own fun test, which came out of two modules being deleted on
2026-09-14 for failing it, and they apply here with more force.

1. **It does something worth watching when left alone for five seconds.** Populations move,
   weather moves, something is always dying somewhere.
2. **You can act on the picture itself,** not only through sliders. Pick a creature up. Draw
   a river. Drop a carcass. Fence off a valley.
3. **There is a failure you can cause and have to fix.** Overfeed the herbivores and the
   plants go, then the herbivores go. That is the story every session has to be able to tell.

## Who it is for
The person who leaves Dwarf Fortress running, who watched the predator and prey page for
twenty minutes, who wants to know what happens if. Not a student working through a
curriculum. The educational content is a reward for curiosity, not an obstacle before play.

## What it is not
- **Not a lesson.** There is no quiz, no score out of ten, no "well done".
- **Not a god game about building.** You shape pressures, you do not place buildings.
- **Not realistic biology.** It is a world with consistent rules that rhyme with biology.
  Anything claimed in words has to be something the rules actually produce.
- **Not multiplayer,** ever, in this design. Persistence plus determinism plus other people
  is a different and much larger project.

## What "done" means for v0.1
A single world, one screen, no menus beyond a panel:
- 10,000 or more organisms at 60 frames per second on a five year old laptop.
- Three trophic levels with a closed nutrient cycle, so nothing appears from nowhere.
- Heritable traits with visible drift: the trait histogram moves during a session.
- One environmental pressure the player controls, and one that arrives on its own.
- Autosave, and a save file you can export and send to somebody.
- A stranger who has never seen it can say what is happening within ten seconds.

## Why it might fail, stated in advance
- **It becomes a screensaver.** Mitigation: the gameplay layer in `08-GAMEPLAY.md` is not
  optional decoration, it is built at M3 and not later.
- **Evolution is too slow to see.** Mitigation: generation times in seconds, mutation rates
  tuned for visible drift within a few minutes, and a time control that goes to 100x.
- **It becomes unreadable.** Mitigation: `07-READABILITY.md` exists before any art does.
- **It eats the site.** Mitigation: milestones are small and each one stands alone. SimLearn
  keeps shipping in parallel, and no site work is blocked on this.
