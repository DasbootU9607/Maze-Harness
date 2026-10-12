# Return Hook

An agent-authored planning trial using `mazebench-hook-transfer`. Official references inform functional relationships; no source room was transformed into this map.

## Complete goal

Collect the gem in the small chamber at (5,5,0).

## Stage dependency

Move the L left and upward -> dock its offset tip across the void -> lift the target out of its notch -> reach its newly usable side -> shift it right and collect the gem.

The visible working tip solves an input problem that the player cannot solve directly; contact alone still leaves the chamber blocked.

| Stage | Conflict | Condition created for the next operation |
| --- | --- | --- |
| Independent docking | The offset tip starts in a separate lower bay and cannot reach the target from initial walking. | The complete L reaches a supported docking pose above the lower input. |
| Lateral release | The target tail cannot shift sideways between its two walls; a void prevents a direct upward input. | The L lifts the full target from the notch while preserving the route to its new left face. |
| Rebuilt target input | The raised target still seals the gem chamber, and the ceiling prevents a second lift. | A direct right push from the newly useful side frees the chamber approach. |

## Source and changes

Reference rooms: GxE. Engine: `0ac96b8a2648db09f375989cd7bc33699222c1e6`.

Map-byte SHA256: `1bf88985df5b8b05eadcec1c0cdc85b99fd6e15582cf420783e8390c7fd250d4`.

- A three-member lateral L replaces the source rear-contact C.
- A flange blocks downward disposal and a ceiling prevents another upward target shift.
- The remaining task uses a newly reachable target input instead of ending at contact.

## Evidence and limits

The full witness replays with ordinary official inputs. Ordinary and search transitions are compared along the full witness and any replayed search counterexample. 22 scoped checks and one ordinary positive/negative branch pair passed. A search cap is unknown, never a necessity proof. Final accepted reports have no capped required check.

- Tool movement, target movement, lateral transfer, independent preparation and target work after every first-contact history pass exhausted restrictions.
- The tool can be retired after its release; continued motion of that tool is not claimed necessary.
- No global minimality or uniqueness of the L shape is claimed.

Difficulty is an **l3 planning structural estimate**, with no human playtests. Input counts, solver time and author self-tests do not establish player difficulty.

## Published sources

- [Complete design and contract](authored-design.json)
- [Complete solution and fingerprints](solution.json)
- [Design brief and lineage](brief.json)
- [Saved map](../../../site/data/maps/authored-hook-transfer-1bf88985df5b-world-map.txt)
- [Online trial](https://dasbootu9607.github.io/Maze-Harness/player.html?world=authored-hook-transfer-1bf88985df5b&room=AxA&case=authored-hook-transfer-1bf88985df5b)

Full working reports and local build outputs remain outside the distributed source tree. Reproduce the acceptance checks with the commands below.

## Reproduction

From the repository root with a separate official engine and fresh output paths:

```text
node scripts/verify-planning-trial.cjs --repo ENGINE --skill hook-transfer --spec trials/planning-batch/return-hook/authored-design.json --out FRESH_REPORT.json
node skills/mazebench-hook-transfer/scripts/build-complex.cjs --repo ENGINE --spec trials/planning-batch/return-hook/authored-design.json --out FRESH_BUILD
```
