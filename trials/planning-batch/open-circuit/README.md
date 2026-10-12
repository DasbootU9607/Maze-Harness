# Open Circuit

An agent-authored planning trial using `mazebench-enclosure-navigation`. Official references inform functional relationships; no source room was transformed into this map.

## Complete goal

Collect the gem at (4,1,0) after recovering the enclosure.

## Stage dependency

Align the six-member body -> traverse from inside its protected cavity -> leave onto the upper bay -> approach its outside face -> recover it leftward -> use the northern rim for the final gem-clearing push.

The opening and protruding member affect both passage clearance and later input access. Parking must be assessed together with the next approach.

| Stage | Conflict | Condition created for the next operation |
| --- | --- | --- |
| Align the full enclosure | The protruding body does not fit the narrow throat in its initial column. | A left translation preserves a reachable cavity and a legal northward push. |
| Park for an external approach | The cavity has no left contact; over-advancing seals the external input against the wall. | The safe bay connects the opening to the external right face. |
| Recover the complete body | Returning the body still leaves a member over the gem. | The north rim reconnects to a final useful side input before collection. |

## Source and changes

Reference rooms: CxB, DxB. Engine: `0ac96b8a2648db09f375989cd7bc33699222c1e6`.

Map-byte SHA256: `dd1cff7d582560e9a87f26600c26ee849bcd103d339f633b62a303d2270f7208`.

- An asymmetric six-member enclosure replaces the five-member source cavity.
- The route changes from protected interior operation to an exterior leftward return.
- A member still covers the gem after recovery, requiring another useful input.

## Evidence and limits

The full witness replays with ordinary official inputs. Ordinary and search transitions are compared along the full witness and any replayed search counterexample. 8 scoped checks and one ordinary positive/negative branch pair passed. A search cap is unknown, never a necessity proof. Final accepted reports have no capped required check.

- Rightward operation before later leftward recovery is necessary under the stated exclusion.
- An extra push destroys the planned input but is recoverable; its saved repair route refutes an exact-parking or unavoidable-dead-end claim.
- The witness uses a final right push; that exact last push is not claimed necessary across all histories.

Difficulty is an **l3 planning structural estimate**, with no human playtests. Input counts, solver time and author self-tests do not establish player difficulty.

## Published sources

- [Complete design and contract](authored-design.json)
- [Complete solution and fingerprints](solution.json)
- [Design brief and lineage](brief.json)
- [Saved map](../../../site/data/maps/authored-enclosure-navigation-dd1cff7d5825-world-map.txt)
- [Online trial](https://dasbootu9607.github.io/Maze-Harness/player.html?world=authored-enclosure-navigation-dd1cff7d5825&room=AxA&case=authored-enclosure-navigation-dd1cff7d5825)

Full working reports and local build outputs remain outside the distributed source tree. Reproduce the acceptance checks with the commands below.

## Reproduction

From the repository root with a separate official engine and fresh output paths:

```text
node scripts/verify-planning-trial.cjs --repo ENGINE --skill enclosure-navigation --spec trials/planning-batch/open-circuit/authored-design.json --out FRESH_REPORT.json
node scripts/build-planning-trial.cjs --repo ENGINE --spec trials/planning-batch/open-circuit/authored-design.json --out FRESH_BUILD
```
