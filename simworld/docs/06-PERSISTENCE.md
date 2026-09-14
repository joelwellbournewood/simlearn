# 06. Persistence and memory

## Three different things called memory

1. **The world keeps running.** Autosave every 30 seconds of wall clock to IndexedDB, and on
   `visibilitychange`. Closing the tab and coming back resumes at the same tick.
2. **Save slots.** Named saves the player makes deliberately, plus an export to a file.
3. **The record.** What happened, kept even when the creatures involved are long dead: the
   lineage tree, the event log, and the trait time series. This is the part that turns a
   session into a story, and it is what Dwarf Fortress gets right.

## Format

A save is a small JSON header plus a binary body, packed into one `.simworld` file (a zip
with two members, so it stays inspectable).

```
header.json   version, world seed, tick, created, modified, scenario id,
              population counts, thumbnail (PNG, 256px), balance table hash
world.bin     magic "SIMW", format version, then length prefixed blocks:
              TERR terrain heights        FLD  nutrient, scent, heat grids
              ORGS organism arrays (SoA, exactly the typed arrays)
              RNG  generator state per substream
              HIST time series, ring buffers
              LINE lineage records
              EVNT event log
```

Sizes, estimated: 10,000 organisms at about 200 bytes each is 2 MB, terrain and fields about
1 MB, history a few hundred KB. Deflate takes the whole thing to roughly 1 MB, which is fine
for IndexedDB and fine to email.

**Migration is mandatory, not optional.** Every format version ships a migration function
from the previous one. A save that cannot be migrated is loaded read only with a clear
message, never silently corrupted. Balance table hashes are stored so that loading an old
save with new tuning numbers warns rather than surprises.

## Deterministic replay

Because the world is a pure function of seed plus commands (`02-ARCHITECTURE.md`), a complete
session is reproducible from a few kilobytes: the seed, the balance hash, and the timestamped
list of player commands. This gives us, nearly free:

- **Bug reports that are worth having.** A player sends a replay, we watch the exact world.
- **A timeline scrubber** for the last few minutes, by replaying from the most recent
  keyframe. Rewinding a simulation is otherwise impossible.
- **Regression tests.** A stored replay plus the expected state hash after 10,000 ticks.
- **Time lapse export**, rendering a replay faster than real time.

Keyframe every 5,000 ticks into a ring buffer, commands in between.

## The lineage record

Every organism gets a 32 bit id and stores its parent ids and birth tick. On death, if the
creature was notable (longest lived, most offspring, first of a new cluster, largest) the
full record is kept; otherwise it is folded into statistics. The tree is walkable in the
inspector: pick a creature, see its ancestors, see when its trait first appeared.

Storage is bounded by keeping at most 5,000 full records in a ring, plus summary statistics
that are never dropped.

## Privacy and storage limits

Everything is local. No account, no server, no telemetry. IndexedDB quota is browser
dependent and can be evicted without warning, so the interface says plainly that a save is
stored in this browser only, and offers the file export next to it.
