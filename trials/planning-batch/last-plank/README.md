# Last Plank

An agent-authored planning trial using `mazebench-bridge-convoy`. Official references inform functional relationships; no source room was transformed into this map.

## Complete goal

Collect the western gem while retaining the blue shield through the final gate.

## Stage dependency

Spend the access plank -> recover the blue and retained floor -> assemble the northbound convoy -> independently translate the floor to form a westbound convoy -> fill the gap floor-first -> reuse blue for the final gate.

One resource is irreversible, both modules must remain operable through a turn, and actor order decides whether the blue survives.

| Stage | Conflict | Condition created for the next operation |
| --- | --- | --- |
| Spend only the access plank | The blue tool is on a separate supported region. | The first consumed plank creates access to the reusable shield. |
| Carry gate access into staging | The reserved floor is behind a reactive boundary and must remain movable. | The blue shield reaches the side of the reserved floor. |
| Assemble a recoverable pair | The two modules need both a contact line and a reachable rear input. | The floor leads a northbound convoy through the only supported gate lane. |
| Re-form the heading | An intact northbound convoy is not a usable westbound push line. | Two independent floor translations preserve support and restore the floor-first order. |
| Spend the retained resource | Sending the blue first loses it in the gap before a floor can help. | Floor consumption creates support, and the surviving blue opens the final gate. |

## Source and changes

Reference rooms: BxE. Engine: `0ac96b8a2648db09f375989cd7bc33699222c1e6`.

Map-byte SHA256: `a38898d626b306a74ec5886072bc953c250b1d0726a164799f9ae5ccc984c95b`.

- Two purposeful bridge resources replace the source multi-chamber allocation network.
- One narrow gate throat makes shared delivery causally necessary.
- A compact turning bay exposes the difference between independent reassembly and a nonexistent object rotation.

## Evidence and limits

The full witness replays with ordinary official inputs. Ordinary and search transitions are compared along the full witness and any replayed search counterexample. 9 scoped checks and one ordinary positive/negative branch pair passed. A search cap is unknown, never a necessity proof. Final accepted reports have no capped required check.

- Both planks, blue motion, actual convoy contact, final floor consumption and the ordered blue reuse pass exhausted exclusions.
- The blue-first loss is demonstrated from ordinary reachable states; no arbitrary actor swapping is used.
- Exact floor positions and every turn translation are not claimed uniquely necessary.

Difficulty is an **l3 planning structural estimate**, with no human playtests. Input counts, solver time and author self-tests do not establish player difficulty.

## Published sources

- [Complete design and contract](authored-design.json)
- [Complete solution and fingerprints](solution.json)
- [Design brief and lineage](brief.json)
- [Saved map](../../../site/data/maps/authored-bridge-convoy-a38898d626b3-world-map.txt)
- [Online trial](https://dasbootu9607.github.io/Maze-Harness/player.html?world=authored-bridge-convoy-a38898d626b3&room=AxA&case=authored-bridge-convoy-a38898d626b3)

Full working reports and local build outputs remain outside the distributed source tree. Reproduce the acceptance checks with the commands below.

## Reproduction

From the repository root with a separate official engine and fresh output paths:

```text
node scripts/verify-planning-trial.cjs --repo ENGINE --skill bridge-convoy --spec trials/planning-batch/last-plank/authored-design.json --out FRESH_REPORT.json
node scripts/build-planning-trial.cjs --repo ENGINE --spec trials/planning-batch/last-plank/authored-design.json --out FRESH_BUILD
```
