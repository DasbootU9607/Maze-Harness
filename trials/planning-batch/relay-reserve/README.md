# Relay Reserve

An agent-authored planning trial using `mazebench-block-coordination`. Official references inform functional relationships; no source room was transformed into this map.

## Complete goal

Reach the free eastern doorway cell (15,5,0).

## Stage dependency

Prepare M1 -> approach with M0 -> travel around with M1 -> regain the left face of retained M0 -> cross the final gate lane and leave above it.

The second shield must be placed before committing to the first approach; the first shield must remain useful during a long handoff.

| Stage | Conflict | Condition created for the next operation |
| --- | --- | --- |
| Prepare the later handoff | The future working shield is not initially on the handoff row. | The lower clear connector returns the player to the approach shield while M1 waits. |
| Reach the prepared shield | The courier cannot continue north or return along unoccupied gates. | The pre-positioned M1 now offers an actual legal rightward input. |
| Return to the retained courier | M0 must remain at its old elbow while M1 rebuilds its left-side approach. | M0 receives a second role as the final eastbound shield. |
| Leave a usable door slot | The final shield occupies the boundary cell on its own lane. | Clear ground above it supplies the real exit at the next row. |

## Source and changes

Reference rooms: BxB, BxC. Engine: `0ac96b8a2648db09f375989cd7bc33699222c1e6`.

Map-byte SHA256: `ed4fa93087f11ab8a919f04fae82e73bdd497d9cf3f81a61fdcad1c9527d4a82`.

- Two reciprocal handoffs replace the source one-way release.
- A narrow spawn connector prevents freely swapping away the preparation obligation.
- The final exit requires returning to the initial courier from a new side.

## Evidence and limits

The full witness replays with ordinary official inputs. Ordinary and search transitions are compared along the full witness and any replayed search counterexample. 8 scoped checks and one ordinary positive/negative branch pair passed. A search cap is unknown, never a necessity proof. Final accepted reports have no capped required check.

- The listed handoff events and the M0 -> M1 -> M0 reuse are necessary under exhausted exclusions.
- No claim that every movement between handoffs or every turning cell is uniquely required.

Difficulty is an **l3 planning structural estimate**, with no human playtests. Input counts, solver time and author self-tests do not establish player difficulty.

## Published sources

- [Complete design and contract](authored-design.json)
- [Complete solution and fingerprints](solution.json)
- [Design brief and lineage](brief.json)
- [Saved map](../../../site/data/maps/authored-block-coordination-ed4fa93087f1-world-map.txt)
- [Online trial](https://dasbootu9607.github.io/Maze-Harness/player.html?world=authored-block-coordination-ed4fa93087f1&room=AxA&case=authored-block-coordination-ed4fa93087f1)

Full working reports and local build outputs remain outside the distributed source tree. Reproduce the acceptance checks with the commands below.

## Reproduction

From the repository root with a separate official engine and fresh output paths:

```text
node scripts/verify-planning-trial.cjs --repo ENGINE --skill block-coordination --spec trials/planning-batch/relay-reserve/authored-design.json --out FRESH_REPORT.json
node scripts/build-planning-trial.cjs --repo ENGINE --spec trials/planning-batch/relay-reserve/authored-design.json --out FRESH_BUILD
```
