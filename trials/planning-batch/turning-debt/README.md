# Turning Debt

An agent-authored planning trial using `mazebench-clear-ground-turning`. Official references inform functional relationships; no source room was transformed into this map.

## Complete goal

Reach the northern doorway cell (8,0,0).

## Stage dependency

Align the shield -> use the upper clear bay -> preserve the far turning input -> return to the lower junction -> ascend through an earlier lane using the same shield -> leave at the northern doorway.

A previously crossed gate becomes an obstacle again. Overshooting a useful bay loses the only way to change pushing side.

| Stage | Conflict | Condition created for the next operation |
| --- | --- | --- |
| Stage the shield | The northbound input is one cell beyond the broad spawn bay. | Stage at column six so the small southern floor supplies the next face. |
| Redeem the upper turning stance | Continuing north strands the only tool beyond the reachable side. | The two-cell clear bay supplies a rightward input. |
| Preserve the return line | The lower arrival must retain access around the right side. | The shield can return left toward the final junction. |
| Cross the old lane again | The earlier horizontal route is gated again after the shield leaves. | The same block is retained for the northbound crossing and exit. |

## Source and changes

Reference rooms: ExB. Engine: `0ac96b8a2648db09f375989cd7bc33699222c1e6`.

Map-byte SHA256: `3a7a7a80206c5675b4ef6472b05bae5e202d51827a580c599ed1c795c594c0f8`.

- The final route crosses an earlier shield lane instead of following the source rectangle.
- Staggered clear bays create specific future input obligations.
- A stopping wall closes an experimentally found direct northward bypass.

## Evidence and limits

The full witness replays with ordinary official inputs. Ordinary and search transitions are compared along the full witness and any replayed search counterexample. 9 scoped checks and one ordinary positive/negative branch pair passed. A search cap is unknown, never a necessity proof. Final accepted reports have no capped required check.

- The tested turning inputs and north-south-north reuse are necessary for this fixed doorway goal.
- No unique shortest solution or necessity of every individual floor cell is claimed.

Difficulty is an **l3 planning structural estimate**, with no human playtests. Input counts, solver time and author self-tests do not establish player difficulty.

## Published sources

- [Complete design and contract](authored-design.json)
- [Complete solution and fingerprints](solution.json)
- [Design brief and lineage](brief.json)
- [Saved map](../../../site/data/maps/authored-clear-ground-turning-3a7a7a80206c-world-map.txt)
- [Online trial](https://dasbootu9607.github.io/Maze-Harness/player.html?world=authored-clear-ground-turning-3a7a7a80206c&room=AxA&case=authored-clear-ground-turning-3a7a7a80206c)

Full working reports and local build outputs remain outside the distributed source tree. Reproduce the acceptance checks with the commands below.

## Reproduction

From the repository root with a separate official engine and fresh output paths:

```text
node scripts/verify-planning-trial.cjs --repo ENGINE --skill clear-ground-turning --spec trials/planning-batch/turning-debt/authored-design.json --out FRESH_REPORT.json
node scripts/build-planning-trial.cjs --repo ENGINE --spec trials/planning-batch/turning-debt/authored-design.json --out FRESH_BUILD
```
