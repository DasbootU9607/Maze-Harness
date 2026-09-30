# Saved HxH mechanism reconstruction

This is the user's saved reconstruction of the upper mechanism in official HxH. Its two groups correspond to the official staircases, renamed M0 and M1. The approach, lower terrain, and other objects differ from the full official room. It is also distinct from this skill's earlier sealed extraction. Do not present it as the unchanged official level.

## Files and objective

- [world.json](../examples/reconstruction/world.json): portable map to import through official Build.
- [level_AxA.txt](../examples/reconstruction/level_AxA.txt): preserved saved tokens.
- [case.json](../examples/reconstruction/case.json): source fingerprint, collect-gem goal, witness, and exact exclusions.
- [analysis.json](../examples/reconstruction/analysis.json): push runs, solutions, counterexamples, and scope.
- [reference-check.json](../examples/reconstruction/reference-check.json): fresh replay and exclusion results with engine fingerprints.

Coordinates are zero-based `(x,y)` at z=0. Player starts at `(14,4)`; gem at `(1,3)`. Upper M0 occupies `(5,1),(4,2),(5,2),(3,3),(4,3),(3,4)`; lower M1 occupies `(5,3),(6,3),(4,4),(5,4),(3,5),(4,5)`. Their official IDs are M4 and M3 respectively, in `mygl8anih8.txt`.

## Replay and interpretation

| Input | Functional change |
| --- | --- |
| 11 | Upper M0 shifts left, changing the contact relationship |
| 19 | Lower M1 moves up after the player changes pushing position |
| 26 | Player collects the gem |

The witness has 24 walking inputs and two pushing inputs. Separate searches freezing either group, preserving their relative offset, forbidding M0-left, or forbidding M1-up exhaust without the gem. Forbidding M0-right or M1-down still permits a complete route. Those avoidable directions are retained as controls, not turned into requirements.

The local geometry explains a roof-blocked cluster that can be separated by an offset, then a route opened by the other group. The earlier [sealed extraction](examples.md#official-hxh-and-its-sealed-extraction) supplies controlled wall and first-event evidence on its own layout. The new reconstruction's exclusions do not independently prove a unique ordering or global wall minimality.

This is a compact spatial insight, not evidence that a long approach creates deep planning. Use [planning depth](planning-depth.md) to add necessary preparation, stance, or restoration relationships in newly authored challenging rooms.

## Recheck without changing the map

From the skill directory, with an external engine checkout and a fresh output path:

```text
node scripts/check-reconstruction.cjs --repo ENGINE --out NEW_OUTPUT --cap 1000000
```

`--mode replay` only checks the saved witness. The full command replays found routes, reruns seven exclusions or controls, and writes engine fingerprints. Capped searches are unknown. This dedicated checker reads the fingerprinted reference directly; the normal two-group authoring profile rejects its void terrain. It does not expand that profile's supported inputs or build a new authored room. Import the Build JSON to inspect the saved map visually.
