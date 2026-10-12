# Borrowed Corner

An agent-authored planning trial using `mazebench-constrained-transport`. Official references inform functional relationships; no source room was transformed into this map.

## Complete goal

Collect the gem at (7,3,0) after usable L-tool delivery and subsequent target work.

## Stage dependency

Retreat the tool downward -> use the released cross-aisle to park the shutter -> recover the tool upward -> dock from the supported side -> transmit lateral contact -> lift and shift the target to expose the gem.

Advancing the tool immediately blocks the helper input. The lower parking bay must preserve extraction, and the delivered tool must leave the target usable.

| Stage | Conflict | Condition created for the next operation |
| --- | --- | --- |
| Borrow the lower bay | Immediate ascent meets the shutter, and the tool blocks access to its right face. | A downward translation opens the cross-aisle while retaining a southern recovery face. |
| Park the shutter | The full horizontal helper spans the two-column ascent. | Three left pushes leave both tool columns clear and keep the lower extraction route reachable. |
| Recover and deliver | The temporary parking is below the starting pose and is not usable delivery. | The same L returns upward through the released throat, retaining the right-side docking input. |
| Offset contact | The player cannot occupy the void beside the target, and direct alternative shifts hit fixed walls. | The L contacts the far member and releases the target from its notch. |
| Open the gem pocket | The displaced bar still blocks the pocket until its lower spur can be pushed from a rebuilt side. | Raise then shift the target; the final left shift opens the complete gem approach. |

## Source and changes

Reference rooms: GxF, GxH. Engine: `0ac96b8a2648db09f375989cd7bc33699222c1e6`.

Map-byte SHA256: `a6eaf6caf2747690c1819423fabe0822efe9435963336334e4c3227f0a5c5b31`.

- One long shutter and an asymmetric L replace the source multi-helper workspace.
- A side corridor makes retreat before shutter movement necessary.
- A second visible void removes a discovered axial-input bypass while preserving supported tool movement.
- Two post-contact target operations preserve a complete final objective.

## Evidence and limits

The full witness replays with ordinary official inputs. Ordinary and search transitions are compared along the full witness and any replayed search counterexample. 36 scoped checks and one ordinary positive/negative branch pair passed. A search cap is unknown, never a necessity proof. Final accepted reports have no capped required check.

- All three groups, lateral transfer, preparation, downward/upward tool motion, ordered retreat-and-recovery, and post-contact target work pass exhausted checks.
- The exact witness, helper parking location and minimal tool silhouette are not proved unique.

Difficulty is an **l3 planning structural estimate**, with no human playtests. Input counts, solver time and author self-tests do not establish player difficulty.

## Published sources

- [Complete design and contract](authored-design.json)
- [Complete solution and fingerprints](solution.json)
- [Design brief and lineage](brief.json)
- [Saved map](../../../site/data/maps/authored-constrained-transport-a6eaf6caf274-world-map.txt)
- [Online trial](https://dasbootu9607.github.io/Maze-Harness/player.html?world=authored-constrained-transport-a6eaf6caf274&room=AxA&case=authored-constrained-transport-a6eaf6caf274)

Full working reports and local build outputs remain outside the distributed source tree. Reproduce the acceptance checks with the commands below.

## Reproduction

From the repository root with a separate official engine and fresh output paths:

```text
node scripts/verify-planning-trial.cjs --repo ENGINE --skill constrained-transport --spec trials/planning-batch/borrowed-corner/authored-design.json --out FRESH_REPORT.json
node skills/mazebench-constrained-transport/scripts/build-complex.cjs --repo ENGINE --spec trials/planning-batch/borrowed-corner/authored-design.json --out FRESH_BUILD
```
